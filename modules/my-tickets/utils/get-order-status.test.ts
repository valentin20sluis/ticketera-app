import { describe, expect, it } from "vitest"

import { getOrderStatus } from "./get-order-status"

describe("getOrderStatus", () => {
  const referenceDate = new Date("2026-10-01T00:00:00-05:00")

  it("returns 'past' when startDate is before referenceDate", () => {
    expect(getOrderStatus("2026-09-15T00:00:00-05:00", referenceDate)).toBe("past")
  })

  it("returns 'upcoming' when startDate is after referenceDate", () => {
    expect(getOrderStatus("2026-11-15T00:00:00-05:00", referenceDate)).toBe("upcoming")
  })

  it("returns 'upcoming' when startDate equals referenceDate (exact tie)", () => {
    expect(getOrderStatus("2026-10-01T00:00:00-05:00", referenceDate)).toBe("upcoming")
  })
})
