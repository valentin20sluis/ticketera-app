import type { VenueZoneShape } from "@/modules/events/types/venue-zone.types";

const ZONE_X = 10;
const ZONE_WIDTH = 80;
const ZONE_MARGIN_Y = 5;
const ZONE_GAP = 2;

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
