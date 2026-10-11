import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import type * as schema from "@/lib/db/schema";
import { and, eq, gt, inArray } from "drizzle-orm";
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
import { getStructureLock } from "@/modules/organizer/services/event-read.service";
import {
  canWriteEvent,
  isEventAdmin,
  nextStatuses,
  type EventActor,
  type EventStatus,
} from "@/modules/organizer/utils/event-permissions";
import { buildUniqueSlug } from "@/modules/organizer/utils/event-slug";
import { parseLimaDateTime } from "@/modules/organizer/utils/lima-time";
import { buildStackedZoneShape } from "@/modules/organizer/utils/zone-shape";

// Only these messages are safe to show to the user; any other error stays generic.
export class EventActionError extends Error {}

const INVALID = "Datos no válidos";
const NOT_FOUND = "Evento no encontrado";
const NOT_ALLOWED = "No puedes modificar este evento";
const DEFAULT_CURRENCY = "PEN";

type Tx = PgDatabase<PgQueryResultHKT, typeof schema>;

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

async function insertFunction(tx: Tx, eventId: string, venueId: string, form: CreateEventFormValues) {
  const startsAt = parseStartsAt(form.functionZones.startsAt);
  const zones = form.functionZones.zones;
  const [fn] = await tx
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
          capacity: zone.capacity,
        };
      }),
    )
    .returning({ id: venueZones.id });
  await tx.insert(functionZones).values(
    zones.map((zone, index) => ({
      functionId: fn.id,
      venueZoneId: createdZones[index].id,
      price: zone.price.toFixed(2),
      currency: DEFAULT_CURRENCY,
      capacity: zone.capacity,
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

// ownerId is honoured only for admins; an organizer always creates for themselves.
export async function createEvent(
  db: Db,
  actor: EventActor,
  input: unknown,
  ownerId?: string,
): Promise<{ id: string }> {
  const form = parseInput(input);
  const owner = actor && isEventAdmin(actor) && ownerId ? ownerId : actor?.id;
  if (!owner || !canWriteEvent(actor, { organizerId: owner, status: "draft" }, "edit")) {
    throw new EventActionError(NOT_ALLOWED);
  }
  if (owner !== actor?.id) {
    const [found] = await db.select({ id: users.id }).from(users).where(eq(users.id, owner));
    if (!found) throw new EventActionError(INVALID);
  }
  parseStartsAt(form.functionZones.startsAt);
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
    await insertFunction(tx, created.id, venueId, form);
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
  if (!lock.locked) parseStartsAt(form.functionZones.startsAt);

  await db.transaction(async (tx) => {
    let venueId = event.venueId;
    if (!lock.locked) {
      venueId = await resolveVenue(tx, event.organizerId, form.venue);
      await deleteStructure(tx, event.id);
      await insertFunction(tx, event.id, venueId, form);
    }
    await tx
      .update(events)
      .set({ ...detailsOf(form), venueId, updatedAt: new Date() })
      .where(eq(events.id, event.id));
  });
}

export async function setEventStatus(db: Db, actor: EventActor, eventId: string, to: EventStatus) {
  const event = await loadEvent(db, eventId);
  if (!nextStatuses(actor, event).includes(to)) throw new EventActionError(NOT_ALLOWED);

  if (to === "published") {
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
  await db.update(events).set({ status: to, updatedAt: new Date() }).where(eq(events.id, event.id));
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

  await db.transaction(async (tx) => {
    // Checked inside the transaction so an order cannot slip in between.
    const lock = await getStructureLock(tx as unknown as Db, event.id);
    if (lock.hasOrders) {
      throw new EventActionError("El evento ya tiene pedidos. Cancélalo en lugar de eliminarlo");
    }
    await deleteStructure(tx, event.id);
    await tx.delete(events).where(eq(events.id, event.id));
  });
}
