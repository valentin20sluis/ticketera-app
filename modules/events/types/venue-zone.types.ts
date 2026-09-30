/**
 * Coordinates are expressed on a `0-100` grid, meant to be rendered inside
 * an SVG with `viewBox="0 0 100 100"` (percentage-like units, not pixels).
 */
export interface VenueZoneShape {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ZoneSelectionStatus = "available" | "selected" | "sold-out";

export interface VenueZone {
  id: string;
  name: string;
  price: number;
  capacity: number;
  available: number;
  shape: VenueZoneShape;
}
