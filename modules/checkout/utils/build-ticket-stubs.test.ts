import { describe, expect, it } from "vitest"

import { buildTicketStubs } from "./build-ticket-stubs"

describe("buildTicketStubs", () => {
  it("expands lines into individually numbered stubs with a global correlative count", () => {
    const stubs = buildTicketStubs([
      { zoneId: "vip", zoneName: "VIP", price: 150, quantity: 2, subtotal: 300 },
      { zoneId: "general", zoneName: "General", price: 80, quantity: 1, subtotal: 80 },
    ])

    expect(stubs).toEqual([
      { zoneName: "VIP", price: 150, ticketNumber: 1, totalTickets: 3 },
      { zoneName: "VIP", price: 150, ticketNumber: 2, totalTickets: 3 },
      { zoneName: "General", price: 80, ticketNumber: 3, totalTickets: 3 },
    ])
  })

  it("adds the seat only to stubs that have one", () => {
    const stubs = buildTicketStubs(
      [{ zoneId: "vip", zoneName: "VIP", price: 150, quantity: 3, subtotal: 450 }],
      ["Fila B · Asiento 7", null],
    )

    expect(stubs[0].seat).toBe("Fila B · Asiento 7")
    expect(stubs[1]).not.toHaveProperty("seat")
    expect(stubs[2]).not.toHaveProperty("seat")
  })

  it("returns an empty array when there are no lines", () => {
    expect(buildTicketStubs([])).toEqual([])
  })
})
