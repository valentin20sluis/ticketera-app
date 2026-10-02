import type { z } from "zod";

import type { createEventFormSchema } from "@/modules/organizer/schemas/create-event.schema";
import type {
  OrganizerEvent,
  OrganizerEventFunction,
  OrganizerFunctionZone,
  OrganizerVenue,
  OrganizerVenueZone,
} from "@/modules/organizer/types/organizer.types";
import type { AppendOrganizerEventInput } from "@/modules/organizer/utils/organizer-catalog-storage";
import type { VenueZoneShape } from "@/modules/events/types/venue-zone.types";

export type CreateEventFormValues = z.infer<typeof createEventFormSchema>;

const ZONE_X = 10;
const ZONE_WIDTH = 80;
const ZONE_MARGIN_Y = 5;
const ZONE_GAP = 2;
const DEFAULT_CURRENCY = "PEN";

/**
 * Stacks `total` zones vertically inside the `0-100` viewBox, each separated
 * by `ZONE_GAP` so that `y + height` of zone `i` never exceeds `y` of zone
 * `i + 1`.
 */
export function buildStackedZoneShape(index: number, total: number): VenueZoneShape {
  const safeTotal = Math.max(total, 1);
  const gapsCount = safeTotal - 1;
  const availableHeight = 100 - ZONE_MARGIN_Y * 2 - gapsCount * ZONE_GAP;
  const height = availableHeight / safeTotal;
  const y = ZONE_MARGIN_Y + index * (height + ZONE_GAP);

  return { x: ZONE_X, y, width: ZONE_WIDTH, height };
}

function slugify(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildUniqueSlug(title: string): string {
  const base = slugify(title) || "evento";
  const uniqueSuffix = crypto.randomUUID().split("-")[0];

  return `${base}-${uniqueSuffix}`;
}

export function buildOrganizerEventEntry(
  values: CreateEventFormValues,
  context: { organizerId: string }
): AppendOrganizerEventInput {
  const now = new Date().toISOString();
  const zoneRows = values.functionZones.zones;

  let venue: OrganizerVenue | null = null;
  let venueId: string;

  if (values.venue.mode === "new") {
    venueId = crypto.randomUUID();
    venue = {
      id: venueId,
      organizerId: context.organizerId,
      name: values.venue.venue.name,
      address: values.venue.venue.address,
      city: values.venue.venue.city,
      lat: values.venue.venue.lat,
      lng: values.venue.venue.lng,
      createdAt: now,
    };
  } else {
    venueId = values.venue.venueId;
  }

  const venueZones: OrganizerVenueZone[] = zoneRows.map((zone, index) => {
    const shape = buildStackedZoneShape(index, zoneRows.length);

    return {
      id: crypto.randomUUID(),
      venueId,
      name: zone.name,
      shapeX: shape.x,
      shapeY: shape.y,
      shapeWidth: shape.width,
      shapeHeight: shape.height,
      capacity: zone.capacity,
      createdAt: now,
    };
  });

  const eventId = crypto.randomUUID();
  const event: OrganizerEvent = {
    id: eventId,
    organizerId: context.organizerId,
    categoryId: values.details.categoryId,
    venueId,
    slug: buildUniqueSlug(values.details.title),
    title: values.details.title,
    description: values.details.description,
    imageUrl: values.details.imageUrl,
    doorsOpenTime: values.details.doorsOpenTime,
    showStartTime: values.details.showStartTime,
    minimumAge: values.details.minimumAge,
    admissionType: values.details.admissionType,
    status: "draft",
    createdAt: now,
    updatedAt: now,
  };

  const eventFunctionId = crypto.randomUUID();
  const eventFunction: OrganizerEventFunction = {
    id: eventFunctionId,
    eventId,
    startsAt: values.functionZones.startsAt,
    createdAt: now,
  };

  const functionZones: OrganizerFunctionZone[] = zoneRows.map((zone, index) => ({
    id: crypto.randomUUID(),
    functionId: eventFunctionId,
    venueZoneId: venueZones[index].id,
    price: zone.price,
    currency: DEFAULT_CURRENCY,
    capacity: zone.capacity,
    createdAt: now,
  }));

  return { venue, venueZones, event, eventFunction, functionZones };
}
