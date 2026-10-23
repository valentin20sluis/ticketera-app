import { and, eq, isNull } from "drizzle-orm";
import type StripeClient from "stripe";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { CurrentUser } from "@/modules/users/services/current-user.service";
import { deriveFlagsFromAccount } from "@/modules/payments/utils/connect-status";

// Only this message is safe to show to the user; Stripe/DB details stay in `cause`.
export class ConnectActionError extends Error {}

const GENERIC_ERROR = "No se pudo conectar con Stripe";

export type ConnectStripe = {
  v2: {
    core: {
      accounts: Pick<StripeClient["v2"]["core"]["accounts"], "create" | "retrieve">;
      accountLinks: Pick<StripeClient["v2"]["core"]["accountLinks"], "create">;
    };
  };
};

type ConnectUser = Pick<CurrentUser, "id" | "email" | "fullName" | "stripeAccountId">;

async function createAccountForUser(db: Db, stripe: ConnectStripe, user: ConnectUser) {
  // Stable key per user: a retry after a failed DB save gets the same account back.
  // ponytail: Stripe keeps keys ~24h; a retry after that window could create a second account.
  const account = await stripe.v2.core.accounts.create(
    {
      contact_email: user.email,
      display_name: user.fullName,
      dashboard: "express",
      identity: { country: process.env.STRIPE_CONNECT_ACCOUNT_COUNTRY },
      defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
      configuration: {
        recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } },
      },
    },
    { idempotencyKey: `connect-account-${user.id}` },
  );

  const [saved] = await db
    .update(users)
    .set({ stripeAccountId: account.id, updatedAt: new Date() })
    .where(and(eq(users.id, user.id), isNull(users.stripeAccountId)))
    .returning();
  if (saved) return account.id;

  // Another run saved first: use the stored account.
  const [current] = await db.select({ stripeAccountId: users.stripeAccountId }).from(users).where(eq(users.id, user.id));
  if (!current?.stripeAccountId) throw new Error("Connect account was not stored");
  return current.stripeAccountId;
}

/** Creates the connected account once (if missing) and returns a fresh onboarding URL. */
export async function createOnboardingLink(
  db: Db,
  stripe: ConnectStripe,
  user: ConnectUser,
  urls: { refreshUrl: string; returnUrl: string },
) {
  try {
    const accountId = user.stripeAccountId ?? (await createAccountForUser(db, stripe, user));
    const link = await stripe.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: { refresh_url: urls.refreshUrl, return_url: urls.returnUrl },
      },
    });
    return link.url;
  } catch (error) {
    throw new ConnectActionError(GENERIC_ERROR, { cause: error });
  }
}

/** Absolute sync: reads the current account state from Stripe, so repeats and reordering are harmless. */
export async function syncConnectAccount(db: Db, stripe: ConnectStripe, accountId: string) {
  const [owner] = await db.select({ id: users.id }).from(users).where(eq(users.stripeAccountId, accountId));
  if (!owner) return { updated: false };

  const account = await stripe.v2.core.accounts.retrieve(accountId, { include: ["configuration.recipient"] });
  const { chargesEnabled, payoutsEnabled } = deriveFlagsFromAccount(account);
  await db
    .update(users)
    .set({ stripeChargesEnabled: chargesEnabled, stripePayoutsEnabled: payoutsEnabled, updatedAt: new Date() })
    .where(eq(users.stripeAccountId, accountId));
  return { updated: true };
}
