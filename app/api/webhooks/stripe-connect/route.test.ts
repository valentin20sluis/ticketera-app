import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  parseEventNotification: vi.fn(),
  syncConnectAccount: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  stripe: { parseEventNotification: mocks.parseEventNotification },
}));
vi.mock("@/lib/db/client", () => ({ getDb: async () => "db" }));
vi.mock("@/modules/payments/services/stripe-connect.service", () => ({
  syncConnectAccount: mocks.syncConnectAccount,
}));

import { POST } from "./route";
import { stripe } from "@/lib/stripe";

const TYPE = "v2.core.account[configuration.recipient].capability_status_updated";

const call = (opts: { signature?: string | null; event?: unknown } = {}) => {
  const { signature = "sig", event } = opts;
  if (event) mocks.parseEventNotification.mockReturnValue(event);
  const headers = new Headers();
  if (signature) headers.set("stripe-signature", signature);
  return POST({ headers, text: async () => '{"raw":true}' } as unknown as NextRequest);
};

describe("stripe connect webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.syncConnectAccount.mockResolvedValue({ updated: true });
  });

  it("returns 400 without signature header", async () => {
    expect((await call({ signature: null })).status).toBe(400);
    expect(mocks.parseEventNotification).not.toHaveBeenCalled();
    expect(mocks.syncConnectAccount).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid signature", async () => {
    mocks.parseEventNotification.mockImplementation(() => {
      throw new Error("bad");
    });
    expect((await call()).status).toBe(400);
    expect(mocks.syncConnectAccount).not.toHaveBeenCalled();
  });

  it("verifies the signature against the raw body", async () => {
    await call({ event: { type: "other" } });
    expect(mocks.parseEventNotification).toHaveBeenCalledWith('{"raw":true}', "sig", process.env.STRIPE_CONNECT_WEBHOOK_SECRET);
  });

  it("syncs the account on capability_status_updated", async () => {
    const res = await call({ event: { type: TYPE, related_object: { id: "acct_1" } } });
    expect(res.status).toBe(200);
    expect(mocks.syncConnectAccount).toHaveBeenCalledWith("db", stripe, "acct_1");
  });

  it("is idempotent: the same event twice syncs twice from absolute state", async () => {
    const event = { type: TYPE, related_object: { id: "acct_1" } };
    expect((await call({ event })).status).toBe(200);
    expect((await call({ event })).status).toBe(200);
    expect(mocks.syncConnectAccount).toHaveBeenCalledTimes(2);
  });

  it("responds 200 when the account has no user (service no-op)", async () => {
    mocks.syncConnectAccount.mockResolvedValue({ updated: false });
    const res = await call({ event: { type: TYPE, related_object: { id: "acct_x" } } });
    expect(res.status).toBe(200);
  });

  it("responds 200 and does not sync on unhandled types", async () => {
    const res = await call({ event: { type: "v2.core.account[requirements].updated", related_object: { id: "acct_1" } } });
    expect(res.status).toBe(200);
    expect(mocks.syncConnectAccount).not.toHaveBeenCalled();
  });

  it("propagates unexpected errors so Stripe retries", async () => {
    mocks.syncConnectAccount.mockRejectedValue(new Error("db down"));
    await expect(call({ event: { type: TYPE, related_object: { id: "acct_1" } } })).rejects.toThrow("db down");
  });
});
