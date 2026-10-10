import type { VenueZone } from "@/modules/events/types/venue-zone.types"

export const MAX_TICKETS_PER_ZONE = 6

export function isZoneSoldOut(zone: Pick<VenueZone, "available">): boolean {
  return zone.available <= 0
}

export function getZoneMaxQuantity(zone: Pick<VenueZone, "available">): number {
  return Math.max(0, Math.min(zone.available, MAX_TICKETS_PER_ZONE))
}
