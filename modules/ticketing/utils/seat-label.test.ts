import { describe, expect, it } from "vitest"
import { formatSeat, seatLabel } from "./seat-label"

describe("seat-label", () => {
  it("builds the short label", () => {
    expect(seatLabel({ row: 1, number: 1 })).toBe("A1")
    expect(seatLabel({ row: 2, number: 7 })).toBe("B7")
    expect(seatLabel({ row: 26, number: 3 })).toBe("Z3")
    expect(seatLabel({ row: 27, number: 1 })).toBe("AA1")
    expect(seatLabel({ row: 52, number: 1 })).toBe("AZ1")
  })

  it("builds the long label", () => {
    expect(formatSeat({ row: 2, number: 7 })).toBe("Fila B · Asiento 7")
    expect(formatSeat({ row: 27, number: 12 })).toBe("Fila AA · Asiento 12")
  })
})
