import { afterEach, describe, expect, it, vi } from "vitest"

import { requestCheckoutUrl } from "./request-checkout-url.service"

const input = { items: [{ functionZoneId: "3f1c1a5e-0000-4000-8000-000000000000", quantity: 2 }] }

function mockFetch(status: number, body: unknown = {}) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })))
}

describe("requestCheckoutUrl", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("devuelve la url de Stripe", async () => {
    mockFetch(200, { url: "https://checkout.stripe.com/x" })
    expect(await requestCheckoutUrl(input)).toEqual({ ok: true, url: "https://checkout.stripe.com/x" })
  })

  it.each([
    [401, {}, "unauthorized"],
    [409, {}, "insufficient_stock"],
    [409, { error: "insufficient_stock" }, "insufficient_stock"],
    [409, { error: "organizer_payments_unavailable" }, "organizer_payments_unavailable"],
    [422, { error: "multiple_events" }, "multiple_events"],
    [400, { error: "invalid_payload" }, "unknown"],
    [500, {}, "unknown"],
    [502, { error: "checkout_unavailable" }, "unknown"],
    [503, { error: "payments_misconfigured" }, "unknown"],
  ])("mapea %i %j a %s", async (status, body, error) => {
    mockFetch(status, body)
    expect(await requestCheckoutUrl(input)).toEqual({ ok: false, error })
  })

  it("409 con seat_taken se mapea a seat_taken", async () => {
    mockFetch(409, { error: "seat_taken" })
    expect(await requestCheckoutUrl(input)).toEqual({ ok: false, error: "seat_taken" })
  })

  it("error de red es unknown", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")))
    expect(await requestCheckoutUrl(input)).toEqual({ ok: false, error: "unknown" })
  })
})
