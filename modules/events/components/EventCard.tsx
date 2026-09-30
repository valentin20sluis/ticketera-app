import Image from "next/image"
import { CalendarIcon, MapPinIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatPrice } from "@/lib/format-currency"
import { MOCK_CATEGORIES } from "@/modules/events/data/events.mock"
import type { Event, EventStatus } from "@/modules/events/types/event.types"
import { formatEventDateBadge } from "@/modules/events/utils/format-event-date"

interface EventCardProps {
  event: Event
}

const STATUS_LABELS: Partial<Record<EventStatus, string>> = {
  "last-tickets": "Últimas entradas",
  "sold-out": "Agotado",
}

function formatFullEventDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("es-PE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function EventCard({ event }: EventCardProps) {
  const category = MOCK_CATEGORIES.find((item) => item.id === event.categoryId)
  const { month, day } = formatEventDateBadge(event.startDate)
  const statusLabel = STATUS_LABELS[event.status]

  return (
    <Card className="pt-0!">
      <div className="relative aspect-[4/3] w-full">
        <Image
          src={event.imageUrl}
          alt={event.title}
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute top-3 left-3 flex flex-col items-center rounded-lg bg-background px-2 py-1 text-center leading-none shadow-sm">
          <span className="text-xs font-bold text-cta">{month}</span>
          <span className="text-lg font-bold text-foreground">{day}</span>
        </div>
        {statusLabel && (
          <Badge
            variant={event.status === "sold-out" ? "destructive" : "default"}
            className={cn(
              "absolute top-3 right-3",
              event.status === "last-tickets" && "bg-cta text-cta-foreground"
            )}
          >
            {statusLabel}
          </Badge>
        )}
      </div>

      <CardContent className="flex flex-col gap-2">
        {category && (
          <span className="text-xs font-semibold tracking-wide text-brand uppercase">
            {category.name}
          </span>
        )}
        <h3 className="font-heading text-base font-semibold text-foreground">
          {event.title}
        </h3>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="size-4 shrink-0" />
          <span>
            {event.venueName}, {event.city}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <CalendarIcon className="size-4 shrink-0" />
          <span>{formatFullEventDate(event.startDate)}</span>
        </div>
      </CardContent>

      <CardFooter className="items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">
          Desde {formatPrice(event.priceFrom)}
        </span>
        <Button size="sm">Ver entradas</Button>
      </CardFooter>
    </Card>
  )
}
