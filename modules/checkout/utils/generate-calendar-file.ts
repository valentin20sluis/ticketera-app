import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"

// `ConfirmedOrder` no incluye una hora de fin para el evento, así que se asume
// una duración fija de 3 horas para calcular `DTEND` a partir de `startDate`.
const EVENT_DURATION_HOURS = 3

function formatIcsDate(date: Date): string {
  const pad = (value: number) => value.toString().padStart(2, "0")

  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`
}

function escapeIcsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;")
}

export function buildIcsContent(order: ConfirmedOrder): string {
  const startDate = new Date(order.startDate)
  const endDate = new Date(startDate.getTime() + EVENT_DURATION_HOURS * 60 * 60 * 1000)

  const summary = escapeIcsText(order.eventTitle)
  const location = `${escapeIcsText(order.venueName)}, ${escapeIcsText(order.city)}`

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${order.orderNumber}@ticketera`,
    `DTSTART:${formatIcsDate(startDate)}`,
    `DTEND:${formatIcsDate(endDate)}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]

  return lines.join("\r\n")
}

export function downloadCalendarFile(order: ConfirmedOrder): void {
  const blob = new Blob([buildIcsContent(order)], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `entradas-${order.orderNumber}.ics`
  anchor.click()

  URL.revokeObjectURL(url)
}
