import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireRole: vi.fn(),
  createOnboardingLink: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/db/client", () => ({ getDb: async () => "db" }));
vi.mock("@/lib/stripe", () => ({ stripe: "stripe" }));
vi.mock("@/modules/users/services/current-user.service", () => ({ requireRole: mocks.requireRole }));
vi.mock("@/modules/payments/services/stripe-connect.service", () => ({
  createOnboardingLink: mocks.createOnboardingLink,
  ConnectActionError: class ConnectActionError extends Error {},
}));

import { ConnectActionError } from "@/modules/payments/services/stripe-connect.service";
import { connectStripeAction } from "./connect.actions";

const user = { id: "u1", stripeAccountId: null };

describe("connectStripeAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue(user);
    mocks.headers.mockResolvedValue(new Headers({ origin: "https://app.test", host: "evil.com" }));
  });

  it("creates the link with origin-based urls and redirects to it", async () => {
    mocks.createOnboardingLink.mockResolvedValue("https://connect.stripe.com/x");
    await expect(connectStripeAction()).rejects.toThrow("REDIRECT:https://connect.stripe.com/x");
    expect(mocks.requireRole).toHaveBeenCalledWith(["organizer"]);
    expect(mocks.createOnboardingLink).toHaveBeenCalledWith("db", "stripe", user, {
      refreshUrl: "https://app.test/api/stripe/connect/callback?type=refresh",
      returnUrl: "https://app.test/api/stripe/connect/callback?type=return",
    });
  });

  it("passes a user that already has an account to the service (it reuses it)", async () => {
    const existing = { id: "u1", stripeAccountId: "acct_1" };
    mocks.requireRole.mockResolvedValue(existing);
    mocks.createOnboardingLink.mockResolvedValue("https://connect.stripe.com/y");
    await expect(connectStripeAction()).rejects.toThrow("REDIRECT:");
    expect(mocks.createOnboardingLink.mock.calls[0][2]).toBe(existing);
  });

  it("does not call Stripe when requireRole redirects", async () => {
    mocks.requireRole.mockRejectedValue(new Error("REDIRECT:/"));
    await expect(connectStripeAction()).rejects.toThrow("REDIRECT:/");
    expect(mocks.createOnboardingLink).not.toHaveBeenCalled();
  });

  it("returns the safe message from ConnectActionError", async () => {
    mocks.createOnboardingLink.mockRejectedValue(new ConnectActionError("No se pudo conectar con Stripe"));
    expect(await connectStripeAction()).toEqual({ error: "No se pudo conectar con Stripe" });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("hides unexpected error details", async () => {
    mocks.createOnboardingLink.mockRejectedValue(new Error("sk_live secret leak"));
    expect(await connectStripeAction()).toEqual({ error: "No se pudo conectar con Stripe" });
  });
});
