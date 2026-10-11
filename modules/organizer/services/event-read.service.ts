import { asc, eq, inArray } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type { Db } from "@/lib/db/client";
import type * as schema from "@/lib/db/schema";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItems,
  venues,
  venueZones,
} from "@/lib/db/schema";
import type { CreateEventFormValues } from "@/modules/organizer/schemas/create-event.schema";
import { canWriteEvent, type EventActor, type EventStatus } from "@/modules/organizer/utils/event-permissions";
import { formatLimaDateTime } from "@/modules/organizer/utils/lima-time";

// A pool-backed db or a transaction of it.
export type Tx = PgDatabase<PgQueryResultHKT, typeof schema>;

export type StructureLock = { hasOrders: boolean; functionCount: number; locked: boolean };

// Structure (venue, function, zones, prices, capacity) is frozen once any order
// references the event's zones, or when the event has several functions (the
// wizard only edits one).
export async function getStructureLock(db: Db | Tx, eventId: string): Promise<StructureLock> {
  const functions = await db
    .select({ id: eventFunctions.id })
    .from(eventFunctions)
    .where(eq(eventFunctions.eventId, eventId));
  const functionIds = functions.map((fn) => fn.id);

  let hasOrders = false;
  if (functionIds.length > 0) {
    const [row] = await db
      .select({ id: orderItems.id })
      .from(orderItems)
      .innerJoin(functionZones, eq(orderItems.functionZoneId, functionZones.id))
      .where(inArray(functionZones.functionId, functionIds))
      .limit(1);
    hasOrders = Boolean(row);
  }
  return { hasOrders, functionCount: functions.length, locked: hasOrders || functions.length > 1 };
}

export function listCategories(db: Db) {
  return db
    .select({ id: eventCategories.id, name: eventCategories.name })
    .from(eventCategories)
    .orderBy(asc(eventCategories.name));
}

export function listVenuesForOrganizer(db: Db, organizerId: string) {
  return db
    .select({ id: venues.id, name: venues.name, city: venues.city })
    .from(venues)
    .where(eq(venues.organizerId, organizerId))
    .orderBy(asc(venues.name));
}

export type EventForEdit = {
  id: string;
  organizerId: string;
  status: EventStatus;
  structureLocked: boolean;
  values: CreateEventFormValues;
};

// Null when missing or when the actor may not edit it: callers cannot tell the two apart.
export async function getEventForEdit(
  db: Db,
  actor: EventActor,
  eventId: string,
): Promise<EventForEdit | null> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event || !canWriteEvent(actor, event, "edit")) return null;

  const lock = await getStructureLock(db, event.id);
  const [fn] = await db
    .select()
    .from(eventFunctions)
    .where(eq(eventFunctions.eventId, event.id))
    .orderBy(asc(eventFunctions.startsAt))
    .limit(1);
  const zones = fn
    ? await db
        .select({
          name: venueZones.name,
          capacity: functionZones.capacity,
          price: functionZones.price,
        })
        .from(functionZones)
        .innerJoin(venueZones, eq(functionZones.venueZoneId, venueZones.id))
        .where(eq(functionZones.functionId, fn.id))
        .orderBy(asc(venueZones.name))
    : [];

  return {
    id: event.id,
    organizerId: event.organizerId,
    status: event.status,
    structureLocked: lock.locked,
    values: {
      details: {
        title: event.title,
        description: event.description,
        categoryId: event.categoryId,
        imageUrl: event.imageUrl,
        doorsOpenTime: event.doorsOpenTime,
        showStartTime: event.showStartTime,
        minimumAge: event.minimumAge,
        admissionType: event.admissionType,
      },
      venue: { mode: "existing", venueId: event.venueId },
      functionZones: {
        startsAt: fn ? formatLimaDateTime(fn.startsAt) : "",
        zones: zones.map((zone) => ({ ...zone, price: Number(zone.price) })),
      },
    },
  };
}
