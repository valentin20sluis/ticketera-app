import { describe, expect, it } from "vitest";
import { canAcceptPayments } from "./can-accept-payments";

describe("canAcceptPayments", () => {
  it("is true with account and charges enabled", () => {
    expect(canAcceptPayments({ stripeAccountId: "acct_1", stripeChargesEnabled: true })).toBe(true);
  });

  it("is false without account", () => {
    expect(canAcceptPayments({ stripeAccountId: null, stripeChargesEnabled: true })).toBe(false);
  });

  it("is false with empty account", () => {
    expect(canAcceptPayments({ stripeAccountId: "", stripeChargesEnabled: true })).toBe(false);
  });

  it("is false with account and charges disabled", () => {
    expect(canAcceptPayments({ stripeAccountId: "acct_1", stripeChargesEnabled: false })).toBe(false);
  });

  it("is false with both absent", () => {
    expect(canAcceptPayments({ stripeAccountId: null, stripeChargesEnabled: null })).toBe(false);
    expect(canAcceptPayments({ stripeAccountId: undefined, stripeChargesEnabled: undefined })).toBe(false);
  });
});
