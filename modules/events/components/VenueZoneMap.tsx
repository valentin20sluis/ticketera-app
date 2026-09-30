import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/format-currency"
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

const ZONE_TEXT_CLASSNAMES: Record<ZoneSelectionStatus, string> = {
  available: "fill-foreground",
  selected: "fill-primary-foreground",
  "sold-out": "fill-muted-foreground/60",
}

function splitZoneName(name: string): [string, string | undefined] {
  const [first, ...rest] = name.split(" ")
  return [first, rest.length > 0 ? rest.join(" ") : undefined]
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
        const { x, y, width, height } = zone.shape
        const cx = x + width / 2
        const cy = y + height / 2
        const [nameLine1, nameLine2] = splitZoneName(zone.name)
        const fontSize = width < 25 ? 2.3 : 3.2
        const lineHeight = fontSize * 1.25
        const textClassName = cn(
          "pointer-events-none text-center select-none",
          ZONE_TEXT_CLASSNAMES[zone.status]
        )

        return (
          <g
            key={zone.id}
            role="button"
            tabIndex={isSoldOut ? -1 : 0}
            aria-label={`${zone.name}, ${isSoldOut ? "agotado" : formatPrice(zone.price)}`}
            aria-disabled={isSoldOut}
            className="outline-none"
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
          >
            <rect
              x={x}
              y={y}
              width={width}
              height={height}
              rx={1.5}
              className={cn(
                "stroke-1 transition-colors focus-visible:stroke-2 focus-visible:stroke-ring",
                ZONE_STATUS_CLASSNAMES[zone.status]
              )}
            />
            <text
              x={cx}
              y={nameLine2 ? cy - lineHeight * 0.4 : cy - lineHeight * 0.1}
              textAnchor="middle"
              fontSize={fontSize}
              className={cn("font-semibold", textClassName)}
            >
              {nameLine1}
            </text>
            {nameLine2 && (
              <text
                x={cx}
                y={cy - lineHeight * 0.4 + lineHeight}
                textAnchor="middle"
                fontSize={fontSize}
                className={cn("font-semibold", textClassName)}
              >
                {nameLine2}
              </text>
            )}
            <text
              x={cx}
              y={
                (nameLine2 ? cy - lineHeight * 0.4 + lineHeight : cy - lineHeight * 0.1) +
                lineHeight
              }
              textAnchor="middle"
              fontSize={fontSize * 0.9}
              className={textClassName}
            >
              {isSoldOut ? "Agotado" : formatPrice(zone.price)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
