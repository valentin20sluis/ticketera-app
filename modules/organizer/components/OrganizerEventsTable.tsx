import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { formatPrice } from "@/lib/format-currency"
import type { OrganizerEventSummary } from "@/modules/organizer/services/get-organizer-summary.service"

interface OrganizerEventsTableProps {
  events: OrganizerEventSummary[]
}

export function OrganizerEventsTable({ events }: OrganizerEventsTableProps) {
  if (events.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
        Todavía no tienes eventos publicados.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Evento</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Entradas vendidas</TableHead>
            <TableHead className="text-right">Ingresos</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => (
            <TableRow key={event.id}>
              <TableCell className="font-medium text-gray-900">{event.title}</TableCell>
              <TableCell>
                <Badge className="gap-1.5 bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300">
                  <span aria-hidden="true" className="size-1.5 rounded-full bg-green-500" />
                  Publicado
                </Badge>
              </TableCell>
              <TableCell className="text-right">{event.ticketsSold.toLocaleString("es-PE")}</TableCell>
              <TableCell className="text-right">{formatPrice(event.revenue)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
