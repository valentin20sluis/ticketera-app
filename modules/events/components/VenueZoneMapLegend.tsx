import { cn } from "@/lib/utils"
import {
  ZONE_STATUS_CLASSNAMES,
  ZONE_STATUS_LABELS,
} from "@/modules/events/components/VenueZoneMap"
import type { ZoneSelectionStatus } from "@/modules/events/types/venue-zone.types"

const LEGEND_ORDER: ZoneSelectionStatus[] = ["available", "selected", "sold-out"]

export function VenueZoneMapLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {LEGEND_ORDER.map((status) => (
        <div key={status} className="flex items-center gap-2">
          <svg
            viewBox="0 0 10 10"
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0"
          >
            <rect
              width={10}
              height={10}
              rx={2}
              className={cn("stroke-1", ZONE_STATUS_CLASSNAMES[status])}
            />
          </svg>
          <span className="text-sm text-muted-foreground">
            {ZONE_STATUS_LABELS[status]}
          </span>
        </div>
      ))}
    </div>
  )
}
