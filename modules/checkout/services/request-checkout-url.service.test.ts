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
    [401, "unauthorized"],
    [409, "insufficient_stock"],
    [400, "unknown"],
    [500, "unknown"],
  ])("mapea %i a %s", async (status, error) => {
    mockFetch(status)
    expect(await requestCheckoutUrl(input)).toEqual({ ok: false, error })
  })

  it("error de red es unknown", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("net")))
    expect(await requestCheckoutUrl(input)).toEqual({ ok: false, error: "unknown" })
  })
})
