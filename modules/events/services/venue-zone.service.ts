import { MOCK_VENUE_ZONES } from "@/modules/events/data/venue-zones.mock"
import type { VenueZone } from "@/modules/events/types/venue-zone.types"

export const MAX_TICKETS_PER_ZONE = 6

export function getVenueZones(): VenueZone[] {
  return MOCK_VENUE_ZONES
}

export function isZoneSoldOut(zone: Pick<VenueZone, "available">): boolean {
  return zone.available <= 0
}

export function getZoneMaxQuantity(zone: Pick<VenueZone, "available">): number {
  return Math.max(0, Math.min(zone.available, MAX_TICKETS_PER_ZONE))
}
