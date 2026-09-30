import { MinusIcon, PlusIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/format-currency"
import { cn } from "@/lib/utils"
import type {
  VenueZone,
  ZoneSelectionStatus,
} from "@/modules/events/types/venue-zone.types"

interface ZoneSelectorListZone extends VenueZone {
  status: ZoneSelectionStatus
  quantity: number
  maxQuantity: number
}

interface ZoneSelectorListProps {
  zones: ZoneSelectorListZone[]
  activeZoneId: string | null
  onIncrement: (zoneId: string) => void
  onDecrement: (zoneId: string) => void
}

export function ZoneSelectorList({
  zones,
  activeZoneId,
  onIncrement,
  onDecrement,
}: ZoneSelectorListProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        {zones.map((zone) => {
          const isSoldOut = zone.status === "sold-out"
          const isActive = zone.id === activeZoneId

          return (
            <div
              key={zone.id}
              className={cn(
                "flex items-center justify-between gap-3 rounded-lg border border-transparent p-3 transition-colors",
                isActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              )}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">{zone.name}</span>
                  {isSoldOut && <Badge variant="outline">Agotado</Badge>}
                </div>
                <span className="text-sm text-muted-foreground">
                  {formatPrice(zone.price)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Quitar entrada de ${zone.name}`}
                  disabled={zone.quantity === 0}
                  onClick={() => onDecrement(zone.id)}
                >
                  <MinusIcon />
                </Button>
                <span className="w-4 text-center text-sm font-medium tabular-nums">
                  {zone.quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Agregar entrada de ${zone.name}`}
                  disabled={isSoldOut || zone.quantity >= zone.maxQuantity}
                  onClick={() => onIncrement(zone.id)}
                >
                  <PlusIcon />
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
