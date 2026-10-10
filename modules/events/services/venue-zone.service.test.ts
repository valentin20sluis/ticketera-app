import { describe, expect, it } from "vitest"

import {
  MAX_TICKETS_PER_ZONE,
  getZoneMaxQuantity,
  isZoneSoldOut,
} from "./venue-zone.service"

describe("isZoneSoldOut", () => {
  it("returns false for a zone with available tickets", () => {
    expect(isZoneSoldOut({ available: 120 })).toBe(false)
  })

  it("returns true for a sold-out zone", () => {
    expect(isZoneSoldOut({ available: 0 })).toBe(true)
  })
})

describe("getZoneMaxQuantity", () => {
  it("clamps to MAX_TICKETS_PER_ZONE when available is greater", () => {
    expect(getZoneMaxQuantity({ available: 120 })).toBe(MAX_TICKETS_PER_ZONE)
  })

  it("clamps to available when it is lower than MAX_TICKETS_PER_ZONE", () => {
    expect(getZoneMaxQuantity({ available: 3 })).toBe(3)
  })

  it("returns 0 for a sold-out zone", () => {
    expect(getZoneMaxQuantity({ available: 0 })).toBe(0)
  })
})
