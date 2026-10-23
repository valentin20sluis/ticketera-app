import { and, eq, gt, sql } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  venues,
} from "@/lib/db/schema";
import type { Event, EventStatus } from "@/modules/events/types/event.types";
import { reservingOrderCondition } from "@/modules/ticketing/services/get-zone-availability.service";

export const LAST_TICKETS_RATIO = 0.2;
export const HERO_MAX_EVENTS = 5;

function resolveStatus(available: number, capacity: number): EventStatus {
  if (available <= 0) return "sold-out";
  return available / capacity <= LAST_TICKETS_RATIO ? "last-tickets" : "available";
}

export async function listPublicEvents(db: Db, now: Date = new Date()): Promise<Event[]> {
  const eventRows = await db
    .select({
      id: events.id,
      slug: events.slug,
      title: events.title,
      description: events.description,
      imageUrl: events.imageUrl,
      doorsOpenTime: events.doorsOpenTime,
      showStartTime: events.showStartTime,
      minimumAge: events.minimumAge,
      admissionType: events.admissionType,
      featured: events.featured,
      venueName: venues.name,
      city: venues.city,
      venueAddress: venues.address,
      venueLat: venues.lat,
      venueLng: venues.lng,
      categoryId: eventCategories.iconKey,
    })
    .from(events)
    .innerJoin(venues, eq(venues.id, events.venueId))
    .innerJoin(eventCategories, eq(eventCategories.id, events.categoryId))
    .where(eq(events.status, "published"));

  const zoneRows = await db
    .select({
      id: functionZones.id,
      eventId: eventFunctions.eventId,
      startsAt: eventFunctions.startsAt,
      price: functionZones.price,
      capacity: functionZones.capacity,
    })
    .from(functionZones)
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .innerJoin(events, eq(events.id, eventFunctions.eventId))
    .where(and(eq(events.status, "published"), gt(eventFunctions.startsAt, now)));

  const reservedRows = await db
    .select({
      zoneId: orderItems.functionZoneId,
      reserved: sql<number>`sum(${orderItems.quantity})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .innerJoin(functionZones, eq(functionZones.id, orderItems.functionZoneId))
    .innerJoin(eventFunctions, eq(eventFunctions.id, functionZones.functionId))
    .where(and(gt(eventFunctions.startsAt, now), reservingOrderCondition(now)))
    .groupBy(orderItems.functionZoneId);
  const reservedByZone = new Map(reservedRows.map((row) => [row.zoneId, Number(row.reserved)]));

  const zonesByEvent = new Map<string, typeof zoneRows>();
  for (const zone of zoneRows) {
    zonesByEvent.set(zone.eventId, [...(zonesByEvent.get(zone.eventId) ?? []), zone]);
  }

  const result: Event[] = [];
  for (const row of eventRows) {
    const zones = zonesByEvent.get(row.id);
    if (!zones) continue;
    const capacity = zones.reduce((sum, zone) => sum + zone.capacity, 0);
    const available = zones.reduce(
      (sum, zone) => sum + Math.max(0, zone.capacity - (reservedByZone.get(zone.id) ?? 0)),
      0,
    );
    result.push({
      ...row,
      currency: "PEN",
      startDate: new Date(Math.min(...zones.map((zone) => zone.startsAt.getTime()))).toISOString(),
      priceFrom: Math.min(...zones.map((zone) => Number(zone.price))),
      status: resolveStatus(available, capacity),
    });
  }

  return result.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.id.localeCompare(b.id));
}

// Featured events by date (max 5); with none featured, the first 5 of the list.
export function pickHeroEvents(list: Event[]): Event[] {
  const featured = list.filter((event) => event.featured);
  const source = featured.length > 0 ? featured : list;
  return [...source].sort((a, b) => a.startDate.localeCompare(b.startDate)).slice(0, HERO_MAX_EVENTS);
}
