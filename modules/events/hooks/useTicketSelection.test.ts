import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useTicketSelection } from "./useTicketSelection"
import type { VenueZone } from "@/modules/events/types/venue-zone.types"

function buildZone(overrides: Partial<VenueZone>): VenueZone {
  return {
    id: "zone-1",
    name: "Zone 1",
    price: 100,
    capacity: 100,
    available: 10,
    shape: { x: 0, y: 0, width: 10, height: 10 },
    ...overrides,
  }
}

const ZONES: VenueZone[] = [
  buildZone({ id: "campo-vip", name: "Campo VIP", price: 250, available: 4 }),
  buildZone({ id: "campo-general", name: "Campo General", price: 150, available: 20 }),
  buildZone({ id: "tribuna-occidente", name: "Tribuna Occidente", price: 120, available: 0 }),
]

describe("useTicketSelection", () => {
  it("returns the expected initial state", () => {
    const { result } = renderHook(() => useTicketSelection(ZONES))

    expect(result.current.quantities).toEqual({
      "campo-vip": 0,
      "campo-general": 0,
      "tribuna-occidente": 0,
    })
    expect(result.current.activeZoneId).toBeNull()
    expect(result.current.lines).toEqual([])
    expect(result.current.totalQuantity).toBe(0)
    expect(result.current.totalAmount).toBe(0)
  })

  it("selectZone sets quantity to 1 and activeZoneId on an available zone with quantity 0", () => {
    const { result } = renderHook(() => useTicketSelection(ZONES))

    act(() => {
      result.current.selectZone("campo-vip")
    })

    expect(result.current.quantities["campo-vip"]).toBe(1)
    expect(result.current.activeZoneId).toBe("campo-vip")
  })

  it("selectZone on an already selected zone only updates activeZoneId", () => {
    const { result } = renderHook(() => useTicketSelection(ZONES))

    act(() => {
      result.current.selectZone("campo-vip")
    })
    act(() => {
      result.current.increment("campo-vip")
    })
    expect(result.current.quantities["campo-vip"]).toBe(2)

    act(() => {
      result.current.selectZone("campo-general")
    })
    act(() => {
      result.current.selectZone("campo-vip")
    })

    expect(result.current.quantities["campo-vip"]).toBe(2)
    expect(result.current.activeZoneId).toBe("campo-vip")
  })

  it("selectZone has no effect on a sold-out zone", () => {
    const { result } = renderHook(() => useTicketSelection(ZONES))

    act(() => {
      result.current.selectZone("tribuna-occidente")
    })

    expect(result.current.quantities["tribuna-occidente"]).toBe(0)
    expect(result.current.activeZoneId).toBeNull()
  })

  it("increment/decrement clamp between 0 and getZoneMaxQuantity", () => {
    const { result } = renderHook(() => useTicketSelection(ZONES))

    for (let i = 0; i < 10; i += 1) {
      act(() => {
        result.current.increment("campo-vip")
      })
    }
    expect(result.current.quantities["campo-vip"]).toBe(4)
    expect(result.current.activeZoneId).toBe("campo-vip")

    act(() => {
      result.current.increment("campo-vip")
    })
    expect(result.current.quantities["campo-vip"]).toBe(4)

    for (let i = 0; i < 10; i += 1) {
      act(() => {
        result.current.decrement("campo-vip")
      })
    }
    expect(result.current.quantities["campo-vip"]).toBe(0)

    act(() => {
      result.current.decrement("campo-vip")
    })
    expect(result.current.quantities["campo-vip"]).toBe(0)
  })

  it("increment on a sold-out zone has no effect", () => {
    const { result } = renderHook(() => useTicketSelection(ZONES))

    act(() => {
      result.current.increment("tribuna-occidente")
    })

    expect(result.current.quantities["tribuna-occidente"]).toBe(0)
    expect(result.current.activeZoneId).toBeNull()
  })

  it("increment clamps to available when it is lower than MAX_TICKETS_PER_ZONE", () => {
    const zones = [buildZone({ id: "small-zone", available: 2 })]
    const { result } = renderHook(() => useTicketSelection(zones))

    for (let i = 0; i < 5; i += 1) {
      act(() => {
        result.current.increment("small-zone")
      })
    }

    expect(result.current.quantities["small-zone"]).toBe(2)
  })

  it("getZoneStatus reflects sold-out, selected and available states", () => {
    const { result } = renderHook(() => useTicketSelection(ZONES))

    expect(result.current.getZoneStatus("tribuna-occidente")).toBe("sold-out")
    expect(result.current.getZoneStatus("campo-general")).toBe("available")

    act(() => {
      result.current.selectZone("campo-general")
    })
    expect(result.current.getZoneStatus("campo-general")).toBe("selected")
  })

  it("computes lines, totalQuantity and totalAmount for multiple selected zones", () => {
    const { result } = renderHook(() => useTicketSelection(ZONES))

    act(() => {
      result.current.selectZone("campo-vip")
    })
    act(() => {
      result.current.selectZone("campo-general")
    })
    act(() => {
      result.current.increment("campo-general")
    })

    expect(result.current.lines).toEqual([
      { zoneId: "campo-vip", zoneName: "Campo VIP", price: 250, quantity: 1, subtotal: 250 },
      {
        zoneId: "campo-general",
        zoneName: "Campo General",
        price: 150,
        quantity: 2,
        subtotal: 300,
      },
    ])
    expect(result.current.totalQuantity).toBe(3)
    expect(result.current.totalAmount).toBe(550)
  })
})
