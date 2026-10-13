"use client"

import { useState, type ComponentProps } from "react"

import { DatePicker } from "@/components/shared/DatePicker"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { OrganizerEventsTable } from "@/modules/organizer/components/OrganizerEventsTable"
import { formatLimaDateTime } from "@/modules/organizer/utils/lima-time"

type TableProps = ComponentProps<typeof OrganizerEventsTable>

const ALL = "all"

const STATUS_OPTIONS = [
  { value: ALL, label: "Todos los estados" },
  { value: "draft", label: "Borrador" },
  { value: "published", label: "Publicado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "suspended", label: "Suspendido" },
]

// Filters run client-side: the page already loads every own event.
export function OrganizerEventsFilters({ events, ...tableProps }: TableProps) {
  const [name, setName] = useState("")
  const [status, setStatus] = useState(ALL)
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [organizer, setOrganizer] = useState(ALL)

  // Only admin/super_admin see more than one organizer in the list.
  const organizerOptions = [
    { value: ALL, label: "Todos los organizadores" },
    ...[...new Map(events.map((e) => [e.organizerId, e.organizerName])).entries()].map(([value, label]) => ({
      value,
      label: label || "Sin nombre",
    })),
  ]
  const showOrganizer = organizerOptions.length > 2

  const query = name.trim().toLowerCase()
  const filtered = events.filter((event) => {
    if (query && !event.title.toLowerCase().includes(query)) return false
    if (status !== ALL && event.status !== status) return false
    if (organizer !== ALL && event.organizerId !== organizer) return false
    if (from || to) {
      // Compare the Lima calendar day with the YYYY-MM-DD pickers.
      if (!event.startDate) return false
      const day = formatLimaDateTime(new Date(event.startDate)).slice(0, 10)
      if ((from && day < from) || (to && day > to)) return false
    }
    return true
  })

  const hasFilters = Boolean(query || status !== ALL || organizer !== ALL || from || to)

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          type="search"
          className="h-10"
          placeholder="Buscar por nombre"
          aria-label="Buscar por nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Select items={STATUS_OPTIONS} value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
          <SelectTrigger aria-label="Filtrar por estado" className="h-10 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {showOrganizer && (
          <Select items={organizerOptions} value={organizer} onValueChange={(v) => setOrganizer(v ?? ALL)}>
            <SelectTrigger aria-label="Filtrar por organizador" className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {organizerOptions.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <DatePicker aria-label="Desde" placeholder="Desde" value={from} max={to} onChange={setFrom} />
        <DatePicker aria-label="Hasta" placeholder="Hasta" value={to} min={from} onChange={setTo} />
      </div>

      {hasFilters && filtered.length === 0 ? (
        <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
          Ningún evento coincide con los filtros.
        </div>
      ) : (
        <OrganizerEventsTable {...tableProps} events={filtered} />
      )}
    </div>
  )
}
