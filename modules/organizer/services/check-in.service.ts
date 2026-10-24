import { and, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import {
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  tickets,
  venueZones,
} from "@/lib/db/schema";
import {
  listEventsForViewer,
  resolveEventScope,
  type EventScope,
  type EventViewer,
  type ViewerEvent,
} from "@/modules/events/services/list-events-for-viewer.service";
import { checkInCodeSchema } from "@/modules/organizer/schemas/check-in.schema";

export class CheckInError extends Error {}

const NOT_ALLOWED = "No puedes validar entradas";
const EVENT_NOT_FOUND = "Evento no encontrado";
const UNEXPECTED = "No se pudo validar la entrada. Inténtalo de nuevo";

export type CheckInActor = EventViewer;
export type CheckInStats = { sold: number; entered: number };
export type CheckInEvent = ViewerEvent & CheckInStats;
export type CheckInResult =
  | { status: "admitted"; checkedInAt: string; zoneName: string; functionStartsAt: string }
  | { status: "already_used"; checkedInAt: string; zoneName: string }
  | { status: "wrong_event"; ticketEventTitle: string }
  | { status: "foreign" }
  | { status: "unpaid" }
  | { status: "event_unavailable" }
  | { status: "not_found" }
  | { status: "invalid" };
export type CheckInOutcome = { result: CheckInResult; stats: CheckInStats };

type Scope = Exclude<EventScope, { kind: "public" }>;

function requireScope(actor: CheckInActor): Scope {
  const scope = resolveEventScope(actor);
  if (scope.kind === "public") throw new CheckInError(NOT_ALLOWED);
  return scope;
}

// Same event id for organizer-out-of-scope and missing: the caller cannot tell them apart.
async function requireEvent(db: Db, scope: Scope, eventId: string) {
  const [event] = await db
    .select({ id: events.id, status: events.status, organizerId: events.organizerId })
    .from(events)
    .where(
      and(eq(events.id, eventId), scope.kind === "own" ? eq(events.organizerId, scope.organizerId) : undefined),
    );
  if (!event) throw new CheckInError(EVENT_NOT_FOUND);
  return event;
}

async function loadStats(db: Db, eventIds: string[]): Promise<Map<string, CheckInStats>> {
  if (eventIds.length === 0) return new Map();
  const rows = await db
    .select({
      eventId: eventFunctions.eventId,
      sold: sql<number>`count(*)::int`,
      entered: sql<number>`(count(*) filter (where ${tickets.status} = 'used'))::int`,
    })
    .from(tickets)
    .innerJoin(orderItems, eq(tickets.orderItemId, orderItems.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(functionZones, eq(orderItems.functionZoneId, functionZones.id))
    .innerJoin(eventFunctions, eq(functionZones.functionId, eventFunctions.id))
    .where(and(inArray(eventFunctions.eventId, eventIds), eq(orders.status, "paid")))
    .groupBy(eventFunctions.eventId);
  return new Map(rows.map((row) => [row.eventId, { sold: row.sold, entered: row.entered }]));
}

const EMPTY_STATS: CheckInStats = { sold: 0, entered: 0 };

export async function listCheckInEvents(db: Db, actor: CheckInActor): Promise<CheckInEvent[]> {
  requireScope(actor);
  const list = await listEventsForViewer(db, actor, { status: "published" });
  const stats = await loadStats(db, list.map((event) => event.id));
  return list.map((event) => ({ ...event, ...(stats.get(event.id) ?? EMPTY_STATS) }));
}

export async function getCheckInStats(db: Db, actor: CheckInActor, eventId: string): Promise<CheckInStats> {
  await requireEvent(db, requireScope(actor), eventId);
  return (await loadStats(db, [eventId])).get(eventId) ?? EMPTY_STATS;
}

export async function checkInTicket(
  db: Db,
  actor: CheckInActor,
  input: { eventId: string; code: string },
): Promise<CheckInOutcome> {
  const scope = requireScope(actor);
  await requireEvent(db, scope, input.eventId);
  const withStats = async (result: CheckInResult): Promise<CheckInOutcome> => ({
    result,
    stats: (await loadStats(db, [input.eventId])).get(input.eventId) ?? EMPTY_STATS,
  });

  const parsed = checkInCodeSchema.safeParse(input.code);
  if (!parsed.success) return withStats({ status: "invalid" });
  const code = parsed.data;

  // Single atomic UPDATE: only one concurrent caller can flip valid -> used.
  const orderItemIds = db
    .select({ id: orderItems.id })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(functionZones, eq(orderItems.functionZoneId, functionZones.id))
    .innerJoin(eventFunctions, eq(functionZones.functionId, eventFunctions.id))
    .innerJoin(events, eq(eventFunctions.eventId, events.id))
    .where(
      and(
        eq(events.id, input.eventId),
        eq(events.status, "published"),
        eq(orders.status, "paid"),
        scope.kind === "own" ? eq(events.organizerId, scope.organizerId) : undefined,
      ),
    );

  const [admitted] = await db
    .update(tickets)
    .set({ status: "used", checkedInAt: sql`now()` })
    .where(and(eq(tickets.qrCode, code), eq(tickets.status, "valid"), inArray(tickets.orderItemId, orderItemIds)))
    .returning(); // full row: the Db union type rejects a partial returning() on update

  if (admitted?.checkedInAt) {
    const [info] = await db
      .select({ zoneName: venueZones.name, startsAt: eventFunctions.startsAt })
      .from(orderItems)
      .innerJoin(functionZones, eq(orderItems.functionZoneId, functionZones.id))
      .innerJoin(venueZones, eq(functionZones.venueZoneId, venueZones.id))
      .innerJoin(eventFunctions, eq(functionZones.functionId, eventFunctions.id))
      .where(eq(orderItems.id, admitted.orderItemId));
    return withStats({
      status: "admitted",
      checkedInAt: admitted.checkedInAt.toISOString(),
      zoneName: info.zoneName,
      functionStartsAt: info.startsAt.toISOString(),
    });
  }

  return withStats(await diagnose(db, scope, input.eventId, code));
}

// Read-only, runs after a failed UPDATE. Safe because `used` is a final state.
async function diagnose(db: Db, scope: Scope, selectedEventId: string, code: string): Promise<CheckInResult> {
  const [ticket] = await db
    .select({
      status: tickets.status,
      checkedInAt: tickets.checkedInAt,
      zoneName: venueZones.name,
      orderStatus: orders.status,
      eventId: events.id,
      eventTitle: events.title,
      eventStatus: events.status,
      organizerId: events.organizerId,
    })
    .from(tickets)
    .innerJoin(orderItems, eq(tickets.orderItemId, orderItems.id))
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(functionZones, eq(orderItems.functionZoneId, functionZones.id))
    .innerJoin(venueZones, eq(functionZones.venueZoneId, venueZones.id))
    .innerJoin(eventFunctions, eq(functionZones.functionId, eventFunctions.id))
    .innerJoin(events, eq(eventFunctions.eventId, events.id))
    .where(eq(tickets.qrCode, code));

  if (!ticket) return { status: "not_found" };
  if (scope.kind === "own" && ticket.organizerId !== scope.organizerId) return { status: "foreign" };
  if (ticket.eventId !== selectedEventId) return { status: "wrong_event", ticketEventTitle: ticket.eventTitle };
  if (ticket.status === "used" && ticket.checkedInAt) {
    return { status: "already_used", checkedInAt: ticket.checkedInAt.toISOString(), zoneName: ticket.zoneName };
  }
  if (ticket.orderStatus !== "paid") return { status: "unpaid" };
  if (ticket.eventStatus !== "published") return { status: "event_unavailable" };
  throw new CheckInError(UNEXPECTED);
}
