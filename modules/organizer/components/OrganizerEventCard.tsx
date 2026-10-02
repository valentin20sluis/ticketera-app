import Image from "next/image"
import { MapPinIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { formatFullEventDate } from "@/modules/events/utils/format-event-date"
import type {
  EventStatus,
  OrganizerEventSummary,
} from "@/modules/organizer/types/organizer.types"

interface OrganizerEventCardProps {
  summary: OrganizerEventSummary
}

const STATUS_CONFIG: Record<
  EventStatus,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
  draft: { label: "Borrador", variant: "outline" },
  published: { label: "Publicado", variant: "default" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  suspended: { label: "Suspendido", variant: "secondary" },
}

export function OrganizerEventCard({ summary }: OrganizerEventCardProps) {
  const statusConfig = STATUS_CONFIG[summary.status]

  return (
    <Card className="pt-0!">
      <div className="relative aspect-[16/9] w-full">
        <Image
          src={summary.imageUrl}
          alt={summary.title}
          fill
          unoptimized
          className="object-cover"
        />
        <Badge variant={statusConfig.variant} className="absolute top-3 right-3">
          {statusConfig.label}
        </Badge>
      </div>

      <CardContent className="flex flex-col gap-2">
        <h3 className="font-heading text-base font-semibold text-foreground">
          {summary.title}
        </h3>
        <p className="text-sm text-muted-foreground">{summary.categoryName}</p>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <MapPinIcon className="size-4 shrink-0" />
          <span>
            {summary.venueName}, {summary.city}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {summary.startsAt ? formatFullEventDate(summary.startsAt) : "Sin función programada"}
        </p>
        <p className="text-sm font-medium text-foreground">
          {summary.zonesCount} zona(s) · {summary.totalCapacity} cupos
        </p>
      </CardContent>
    </Card>
  )
}
