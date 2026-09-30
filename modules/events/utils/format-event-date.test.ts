import { describe, expect, it } from "vitest"

import { formatEventDateBadge, formatEventTime, formatFullEventDate } from "./format-event-date"

describe("formatEventDateBadge", () => {
  it("formats a November date", () => {
    expect(formatEventDateBadge("2026-11-15")).toEqual({ month: "NOV", day: "15" })
  })

  it("formats a different month", () => {
    expect(formatEventDateBadge("2026-03-20")).toEqual({ month: "MAR", day: "20" })
  })

  it("pads single-digit days with a leading zero", () => {
    expect(formatEventDateBadge("2026-01-05")).toEqual({ month: "ENE", day: "05" })
  })

  it("handles full ISO datetime strings", () => {
    expect(formatEventDateBadge("2026-07-01T20:00:00.000Z")).toEqual({ month: "JUL", day: "01" })
  })
})

describe("formatFullEventDate", () => {
  it("formats the day, month in Spanish and year", () => {
    const result = formatFullEventDate("2026-11-15T10:00:00-05:00")

    expect(result).toContain("15")
    expect(result).toContain("noviembre")
    expect(result).toContain("2026")
  })
})

describe("formatEventTime", () => {
  it("formats the event time as H:MM or HH:MM", () => {
    const result = formatEventTime("2026-11-15T10:00:00-05:00")

    expect(result).toMatch(/^\d{1,2}:\d{2}/)
  })
})
