import { describe, expect, it, vi } from "vitest";
import type StripeClient from "stripe";
import { createCheckoutSession } from "./create-checkout-session.service";

function setup() {
  const create = vi.fn().mockResolvedValue({ id: "cs_1", url: "https://pay" });
  const stripe = { checkout: { sessions: { create } } } as unknown as StripeClient;
  return { create, stripe };
}

const base = {
  orderId: "o1",
  items: [{ name: "VIP", unitAmount: 10.1, quantity: 2 }],
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  successUrl: "https://x/ok",
  cancelUrl: "https://x/no",
};

describe("createCheckoutSession", () => {
  it("convierte a céntimos, usa pen, invoice y metadata, sin payment_method_types", async () => {
    const { create, stripe } = setup();
    const result = await createCheckoutSession(stripe, base);
    const args = create.mock.calls[0][0];

    expect(result).toEqual({ id: "cs_1", url: "https://pay" });
    expect(args.mode).toBe("payment");
    expect(args.line_items[0].price_data.unit_amount).toBe(1010);
    expect(args.line_items[0].price_data.currency).toBe("pen");
    expect(args.line_items[0].quantity).toBe(2);
    expect(args.invoice_creation).toEqual({
      enabled: true,
      invoice_data: { metadata: { orderId: "o1" } },
    });
    expect(args.metadata).toEqual({ orderId: "o1" });
    expect(args).not.toHaveProperty("payment_method_types");
    expect(args.integration_identifier).toMatch(/^ticketera_[a-z]{8}$/);
  });

  it("usa mínimo 30 min si la orden expira antes", async () => {
    const { create, stripe } = setup();
    await createCheckoutSession(stripe, { ...base, expiresAt: new Date(Date.now() + 60_000) });
    const diff = create.mock.calls[0][0].expires_at - Math.floor(Date.now() / 1000);
    expect(diff).toBeGreaterThanOrEqual(1799);
  });

  it("respeta expiresAt cuando supera 30 min", async () => {
    const { create, stripe } = setup();
    await createCheckoutSession(stripe, base);
    expect(create.mock.calls[0][0].expires_at).toBe(Math.floor(base.expiresAt.getTime() / 1000));
  });
});
