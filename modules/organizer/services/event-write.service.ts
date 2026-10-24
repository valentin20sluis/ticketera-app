import { and, eq, gt, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db/client";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  users,
  venues,
  venueZones,
} from "@/lib/db/schema";
import {
  createEventFormSchema,
  type CreateEventFormValues,
} from "@/modules/organizer/schemas/create-event.schema";
import { getStructureLock, type Tx } from "@/modules/organizer/services/event-read.service";
import { canAcceptPayments } from "@/modules/payments/utils/can-accept-payments";
import {
  canWriteEvent,
  isEventAdmin,
  nextStatuses,
  type EventActor,
  type EventStatus,
} from "@/modules/organizer/utils/event-permissions";
import { buildUniqueSlug } from "@/modules/organizer/utils/event-slug";
import { parseLimaDateTime } from "@/modules/organizer/utils/lima-time";
import { DEFAULT_SEAT_CAPACITY, DEFAULT_SEAT_LAYOUT } from "@/modules/ticketing/types/seat.types";
import { buildStackedZoneShape } from "@/modules/organizer/utils/zone-shape";

// Only these messages are safe to show to the user; any other error stays generic.
export class EventActionError extends Error {}

const INVALID = "Datos no válidos";
const NOT_FOUND = "Evento no encontrado";
const STALE = "El evento cambió mientras lo editabas. Recarga e inténtalo de nuevo";
const NOT_ALLOWED = "No puedes modificar este evento";
const STRIPE_REQUIRED_OWN = "Conecta tu cuenta de Stripe para publicar eventos";
const STRIPE_REQUIRED_OWNER = "El organizador de este evento aún no conectó su cuenta de Stripe";
const DEFAULT_CURRENCY = "PEN";


function parseInput(input: unknown): CreateEventFormValues {
  const parsed = createEventFormSchema.safeParse(input);
  if (!parsed.success) throw new EventActionError(INVALID);
  return parsed.data;
}

function parseStartsAt(value: string): Date {
  const date = parseLimaDateTime(value);
  if (!date) throw new EventActionError("Ingresa una fecha y hora válidas");
  return date;
}

async function loadEvent(db: Db | Tx, eventId: string) {
  if (!z.uuid().safeParse(eventId).success) throw new EventActionError(NOT_FOUND);
  const [event] = await db.select().from(events).where(eq(events.id, eventId));
  if (!event) throw new EventActionError(NOT_FOUND);
  return event;
}

// Returns the venue id, creating the venue when the form asks for a new one.
// An existing venue must belong to the event's owner, not to the actor.
async function resolveVenue(tx: Tx, ownerId: string, venue: CreateEventFormValues["venue"]) {
  if (venue.mode === "new") {
    const [created] = await tx
      .insert(venues)
      .values({ organizerId: ownerId, ...venue.venue })
      .returning({ id: venues.id });
    return created.id;
  }
  if (!z.uuid().safeParse(venue.venueId).success) throw new EventActionError("Venue no válido");
  const [found] = await tx
    .select({ id: venues.id })
    .from(venues)
    .where(and(eq(venues.id, venue.venueId), eq(venues.organizerId, ownerId)));
  if (!found) throw new EventActionError("Venue no válido");
  return found.id;
}

type FunctionValues = CreateEventFormValues["functions"][number];

async function insertFunction(tx: Tx, eventId: string, venueId: string, fn: FunctionValues) {
  const startsAt = parseStartsAt(fn.startsAt);
  const zones = fn.zones;
  const [created] = await tx
    .insert(eventFunctions)
    .values({ eventId, startsAt })
    .returning({ id: eventFunctions.id });
  const createdZones = await tx
    .insert(venueZones)
    .values(
      zones.map((zone, index) => {
        const shape = buildStackedZoneShape(index, zones.length);
        return {
          venueId,
          name: zone.name,
          shapeX: shape.x,
          shapeY: shape.y,
          shapeWidth: shape.width,
          shapeHeight: shape.height,
          capacity: DEFAULT_SEAT_CAPACITY,
          seatRows: DEFAULT_SEAT_LAYOUT.rows,
          seatColumns: DEFAULT_SEAT_LAYOUT.columns,
        };
      }),
    )
    .returning({ id: venueZones.id });
  await tx.insert(functionZones).values(
    zones.map((zone, index) => ({
      functionId: created.id,
      venueZoneId: createdZones[index].id,
      price: zone.price.toFixed(2),
      currency: DEFAULT_CURRENCY,
      capacity: DEFAULT_SEAT_CAPACITY,
    })),
  );
}

