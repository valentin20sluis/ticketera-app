import { describe, expect, it } from "vitest"

import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"

import { buildIcsContent } from "./generate-calendar-file"

function buildOrder(overrides: Partial<ConfirmedOrder> = {}): ConfirmedOrder {
  return {
    orderNumber: "TKT-ABC123",
    eventTitle: "Concierto de Rock",
    eventImageUrl: "https://example.com/image.jpg",
    venueName: "Estadio Nacional",
    city: "Lima",
    startDate: "2026-05-20T20:00:00.000Z",
    lines: [],
    totalQuantity: 2,
    totalAmount: 300,
    ...overrides,
  }
}

function pad(value: number): string {
  return value.toString().padStart(2, "0")
}

function toIcsDate(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
}

describe("buildIcsContent", () => {
  it("builds the full VCALENDAR structure in order, with DTEND exactly 3 hours after DTSTART", () => {
    const order = buildOrder()
    const ics = buildIcsContent(order)

    const expectedLinesInOrder = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      `UID:${order.orderNumber}`,
      "DTSTART:",
      "DTEND:",
      `SUMMARY:${order.eventTitle}`,
      `LOCATION:${order.venueName}, ${order.city}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ]

    let searchFrom = 0
    for (const fragment of expectedLinesInOrder) {
      const index = ics.indexOf(fragment, searchFrom)
      expect(index).toBeGreaterThanOrEqual(searchFrom)
      searchFrom = index + fragment.length
    }

    const startDate = new Date(order.startDate)
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000)

    expect(ics).toContain(`DTSTART:${toIcsDate(startDate)}`)
    expect(ics).toContain(`DTEND:${toIcsDate(endDate)}`)
  })

  it("escapes commas in venueName/city within the LOCATION line", () => {
    const order = buildOrder({ venueName: "Teatro Municipal, Sala A", city: "Lima" })
    const ics = buildIcsContent(order)

    expect(ics).toContain("LOCATION:Teatro Municipal\\, Sala A, Lima")
  })
})
