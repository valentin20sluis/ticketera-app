import type { ReactNode } from "react"
import Image from "next/image"

import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPrice } from "@/lib/format-currency"
import { formatFullEventDate } from "@/modules/events/utils/format-event-date"
import type { OrganizerEventSummary } from "@/modules/organizer/services/get-organizer-summary.service"

interface OrganizerEventsTableProps {
  events: OrganizerEventSummary[]
  emptyState?: ReactNode
}

const STATUS_STYLES: Record<
  OrganizerEventSummary["status"],
  { label: string; badge: string; dot: string }
> = {
  draft: {
    label: "Borrador",
    badge: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
    dot: "bg-gray-500",
  },
  published: {
    label: "Publicado",
    badge: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
    dot: "bg-green-500",
  },
  cancelled: {
    label: "Cancelado",
    badge: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    dot: "bg-red-500",
  },
  suspended: {
    label: "Suspendido",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    dot: "bg-amber-500",
  },
}

function TicketsSoldMeter({ value, max }: { value: number; max: number }) {
  // A zero-sale event still shows a sliver so the bar's presence (not just its
  // length) communicates "no sales yet" rather than reading as a missing cell.
  const widthPercent = max > 0 ? Math.max((value / max) * 100, value > 0 ? 4 : 0) : 0

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-brand/15">
        <div className="h-full rounded-full bg-brand" style={{ width: `${widthPercent}%` }} />
      </div>
      <span className="text-sm tabular-nums text-gray-900">{value.toLocaleString("es-PE")}</span>
    </div>
  )
}

export function OrganizerEventsTable({ events, emptyState }: OrganizerEventsTableProps) {
  if (events.length === 0) {
    return (
      emptyState ?? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
          Todavía no tienes eventos publicados.
        </div>
      )
    )
  }

  const maxTicketsSold = Math.max(...events.map((event) => event.ticketsSold))

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Entradas vendidas</TableHead>
            <TableHead className="text-right">Ingresos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                    <Image
                      src={event.imageUrl}
                      alt={event.title}
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">{event.title}</span>
                    {event.startDate && (
                      <span className="text-sm text-gray-500">
                        {formatFullEventDate(event.startDate)}
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge className={cn("gap-1.5", STATUS_STYLES[event.status].badge)}>
                  <span
                    aria-hidden="true"
                    className={cn("size-1.5 rounded-full", STATUS_STYLES[event.status].dot)}
                  />
                  {STATUS_STYLES[event.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <TicketsSoldMeter value={event.ticketsSold} max={maxTicketsSold} />
              </TableCell>
              <TableCell className="text-right">{formatPrice(event.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
