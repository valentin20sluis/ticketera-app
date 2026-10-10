import { and, asc, eq, gte } from "drizzle-orm";
import type { Db } from "@/lib/db/client";
import { eventFunctions, events, functionZones, venueZones, venues } from "@/lib/db/schema";
import type { Event } from "@/modules/events/types/event.types";
import type { VenueZone } from "@/modules/events/types/venue-zone.types";
import { getZoneAvailability } from "./get-zone-availability.service";

export interface EventCheckout {
  event: Pick<Event, "title" | "slug" | "imageUrl" | "venueName" | "city" | "startDate">;
  zones: VenueZone[];
}

export async function getCheckoutEventBySlug(db: Db, slug: string): Promise<EventCheckout | null> {
  const [row] = await db
    .select({
      title: events.title,
      slug: events.slug,
      imageUrl: events.imageUrl,
      venueName: venues.name,
      city: venues.city,
      startsAt: eventFunctions.startsAt,
      functionId: eventFunctions.id,
    })
    .from(events)
    .innerJoin(venues, eq(venues.id, events.venueId))
    .innerJoin(eventFunctions, eq(eventFunctions.eventId, events.id))
    .where(and(eq(events.slug, slug), eq(events.status, "published"), gte(eventFunctions.startsAt, new Date())))
    .orderBy(asc(eventFunctions.startsAt))
    .limit(1);

  if (!row) return null;

  const zoneRows = await db
    .select({
      id: functionZones.id,
      name: venueZones.name,
      price: functionZones.price,
      capacity: functionZones.capacity,
      x: venueZones.shapeX,
      y: venueZones.shapeY,
      width: venueZones.shapeWidth,
      height: venueZones.shapeHeight,
    })
    .from(functionZones)
    .innerJoin(venueZones, eq(venueZones.id, functionZones.venueZoneId))
    .where(eq(functionZones.functionId, row.functionId))
    .orderBy(asc(functionZones.price));

  const zones = await Promise.all(
    zoneRows.map(async (zone): Promise<VenueZone> => ({
      id: zone.id,
      name: zone.name,
      price: Number(zone.price),
      capacity: zone.capacity,
      available: Math.max(0, await getZoneAvailability(db, zone.id)),
      shape: { x: zone.x, y: zone.y, width: zone.width, height: zone.height },
    })),
  );

  return {
    event: {
      title: row.title,
      slug: row.slug,
      imageUrl: row.imageUrl,
      venueName: row.venueName,
      city: row.city,
      startDate: row.startsAt.toISOString(),
    },
    zones,
  };
}
