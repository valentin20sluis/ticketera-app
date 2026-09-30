import { cn } from "@/lib/utils"
import type {
  VenueZone,
  ZoneSelectionStatus,
} from "@/modules/events/types/venue-zone.types"

interface VenueZoneMapZone extends VenueZone {
  status: ZoneSelectionStatus
}

interface VenueZoneMapProps {
  zones: VenueZoneMapZone[]
  onZoneSelect: (zoneId: string) => void
}

const ZONE_STATUS_CLASSNAMES: Record<ZoneSelectionStatus, string> = {
  available: "cursor-pointer fill-muted stroke-border hover:fill-muted/70",
  selected: "cursor-pointer fill-primary stroke-primary",
  "sold-out": "cursor-not-allowed fill-muted/40 stroke-border/40",
}

export function VenueZoneMap({ zones, onZoneSelect }: VenueZoneMapProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      role="img"
      aria-label="Mapa de zonas del venue"
      className="h-auto w-full"
    >
      <rect x={20} y={0} width={60} height={8} className="fill-foreground/80" />
      <text
        x={50}
        y={5.5}
        textAnchor="middle"
        className="fill-background text-[3px] font-semibold tracking-widest uppercase"
      >
        Escenario
      </text>

      {zones.map((zone) => {
        const isSoldOut = zone.status === "sold-out"

        return (
          <rect
            key={zone.id}
            x={zone.shape.x}
            y={zone.shape.y}
            width={zone.shape.width}
            height={zone.shape.height}
            rx={1.5}
            role="button"
            tabIndex={isSoldOut ? -1 : 0}
            aria-label={zone.name}
            aria-disabled={isSoldOut}
            className={cn(
              "stroke-1 transition-colors outline-none focus-visible:stroke-2 focus-visible:stroke-ring",
              ZONE_STATUS_CLASSNAMES[zone.status]
            )}
            onClick={() => {
              if (!isSoldOut) {
                onZoneSelect(zone.id)
              }
            }}
            onKeyDown={(event) => {
              if (isSoldOut) {
                return
              }

              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                onZoneSelect(zone.id)
              }
            }}
          />
        )
      })}
    </svg>
  )
}
