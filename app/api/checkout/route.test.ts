import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class InsufficientStockError extends Error {}
  return {
    InsufficientStockError,
    getCurrentUser: vi.fn(),
    resolveCheckoutDestination: vi.fn(),
    createCheckoutSession: vi.fn(),
    createPendingOrder: vi.fn(),
    attachCheckoutSession: vi.fn(),
    markOrderExpired: vi.fn(),
    labels: vi.fn(),
  };
});

const chain: Record<string, unknown> = {};
for (const m of ["select", "from", "innerJoin"]) chain[m] = () => chain;
chain.where = () => mocks.labels();

vi.mock("@/lib/stripe", () => ({ stripe: "stripe" }));
vi.mock("@/lib/db/client", () => ({ getDb: async () => chain }));
vi.mock("@/modules/users/services/current-user.service", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/modules/checkout/services/resolve-checkout-destination.service", () => ({
  resolveCheckoutDestination: mocks.resolveCheckoutDestination,
}));
vi.mock("@/modules/checkout/services/create-checkout-session.service", () => ({
  createCheckoutSession: mocks.createCheckoutSession,
}));
vi.mock("@/modules/ticketing/services/order.service", () => ({
  InsufficientStockError: mocks.InsufficientStockError,
  createPendingOrder: mocks.createPendingOrder,
  attachCheckoutSession: mocks.attachCheckoutSession,
  markOrderExpired: mocks.markOrderExpired,
}));

import { POST } from "./route";

const ZONE = "11111111-1111-4111-8111-111111111111";
const payload = { items: [{ functionZoneId: ZONE, quantity: 2 }] };

const call = (body: unknown = payload) =>
  POST({
    json: async () => body,
    nextUrl: { origin: "http://localhost:3000" },
  } as unknown as NextRequest);

describe("POST /api/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("PLATFORM_FEE_PERCENT", "10");
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", isSuspended: false });
    mocks.resolveCheckoutDestination.mockResolvedValue({
      ok: true,
      eventSlug: "rock-fest",
      stripeAccountId: "acct_1",
    });
    const expiresAt = new Date();
    mocks.createPendingOrder.mockResolvedValue({
      order: { id: "o1", expiresAt },
      items: [{ functionZoneId: ZONE, quantity: 2, unitPrice: "50.00" }],
    });
    mocks.labels.mockResolvedValue([{ id: ZONE, zone: "VIP", title: "Rock Fest" }]);
    mocks.createCheckoutSession.mockResolvedValue({ id: "cs_1", url: "https://stripe/pay" });
  });
  afterEach(() => vi.unstubAllEnvs());

  const expectNothingCreated = () => {
    expect(mocks.createPendingOrder).not.toHaveBeenCalled();
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
  };

  it("returns 401 without a session or when suspended", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    expect((await call()).status).toBe(401);
    mocks.getCurrentUser.mockResolvedValue({ id: "u1", isSuspended: true });
    expect((await call()).status).toBe(401);
    expectNothingCreated();
  });

  it("returns 400 on an invalid payload", async () => {
    const res = await call({ items: [] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_payload" });
    expectNothingCreated();
  });

  it.each([
    ["multiple_events", 422, "multiple_events"],
    ["organizer_payments_unavailable", 409, "organizer_payments_unavailable"],
    ["zone_not_found", 400, "invalid_payload"],
  ])("maps resolver error %s to %i", async (resolverError, status, error) => {
    mocks.resolveCheckoutDestination.mockResolvedValue({ ok: false, error: resolverError });
    const res = await call();
    expect(res.status).toBe(status);
    expect(await res.json()).toEqual({ error });
    expectNothingCreated();
  });

  it.each([undefined, "", "abc", "101", "-1"])(
    "returns 503 when PLATFORM_FEE_PERCENT is %j",
    async (value) => {
      if (value === undefined) vi.stubEnv("PLATFORM_FEE_PERCENT", undefined as unknown as string);
      else vi.stubEnv("PLATFORM_FEE_PERCENT", value);
      const res = await call();
      expect(res.status).toBe(503);
      expect(await res.json()).toEqual({ error: "payments_misconfigured" });
      expect(mocks.resolveCheckoutDestination).not.toHaveBeenCalled();
      expectNothingCreated();
    },
  );

  it("creates the session with destination, fee and event cancel url", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ url: "https://stripe/pay" });
    expect(mocks.resolveCheckoutDestination).toHaveBeenCalledWith(chain, [ZONE]);
    expect(mocks.createCheckoutSession).toHaveBeenCalledWith(
      "stripe",
      expect.objectContaining({
        orderId: "o1",
        destinationAccountId: "acct_1",
        feePercent: 10,
        successUrl: "http://localhost:3000/mis-entradas",
        cancelUrl: "http://localhost:3000/eventos/rock-fest/entradas",
        items: [{ name: "Rock Fest - VIP", unitAmount: 50, quantity: 2 }],
      }),
    );
    expect(mocks.attachCheckoutSession).toHaveBeenCalledWith(chain, "o1", "cs_1");
    expect(mocks.markOrderExpired).not.toHaveBeenCalled();
  });

  it("returns 409 insufficient_stock without calling Stripe", async () => {
    mocks.createPendingOrder.mockRejectedValue(new mocks.InsufficientStockError());
    const res = await call();
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "insufficient_stock" });
    expect(mocks.createCheckoutSession).not.toHaveBeenCalled();
  });

  it("expires the order and returns 502 when the session fails, hiding Stripe details", async () => {
    mocks.createCheckoutSession.mockRejectedValue(new Error("No such account: acct_1"));
    const res = await call();
    expect(res.status).toBe(502);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: "checkout_unavailable" });
    expect(text).not.toContain("acct_1");
    expect(mocks.markOrderExpired).toHaveBeenCalledWith(chain, "o1");
    expect(mocks.attachCheckoutSession).not.toHaveBeenCalled();
    expect(console.error).toHaveBeenCalled();
  });
});
