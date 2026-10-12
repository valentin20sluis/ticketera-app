import type { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createOnboardingLink: vi.fn(),
  syncConnectAccount: vi.fn(),
}));

vi.mock("@/lib/db/client", () => ({ getDb: async () => "db" }));
vi.mock("@/lib/stripe", () => ({ stripe: "stripe" }));
vi.mock("@/modules/users/services/current-user.service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/modules/payments/services/stripe-connect.service", () => ({
  createOnboardingLink: mocks.createOnboardingLink,
  syncConnectAccount: mocks.syncConnectAccount,
}));

import { GET } from "./route";

const call = (query: string) =>
  GET({ nextUrl: new URL(`https://app.test/api/stripe/connect/callback${query}`) } as unknown as NextRequest);

describe("stripe connect callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ id: "u1", stripeAccountId: "acct_1" });
  });

  it("refresh redirects to a new onboarding link", async () => {
    mocks.createOnboardingLink.mockResolvedValue("https://connect.stripe.com/new");
    const res = await call("?type=refresh");
    expect(res.headers.get("location")).toBe("https://connect.stripe.com/new");
    expect(mocks.requireRole).toHaveBeenCalledWith(["organizer"]);
  });

  it("refresh without a stored account goes to the panel", async () => {
    mocks.requireRole.mockResolvedValue({ id: "u1", stripeAccountId: null });
    const res = await call("?type=refresh");
    expect(res.headers.get("location")).toBe("https://app.test/organizador");
    expect(mocks.createOnboardingLink).not.toHaveBeenCalled();
  });

  it("return syncs and goes to the panel", async () => {
    const res = await call("?type=return");
    expect(mocks.syncConnectAccount).toHaveBeenCalledWith("db", "stripe", "acct_1");
    expect(res.headers.get("location")).toBe("https://app.test/organizador");
  });

  it("return still redirects when the sync fails", async () => {
    mocks.syncConnectAccount.mockRejectedValue(new Error("boom"));
    const res = await call("?type=return");
    expect(res.headers.get("location")).toBe("https://app.test/organizador");
  });

  it("refresh still goes to the panel when Stripe fails", async () => {
    mocks.createOnboardingLink.mockRejectedValue(new Error("boom"));
    const res = await call("?type=refresh");
    expect(res.headers.get("location")).toBe("https://app.test/organizador");
  });

  it.each(["?type=nope", ""])("invalid type %j does not call Stripe", async (q) => {
    const res = await call(q);
    expect(res.headers.get("location")).toBe("https://app.test/organizador");
    expect(mocks.syncConnectAccount).not.toHaveBeenCalled();
    expect(mocks.createOnboardingLink).not.toHaveBeenCalled();
  });

  it("propagates the requireRole redirect without calling Stripe", async () => {
    mocks.requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(call("?type=return")).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.syncConnectAccount).not.toHaveBeenCalled();
  });
});
