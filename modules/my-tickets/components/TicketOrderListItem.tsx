import Image from "next/image"
import { MapPinIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"
import { formatFullEventDate } from "@/modules/events/utils/format-event-date"

interface TicketOrderListItemProps {
  order: ConfirmedOrder
  isSelected: boolean
  onSelect: () => void
}

export function TicketOrderListItem({
  order,
  isSelected,
  onSelect,
}: TicketOrderListItemProps) {
  const zoneLabel = order.lines.length === 1 ? order.lines[0].zoneName : "Varias zonas"

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full gap-3 rounded-lg border p-3 text-left transition-colors",
        isSelected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      )}
    >
      <div className="relative size-16 shrink-0 overflow-hidden rounded-md">
        <Image
          src={order.eventImageUrl}
          alt={order.eventTitle}
          fill
          unoptimized
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-col gap-1">
        <h3 className="truncate font-heading text-sm font-semibold text-foreground">
          {order.eventTitle}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPinIcon className="size-3.5 shrink-0" />
          <span className="truncate">
            {order.venueName}, {order.city} · {formatFullEventDate(order.startDate)}
          </span>
        </div>
        <span className="text-xs font-medium text-foreground">
          {order.totalQuantity} {order.totalQuantity !== 1 ? "entradas" : "entrada"} · {zoneLabel}
        </span>
      </div>
    </button>
  )
}
