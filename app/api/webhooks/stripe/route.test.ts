import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  invoicePaymentsList: vi.fn(),
  sessionsList: vi.fn(),
  markOrderPaid: vi.fn(),
  markOrderExpired: vi.fn(),
  setOrderInvoiceUrl: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: {
    webhooks: { constructEvent: mocks.constructEvent },
    invoicePayments: { list: mocks.invoicePaymentsList },
    checkout: { sessions: { list: mocks.sessionsList } },
  },
}));
vi.mock("@/lib/db/client", () => ({ getDb: async () => "db" }));
vi.mock("@/modules/ticketing/services/order.service", () => ({
  markOrderPaid: mocks.markOrderPaid,
  markOrderExpired: mocks.markOrderExpired,
  setOrderInvoiceUrl: mocks.setOrderInvoiceUrl,
}));

import { POST } from "./route";

const call = (event?: unknown) => {
  if (event) mocks.constructEvent.mockReturnValue(event);
  return POST({
    headers: new Headers({ "stripe-signature": "sig" }),
    text: async () => "{}",
  } as unknown as NextRequest);
};

const session = (type: string, object: Record<string, unknown>) => ({
  type,
  data: { object: { metadata: { orderId: "o1" }, payment_intent: "pi_1", ...object } },
});

describe("stripe webhook", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 on invalid signature", async () => {
    mocks.constructEvent.mockImplementation(() => {
      throw new Error("bad");
    });
    expect((await call()).status).toBe(400);
    expect(mocks.markOrderPaid).not.toHaveBeenCalled();
  });

  it("marks the order paid on checkout.session.completed", async () => {
    const res = await call(session("checkout.session.completed", { payment_status: "paid" }));
    expect(res.status).toBe(200);
    expect(mocks.markOrderPaid).toHaveBeenCalledWith("db", { orderId: "o1", paymentIntentId: "pi_1" });
  });

  it("accepts an expanded payment_intent", async () => {
    await call(
      session("checkout.session.completed", { payment_status: "paid", payment_intent: { id: "pi_2" } }),
    );
    expect(mocks.markOrderPaid).toHaveBeenCalledWith("db", { orderId: "o1", paymentIntentId: "pi_2" });
  });

  it("does not mark paid when async_payment_succeeded is unpaid", async () => {
    const res = await call(
      session("checkout.session.async_payment_succeeded", { payment_status: "unpaid" }),
    );
    expect(res.status).toBe(200);
    expect(mocks.markOrderPaid).not.toHaveBeenCalled();
  });

  it("ignores sessions without orderId", async () => {
    const res = await call(
      session("checkout.session.completed", { payment_status: "paid", metadata: null }),
    );
    expect(res.status).toBe(200);
    expect(mocks.markOrderPaid).not.toHaveBeenCalled();
  });

  it("expires the order on checkout.session.expired", async () => {
    await call(session("checkout.session.expired", {}));
    expect(mocks.markOrderExpired).toHaveBeenCalledWith("db", "o1");
  });

  it("stores the invoice url resolved via payment intent and session", async () => {
    mocks.invoicePaymentsList.mockResolvedValue({ data: [{ payment: { payment_intent: "pi_1" } }] });
    mocks.sessionsList.mockResolvedValue({ data: [{ metadata: { orderId: "o1" } }] });
    const res = await call({
      type: "invoice.paid",
      data: { object: { id: "in_1", metadata: {}, hosted_invoice_url: "https://inv" } },
    });
    expect(res.status).toBe(200);
    expect(mocks.sessionsList).toHaveBeenCalledWith({ payment_intent: "pi_1", limit: 1 });
    expect(mocks.setOrderInvoiceUrl).toHaveBeenCalledWith("db", "o1", "https://inv");
  });

  it("does nothing on invoice.paid when the order cannot be resolved", async () => {
    mocks.invoicePaymentsList.mockResolvedValue({ data: [] });
    const res = await call({
      type: "invoice.paid",
      data: { object: { id: "in_1", metadata: {}, hosted_invoice_url: "https://inv" } },
    });
    expect(res.status).toBe(200);
    expect(mocks.setOrderInvoiceUrl).not.toHaveBeenCalled();
  });
});
