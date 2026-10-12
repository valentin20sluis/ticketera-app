import type { CurrentUser } from "@/modules/users/services/current-user.service";

export type ConnectState = "not_connected" | "pending" | "active";

export function deriveConnectState(
  user: Pick<CurrentUser, "stripeAccountId" | "stripeChargesEnabled" | "stripePayoutsEnabled">,
): ConnectState {
  if (!user.stripeAccountId) return "not_connected";
  return user.stripeChargesEnabled && user.stripePayoutsEnabled ? "active" : "pending";
}

type Capability = { status?: string } | null;

// Structural subset of a v2 Account (retrieved with include: ["configuration.recipient"]).
export type ConnectAccountCapabilities = {
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: { stripe_transfers?: Capability; payouts?: Capability } | null;
      } | null;
    } | null;
  } | null;
};

export function deriveFlagsFromAccount(account: ConnectAccountCapabilities) {
  const balance = account.configuration?.recipient?.capabilities?.stripe_balance;
  return {
    chargesEnabled: balance?.stripe_transfers?.status === "active",
    payoutsEnabled: balance?.payouts?.status === "active",
  };
}
