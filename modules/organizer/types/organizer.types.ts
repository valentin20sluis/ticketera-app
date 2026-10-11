/**
 * Mock types mirroring `lib/db/schema.ts` (tables `venues`, `venue_zones`,
 * `events`, `event_functions`, `function_zones`), field by field, in
 * camelCase. Deliberate deviations: dates are `string` ISO (not `Date`),
 * and monetary amounts are `number` (not `numeric`/`string`) — same
 * pattern already used in `modules/events`.
 */

export type EventStatus = "draft" | "published" | "cancelled" | "suspended";

export interface OrganizerVenue {
  id: string;
  organizerId: string;
  name: string;
  address: string;
  city: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export interface OrganizerVenueZone {
  id: string;
  venueId: string;
  name: string;
  shapeX: number;
  shapeY: number;
  shapeWidth: number;
  shapeHeight: number;
  capacity: number;
  createdAt: string;
}

export interface OrganizerEvent {
  id: string;
  organizerId: string;
  categoryId: string;
  venueId: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string;
  doorsOpenTime: string;
  showStartTime: string;
  minimumAge: string;
  admissionType: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizerEventFunction {
  id: string;
  eventId: string;
  startsAt: string;
  createdAt: string;
}

export interface OrganizerFunctionZone {
  id: string;
  functionId: string;
  venueZoneId: string;
  price: number;
  currency: string;
  capacity: number;
  createdAt: string;
}

export interface OrganizerCatalog {
  venues: OrganizerVenue[];
  venueZones: OrganizerVenueZone[];
  events: OrganizerEvent[];
  eventFunctions: OrganizerEventFunction[];
  functionZones: OrganizerFunctionZone[];
}

export interface CurrentOrganizer {
  id: string;
  fullName: string;
  email: string;
  role: "organizer";
}
