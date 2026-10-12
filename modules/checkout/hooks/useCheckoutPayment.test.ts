import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useCheckoutPayment } from "./useCheckoutPayment"

const push = vi.fn()
const refresh = vi.fn()
const requestCheckoutUrl = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh }) }))
vi.mock("@/modules/checkout/services/request-checkout-url.service", () => ({
  requestCheckoutUrl: (...args: unknown[]) => requestCheckoutUrl(...args),
}))

const lines = [{ zoneId: "z1", zoneName: "VIP", price: 10, quantity: 2, subtotal: 20 }]
const assign = vi.fn()

describe("useCheckoutPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, "location", { value: { assign }, writable: true })
  })

  it("redirige a Stripe con el payload de las líneas", async () => {
    requestCheckoutUrl.mockResolvedValue({ ok: true, url: "https://stripe.test/s" })
    const { result } = renderHook(() => useCheckoutPayment(lines))
    await act(() => result.current.pay())
    expect(requestCheckoutUrl).toHaveBeenCalledWith({
      items: [{ functionZoneId: "z1", quantity: 2 }],
    })
    expect(assign).toHaveBeenCalledWith("https://stripe.test/s")
  })

  it("envía asientos para zonas numeradas", async () => {
    requestCheckoutUrl.mockResolvedValue({ ok: true, url: "https://stripe.test/s" })
    const seats = [{ row: 2, number: 7 }]
    const { result } = renderHook(() => useCheckoutPayment([{ ...lines[0], seats }]))
    await act(() => result.current.pay())
    expect(requestCheckoutUrl).toHaveBeenCalledWith({ items: [{ functionZoneId: "z1", seats }] })
  })

  it("seat_taken muestra mensaje y recarga los ocupados", async () => {
    requestCheckoutUrl.mockResolvedValue({ ok: false, error: "seat_taken" })
    const { result } = renderHook(() => useCheckoutPayment(lines))
    await act(() => result.current.pay())
    expect(result.current.error).toMatch(/asientos/)
    expect(refresh).toHaveBeenCalled()
    expect(result.current.isLoading).toBe(false)
  })

  it("401 va a /ingresar", async () => {
    requestCheckoutUrl.mockResolvedValue({ ok: false, error: "unauthorized" })
    const { result } = renderHook(() => useCheckoutPayment(lines))
    await act(() => result.current.pay())
    expect(push).toHaveBeenCalledWith("/ingresar")
  })

  it("409 muestra error de cupo y libera el botón", async () => {
    requestCheckoutUrl.mockResolvedValue({ ok: false, error: "insufficient_stock" })
    const { result } = renderHook(() => useCheckoutPayment(lines))
    await act(() => result.current.pay())
    expect(result.current.error).toMatch(/cupo/)
    expect(result.current.isLoading).toBe(false)
    expect(assign).not.toHaveBeenCalled()
  })
})
