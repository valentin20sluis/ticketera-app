import { inArray } from "drizzle-orm";
import type { DbLike } from "@/lib/db/seed/reset-catalog";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  venues,
  venueZones,
} from "@/lib/db/schema";
import { MOCK_CATEGORIES, MOCK_EVENTS } from "@/modules/events/data/events.mock";
import { MOCK_VENUE_ZONES } from "@/modules/events/data/venue-zones.mock";

// ponytail: one coordinate per city; per-venue pins need the real addresses.
const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Lima: { lat: -12.0464, lng: -77.0428 },
  Arequipa: { lat: -16.409, lng: -71.5375 },
  Cusco: { lat: -13.532, lng: -71.9675 },
  Trujillo: { lat: -8.1116, lng: -79.0288 },
};

// Shifts a past date forward by whole years (same month, day and time) until it is in the future.
export function upcomingDate(date: Date | string, now: Date = new Date()): Date {
  const result = new Date(date);
  while (result <= now) result.setFullYear(result.getFullYear() + 1);
  return result;
}

export interface EventCatalogRows {
  eventCategories: (typeof eventCategories.$inferInsert)[];
  venues: (typeof venues.$inferInsert)[];
  venueZones: (typeof venueZones.$inferInsert)[];
  events: (typeof events.$inferInsert)[];
  eventFunctions: (typeof eventFunctions.$inferInsert)[];
  functionZones: (typeof functionZones.$inferInsert)[];
}

// Pure: builds every row with pre-generated ids so inserts need no read-back.
export function buildEventCatalog(organizerId: string, now: Date = new Date()): EventCatalogRows {
  const categoryRows = MOCK_CATEGORIES.map((category) => ({
    id: crypto.randomUUID(),
    name: category.name,
    iconKey: category.id,
    colorKey: category.colorKey,
  }));
  const categoryIdByMockId = new Map(
    MOCK_CATEGORIES.map((category, index) => [category.id, categoryRows[index].id]),
  );

  const venueRows: EventCatalogRows["venues"] = [];
  const venueZoneRows: EventCatalogRows["venueZones"] = [];
  const zonesByVenueId = new Map<string, { mock: (typeof MOCK_VENUE_ZONES)[number]; id: string }[]>();
  const venueIdByKey = new Map<string, string>();

  for (const event of MOCK_EVENTS) {
    const key = `${event.venueName}|${event.city}`;
    if (venueIdByKey.has(key)) continue;

    const id = crypto.randomUUID();
    const coordinates = CITY_COORDINATES[event.city];
    if (!coordinates) throw new Error(`Sin coordenadas para la ciudad ${event.city}`);
    venueIdByKey.set(key, id);
    venueRows.push({
      id,
      organizerId,
      name: event.venueName,
      address: `${event.venueName}, ${event.city}`,
      city: event.city,
      lat: coordinates.lat,
      lng: coordinates.lng,
    });

    const zones = MOCK_VENUE_ZONES.map((zone) => {
      const zoneId = crypto.randomUUID();
      venueZoneRows.push({
        id: zoneId,
        venueId: id,
        name: zone.name,
        shapeX: zone.shape.x,
        shapeY: zone.shape.y,
        shapeWidth: zone.shape.width,
        shapeHeight: zone.shape.height,
        capacity: zone.capacity,
      });
      return { mock: zone, id: zoneId };
    });
    zonesByVenueId.set(id, zones);
  }

  const eventRows: EventCatalogRows["events"] = [];
  const eventFunctionRows: EventCatalogRows["eventFunctions"] = [];
  const functionZoneRows: EventCatalogRows["functionZones"] = [];

  for (const event of MOCK_EVENTS) {
    const venueId = venueIdByKey.get(`${event.venueName}|${event.city}`);
    const categoryId = categoryIdByMockId.get(event.categoryId);
    if (!venueId || !categoryId) throw new Error(`Datos incompletos para ${event.slug}`);

    const eventId = crypto.randomUUID();
    eventRows.push({
      id: eventId,
      organizerId,
      categoryId,
      venueId,
      slug: event.slug,
      title: event.title,
      description: event.description,
      imageUrl: event.imageUrl,
      doorsOpenTime: event.doorsOpenTime,
      showStartTime: event.showStartTime,
      minimumAge: event.minimumAge,
      admissionType: event.admissionType,
      status: "published",
    });

    const functionId = crypto.randomUUID();
    eventFunctionRows.push({
      id: functionId,
      eventId,
      startsAt: upcomingDate(event.startDate, now),
    });

    for (const { mock, id } of zonesByVenueId.get(venueId) ?? []) {
      functionZoneRows.push({
        functionId,
        venueZoneId: id,
        price: mock.price.toFixed(2),
        currency: "PEN",
        capacity: mock.capacity,
      });
    }
  }

  return {
    eventCategories: categoryRows,
    venues: venueRows,
    venueZones: venueZoneRows,
    events: eventRows,
    eventFunctions: eventFunctionRows,
    functionZones: functionZoneRows,
  };
}

// Refuses to run when any mock event is already loaded, so it never duplicates
// rows. The inserts are atomic only when the caller passes a transaction
// (the seed script does); otherwise clean partial rows before retrying.
export async function seedEventCatalog(db: DbLike, organizerId: string) {
  const rows = buildEventCatalog(organizerId);

  const existing = await db
    .select({ id: events.id })
    .from(events)
    .where(inArray(events.slug, rows.events.map((event) => event.slug)));
  if (existing.length > 0) throw new Error("El catálogo de eventos ya está cargado");

  await db.insert(eventCategories).values(rows.eventCategories);
  await db.insert(venues).values(rows.venues);
  await db.insert(venueZones).values(rows.venueZones);
  await db.insert(events).values(rows.events);
  await db.insert(eventFunctions).values(rows.eventFunctions);
  await db.insert(functionZones).values(rows.functionZones);
}
