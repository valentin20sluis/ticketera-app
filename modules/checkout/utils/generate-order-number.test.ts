import { describe, expect, it } from "vitest"

import { generateOrderNumber } from "./generate-order-number"

describe("generateOrderNumber", () => {
  it("matches the TKT-XXXXXX format", () => {
    expect(generateOrderNumber()).toMatch(/^TKT-[A-Z0-9]{6}$/)
  })

  it("does not produce collisions across repeated calls", () => {
    const orderNumbers = Array.from({ length: 20 }, () => generateOrderNumber())

    expect(new Set(orderNumbers).size).toBe(orderNumbers.length)
  })
})
