import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import { users } from "@/lib/db/schema";
import {
  ConnectActionError,
  createOnboardingLink,
  syncConnectAccount,
  type ConnectStripe,
} from "./stripe-connect.service";

const urls = { refreshUrl: "https://app.test/refresh", returnUrl: "https://app.test/return" };

const api = {
  create: vi.fn(),
  retrieve: vi.fn(),
  linkCreate: vi.fn(),
};
const stripe = {
  v2: { core: { accounts: { create: api.create, retrieve: api.retrieve }, accountLinks: { create: api.linkCreate } } },
} as unknown as ConnectStripe;

async function setup() {
  const db = await createTestDb();
  const [organizer, other] = await db
    .insert(users)
    .values([
      { clerkUserId: "c_org", email: "org@example.com", fullName: "Org Ana", role: "organizer" },
      { clerkUserId: "c_oth", email: "oth@example.com", fullName: "Otro", role: "organizer", stripeAccountId: "acct_other" },
    ])
    .returning();
  const row = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];
  return { db, organizer, other, row };
}

beforeEach(() => {
  vi.stubEnv("STRIPE_CONNECT_ACCOUNT_COUNTRY", "us");
  api.create.mockReset().mockResolvedValue({ id: "acct_new" });
  api.retrieve.mockReset();
  api.linkCreate.mockReset().mockResolvedValue({ url: "https://connect.stripe.test/onboard" });
});

describe("createOnboardingLink", () => {
  it("creates the account once, stores it and returns the onboarding url", async () => {
    const { db, organizer, row } = await setup();

    const url = await createOnboardingLink(db, stripe, organizer, urls);

    expect(url).toBe("https://connect.stripe.test/onboard");
    expect(api.create).toHaveBeenCalledTimes(1);
    expect(api.create).toHaveBeenCalledWith(
      {
        contact_email: "org@example.com",
        display_name: "Org Ana",
        dashboard: "express",
        identity: { country: "us" },
        defaults: { responsibilities: { fees_collector: "application", losses_collector: "application" } },
        configuration: { recipient: { capabilities: { stripe_balance: { stripe_transfers: { requested: true } } } } },
      },
      { idempotencyKey: `connect-account-${organizer.id}` },
    );
    expect(api.linkCreate).toHaveBeenCalledWith({
      account: "acct_new",
      use_case: {
        type: "account_onboarding",
        account_onboarding: { refresh_url: urls.refreshUrl, return_url: urls.returnUrl },
      },
    });
    expect((await row(organizer.id)).stripeAccountId).toBe("acct_new");
  });

  it("reuses the stored account and only creates a new link", async () => {
    const { db, other } = await setup();

    await createOnboardingLink(db, stripe, other, urls);

    expect(api.create).not.toHaveBeenCalled();
    expect(api.linkCreate).toHaveBeenCalledWith(expect.objectContaining({ account: "acct_other" }));
  });

  it("keeps the account saved by a concurrent run (conditional save)", async () => {
    const { db, organizer, row } = await setup();
    api.create.mockImplementation(async () => {
      await db.update(users).set({ stripeAccountId: "acct_winner" }).where(eq(users.id, organizer.id));
      return { id: "acct_new" };
    });

    await createOnboardingLink(db, stripe, organizer, urls);

    expect((await row(organizer.id)).stripeAccountId).toBe("acct_winner");
    expect(api.linkCreate).toHaveBeenCalledWith(expect.objectContaining({ account: "acct_winner" }));
  });

  it("writes nothing and hides details when Stripe fails", async () => {
    const { db, organizer, row } = await setup();
    api.create.mockRejectedValue(new Error("rk_live secret detail"));

    const error = await createOnboardingLink(db, stripe, organizer, urls).catch((e) => e);

    expect(error).toBeInstanceOf(ConnectActionError);
    expect(error.message).toBe("No se pudo conectar con Stripe");
    expect(api.linkCreate).not.toHaveBeenCalled();
    expect((await row(organizer.id)).stripeAccountId).toBeNull();
  });

  it("retries with the same idempotency key after a failed save", async () => {
    const { db, organizer } = await setup();
    await db.update(users).set({ email: "x@example.com" }).where(eq(users.id, organizer.id));
    api.linkCreate.mockRejectedValueOnce(new Error("boom"));

    await expect(createOnboardingLink(db, stripe, organizer, urls)).rejects.toBeInstanceOf(ConnectActionError);
    await createOnboardingLink(db, stripe, { ...organizer, stripeAccountId: null }, urls);

    const keys = api.create.mock.calls.map((call) => call[1]);
    expect(keys[1]).toEqual(keys[0]);
  });
});

describe("syncConnectAccount", () => {
  const account = (transfers: string, payouts: string) => ({
    configuration: {
      recipient: {
        capabilities: { stripe_balance: { stripe_transfers: { status: transfers }, payouts: { status: payouts } } },
      },
    },
  });

  it("stores the flags derived from the current Stripe state, idempotently", async () => {
    const { db, other, row } = await setup();
    api.retrieve.mockResolvedValue(account("active", "pending"));

    expect(await syncConnectAccount(db, stripe, "acct_other")).toEqual({ updated: true });
    await syncConnectAccount(db, stripe, "acct_other");

    expect(api.retrieve).toHaveBeenCalledWith("acct_other", { include: ["configuration.recipient"] });
    expect(await row(other.id)).toMatchObject({ stripeChargesEnabled: true, stripePayoutsEnabled: false });

    api.retrieve.mockResolvedValue(account("active", "active"));
    await syncConnectAccount(db, stripe, "acct_other");
    expect(await row(other.id)).toMatchObject({ stripeChargesEnabled: true, stripePayoutsEnabled: true });
  });

  it("is a no-op for an unknown account", async () => {
    const { db, organizer, other, row } = await setup();

    expect(await syncConnectAccount(db, stripe, "acct_unknown")).toEqual({ updated: false });

    expect(api.retrieve).not.toHaveBeenCalled();
    expect(await row(other.id)).toMatchObject({ stripeChargesEnabled: false, stripePayoutsEnabled: false });
    expect((await row(organizer.id)).stripeChargesEnabled).toBe(false);
  });

  it("propagates Stripe errors so the webhook can be retried", async () => {
    const { db } = await setup();
    api.retrieve.mockRejectedValue(new Error("down"));
    await expect(syncConnectAccount(db, stripe, "acct_other")).rejects.toThrow("down");
  });
});
