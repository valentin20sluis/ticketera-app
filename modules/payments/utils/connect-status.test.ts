import { describe, expect, it } from "vitest";
import { deriveConnectState, deriveFlagsFromAccount } from "./connect-status";

const user = (stripeAccountId: string | null, c: boolean, p: boolean) => ({
  stripeAccountId,
  stripeChargesEnabled: c,
  stripePayoutsEnabled: p,
});

describe("deriveConnectState", () => {
  it.each([
    [null, false, false, "not_connected"],
    [null, true, true, "not_connected"],
    ["acct_1", false, false, "pending"],
    ["acct_1", true, false, "pending"],
    ["acct_1", false, true, "pending"],
    ["acct_1", true, true, "active"],
  ] as const)("%s charges=%s payouts=%s -> %s", (id, c, p, expected) => {
    expect(deriveConnectState(user(id, c, p))).toBe(expected);
  });
});

const account = (transfers?: string, payouts?: string) => ({
  configuration: {
    recipient: {
      capabilities: {
        stripe_balance: {
          ...(transfers && { stripe_transfers: { status: transfers } }),
          ...(payouts && { payouts: { status: payouts } }),
        },
      },
    },
  },
});

describe("deriveFlagsFromAccount", () => {
  it("enables each flag only when its capability is active", () => {
    expect(deriveFlagsFromAccount(account("active", "active"))).toEqual({ chargesEnabled: true, payoutsEnabled: true });
    expect(deriveFlagsFromAccount(account("active", "pending"))).toEqual({ chargesEnabled: true, payoutsEnabled: false });
    expect(deriveFlagsFromAccount(account("restricted", "active"))).toEqual({ chargesEnabled: false, payoutsEnabled: true });
  });

  it.each(["pending", "restricted", "unsupported", "rejected"])("treats %s as disabled", (status) => {
    expect(deriveFlagsFromAccount(account(status, status))).toEqual({ chargesEnabled: false, payoutsEnabled: false });
  });

  it("never throws on missing capabilities", () => {
    const off = { chargesEnabled: false, payoutsEnabled: false };
    expect(deriveFlagsFromAccount({})).toEqual(off);
    expect(deriveFlagsFromAccount({ configuration: null })).toEqual(off);
    expect(deriveFlagsFromAccount({ configuration: { recipient: null } })).toEqual(off);
    expect(deriveFlagsFromAccount(account())).toEqual(off);
  });
});
