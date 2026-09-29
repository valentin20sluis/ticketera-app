import { describe, expect, it } from "vitest"

import { formatPrice } from "./format-currency"

describe("formatPrice", () => {
  it("formats an integer amount without decimals", () => {
    expect(formatPrice(40)).toBe("S/ 40")
  })

  it("formats another integer amount without decimals", () => {
    expect(formatPrice(250)).toBe("S/ 250")
  })
})