// Removes functions and their zones, plus venue zones nothing else references.
async function deleteStructure(tx: Tx, eventId: string) {
  const functions = await tx
    .select({ id: eventFunctions.id })
    .from(eventFunctions)
    .where(eq(eventFunctions.eventId, eventId));
  if (functions.length === 0) return;
  const functionIds = functions.map((fn) => fn.id);

  const removed = await tx
    .delete(functionZones)
    .where(inArray(functionZones.functionId, functionIds))
    .returning({ venueZoneId: functionZones.venueZoneId });
  await tx.delete(eventFunctions).where(inArray(eventFunctions.id, functionIds));

  const candidateIds = removed.map((row) => row.venueZoneId);
  if (candidateIds.length === 0) return;
  const stillUsed = await tx
    .select({ id: functionZones.venueZoneId })
    .from(functionZones)
    .where(inArray(functionZones.venueZoneId, candidateIds));
  const orphanIds = candidateIds.filter((id) => !stillUsed.some((row) => row.id === id));
  if (orphanIds.length > 0) await tx.delete(venueZones).where(inArray(venueZones.id, orphanIds));
}

function detailsOf(form: CreateEventFormValues) {
  const {
    title,
    description,
    categoryId,
    imageUrl,
    doorsOpenTime,
    showStartTime,
    minimumAge,
    admissionType,
  } = form.details;
  return { title, description, categoryId, imageUrl, doorsOpenTime, showStartTime, minimumAge, admissionType };
}

async function assertCategory(db: Db | Tx, categoryId: string) {
  if (!z.uuid().safeParse(categoryId).success) throw new EventActionError("Categoría no válida");
  const [found] = await db
    .select({ id: eventCategories.id })
    .from(eventCategories)
    .where(eq(eventCategories.id, categoryId));
  if (!found) throw new EventActionError("Categoría no válida");
}

// ownerId is honoured only for admins, who must name an active organizer; an organizer always creates for themselves.
export async function createEvent(
  db: Db,
  actor: EventActor,
  input: unknown,
  ownerId?: string,
): Promise<{ id: string }> {
  const form = parseInput(input);
  const asAdmin = isEventAdmin(actor);
  if (asAdmin && !ownerId) throw new EventActionError("Elige un organizador");
  const owner = asAdmin ? ownerId : actor?.id;
  if (!owner || !canWriteEvent(actor, { organizerId: owner, status: "draft" }, "edit")) {
    throw new EventActionError(NOT_ALLOWED);
  }
  if (owner !== actor?.id) {
    const [found] = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.id, owner), eq(users.role, "organizer"), eq(users.isSuspended, false), isNull(users.deletedAt)),
      );
    if (!found) throw new EventActionError("Organizador no válido");
  }
  form.functions.forEach((fn) => parseStartsAt(fn.startsAt));
  await assertCategory(db, form.details.categoryId);

  return db.transaction(async (transaction) => {
    const tx: Tx = transaction;
    const venueId = await resolveVenue(tx, owner, form.venue);
    const [created] = await tx
      .insert(events)
      .values({
        ...detailsOf(form),
        organizerId: owner,
        venueId,
        slug: buildUniqueSlug(form.details.title),
        status: "draft",
      })
      .returning({ id: events.id });
    for (const fn of form.functions) await insertFunction(tx, created.id, venueId, fn);
    return created;
  });
}

// With orders on the event only the detail fields change; the structure part of
// the input is ignored.
export async function updateEvent(db: Db, actor: EventActor, eventId: string, input: unknown) {
  const form = parseInput(input);
  const event = await loadEvent(db, eventId);
  if (!canWriteEvent(actor, event, "edit")) throw new EventActionError(NOT_ALLOWED);
  await assertCategory(db, form.details.categoryId);
  const lock = await getStructureLock(db, event.id);
  if (!lock.locked) {
    const dates = form.functions.map((fn) => parseStartsAt(fn.startsAt));
    // A published event keeps the "future function" rule that publishing required.
    if (event.status === "published" && !dates.some((date) => date > new Date())) {
      throw new EventActionError("Un evento publicado necesita una fecha futura");
    }
  }

  await db.transaction(async (transaction) => {
    const tx: Tx = transaction;
    let venueId = event.venueId;
    if (!lock.locked) {
      venueId = await resolveVenue(tx, event.organizerId, form.venue);
      await deleteStructure(tx, event.id);
      for (const fn of form.functions) await insertFunction(tx, event.id, venueId, fn);
    }
    const updated = await tx
      .update(events)
      .set({ ...detailsOf(form), venueId, updatedAt: new Date() })
      .where(and(eq(events.id, event.id), eq(events.status, event.status)))
      .returning({ id: events.id });
    if (updated.length === 0) throw new EventActionError(STALE);
  });
}

