import { describe, expect, it } from "vitest"

import { formatEventDateBadge } from "./format-event-date"

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
