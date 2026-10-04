import { describe, expect, it } from "vitest"

import { getTicketCode } from "./get-ticket-code"

describe("getTicketCode", () => {
  it("returns a padded code for the first ticket of an order", () => {
    expect(getTicketCode("TKT-8X3K2Q", 1)).toBe("TK-8X3K2Q-01")
  })

  it("returns a padded code for a two-digit ticket number", () => {
    expect(getTicketCode("TKT-8X3K2Q", 12)).toBe("TK-8X3K2Q-12")
  })
})