// Publishing needs the event's owner (not the actor) able to charge; same rule as checkout.
function ownerReadySql() {
  return sql`exists (select 1 from ${users} where ${users.id} = ${events.organizerId} and ${users.stripeAccountId} is not null and ${users.stripeAccountId} <> '' and ${users.stripeChargesEnabled} = true)`;
}

async function assertOwnerCanAcceptPayments(db: Db | Tx, ownerId: string, actor: EventActor) {
  const [owner] = await db
    .select({ stripeAccountId: users.stripeAccountId, stripeChargesEnabled: users.stripeChargesEnabled })
    .from(users)
    .where(eq(users.id, ownerId));
  if (owner && canAcceptPayments(owner)) return;
  throw new EventActionError(actor?.id === ownerId ? STRIPE_REQUIRED_OWN : STRIPE_REQUIRED_OWNER);
}

export async function setEventStatus(db: Db, actor: EventActor, eventId: string, to: EventStatus) {
  const event = await loadEvent(db, eventId);
  if (!nextStatuses(actor, event).includes(to)) throw new EventActionError(NOT_ALLOWED);

  if (to === "published") {
    await assertOwnerCanAcceptPayments(db, event.organizerId, actor);
    const upcoming = await db
      .select({ id: eventFunctions.id })
      .from(eventFunctions)
      .innerJoin(functionZones, eq(functionZones.functionId, eventFunctions.id))
      .where(and(eq(eventFunctions.eventId, event.id), gt(eventFunctions.startsAt, new Date())))
      .limit(1);
    if (upcoming.length === 0) {
      throw new EventActionError("Para publicar necesitas una función futura con al menos una zona");
    }
  }
  // Guarded by the status read above, so a concurrent change is refused instead of overwritten.
  const writer: Tx = db;
  const updated = await writer
    .update(events)
    // Leaving "published" drops the highlight; coming back does not restore it.
    .set({ status: to, updatedAt: new Date(), ...(to !== "published" && { featured: false }) })
    .where(
      and(
        eq(events.id, event.id),
        eq(events.status, event.status),
        // Same statement as the write, so the owner losing Stripe in between cannot slip through.
        to === "published" ? ownerReadySql() : undefined,
      ),
    )
    .returning({ id: events.id });
  if (updated.length === 0) {
    if (to === "published") await assertOwnerCanAcceptPayments(db, event.organizerId, actor);
    throw new EventActionError(STALE);
  }
}

// Admin-only. Only published events can be highlighted.
export async function setEventFeatured(db: Db, actor: EventActor, eventId: string, featured: boolean) {
  const event = await loadEvent(db, eventId);
  if (!isEventAdmin(actor) || !canWriteEvent(actor, event, "edit")) throw new EventActionError(NOT_ALLOWED);
  if (featured && event.status !== "published") {
    throw new EventActionError("Solo se pueden destacar eventos publicados");
  }
  const writer: Tx = db;
  await writer
    .update(events)
    .set({ featured, updatedAt: new Date() })
    .where(and(eq(events.id, event.id), eq(events.status, event.status)));
}

export async function deleteEvent(db: Db, actor: EventActor, eventId: string) {
  const event = await loadEvent(db, eventId);
  if (!canWriteEvent(actor, event, "delete")) {
    // Own or admin but not a draft: point at the supported path instead of a bare denial.
    if (canWriteEvent(actor, { ...event, status: "draft" }, "delete")) {
      throw new EventActionError("Solo se pueden eliminar borradores. Cancela el evento en su lugar");
    }
    throw new EventActionError(NOT_ALLOWED);
  }

  await db.transaction(async (transaction) => {
    const tx: Tx = transaction;
    // Checked inside the transaction so an order cannot slip in between.
    const lock = await getStructureLock(tx, event.id);
    if (lock.hasOrders) {
      throw new EventActionError("El evento ya tiene pedidos. Cancélalo en lugar de eliminarlo");
    }
    await deleteStructure(tx, event.id);
    const deleted = await tx
      .delete(events)
      .where(and(eq(events.id, event.id), eq(events.status, "draft")))
      .returning({ id: events.id });
    if (deleted.length === 0) throw new EventActionError(STALE);
  });
}
