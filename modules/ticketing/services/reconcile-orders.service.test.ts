import { describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItemSeats,
  orders,
  tickets,
  users,
  venueZones,
  venues,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";
import { attachCheckoutSession, createPendingOrder, markOrderPaid } from "./order.service";
import {
  RECONCILE_BATCH_SIZE,
  RECONCILE_GRACE_MS,
  reconcilePendingOrders,
  type StripeLike,
} from "./reconcile-orders.service";

async function seed(capacity: number, layout?: { rows: number; columns: number }) {
  const db = await createTestDb();
  const [organizer] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "o@example.com", fullName: "O", role: "organizer" })
    .returning();
  const [customer] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "c@example.com", fullName: "C" })
    .returning();
  const [category] = await db
    .insert(eventCategories)
    .values({ name: "Música", iconKey: "music", colorKey: "indigo" })
    .returning();
  const [venue] = await db
    .insert(venues)
    .values({ organizerId: organizer.id, name: "V", address: "A", city: "Lima", lat: 0, lng: 0 })
    .returning();
  const [vz] = await db
    .insert(venueZones)
    .values({ venueId: venue.id, name: "Z", shapeX: 0, shapeY: 0, shapeWidth: 1, shapeHeight: 1, capacity, seatRows: layout?.rows ?? null, seatColumns: layout?.columns ?? null })
    .returning();
  const [event] = await db
    .insert(events)
    .values({
      organizerId: organizer.id,
      categoryId: category.id,
      venueId: venue.id,
      slug: `e-${crypto.randomUUID()}`,
      title: "E",
      description: "d",
      imageUrl: "https://picsum.photos/seed/e/800",
      doorsOpenTime: "19:00",
      showStartTime: "20:00",
      minimumAge: "18",
      admissionType: "General",
    })
    .returning();
  const [fn] = await db.insert(eventFunctions).values({ eventId: event.id, startsAt: new Date() }).returning();
  const [zone] = await db
    .insert(functionZones)
    .values({ functionId: fn.id, venueZoneId: vz.id, price: "10.00", currency: "PEN", capacity })
    .returning();
  return { db: db as unknown as Db, customerId: customer.id, zone };
}

type Ctx = Awaited<ReturnType<typeof seed>>;

// Pending order whose expires_at is `minutesAgo` in the past; optionally with a Stripe session.
async function makeOrder(ctx: Ctx, opts: { minutesAgo?: number; session?: string | null; seats?: boolean } = {}) {
  const { minutesAgo = 10, session = "cs_1", seats = false } = opts;
  const { order } = await createPendingOrder(ctx.db, {
    customerId: ctx.customerId,
    items: [
      {
        functionZoneId: ctx.zone.id,
        ...(seats ? { seats: [{ row: 1, number: 1 }, { row: 1, number: 2 }] } : { quantity: 2 }),
      },
    ],
  });
  await ctx.db
    .update(orders)
    .set({ expiresAt: new Date(Date.now() - minutesAgo * 60 * 1000) })
    .where(eq(orders.id, order.id));
  if (session) await attachCheckoutSession(ctx.db, order.id, session);
  return order.id;
}

const statusOf = async (db: Db, id: string) => (await db.select().from(orders).where(eq(orders.id, id)))[0].status;

function mockStripe(session: Record<string, unknown> | Error) {
  const retrieve = vi.fn(async (id?: string) => {
    void id;
    if (session instanceof Error) throw session;
    return session;
  });
  const expire = vi.fn(async () => ({}));
  return { retrieve, expire, stripe: { checkout: { sessions: { retrieve, expire } } } as unknown as StripeLike };
}

describe("reconcilePendingOrders", () => {
  it("marks paid with the payment intent and creates tickets (AC6)", async () => {
    const ctx = await seed(20);
    const id = await makeOrder(ctx);
    const { stripe } = mockStripe({ status: "complete", payment_status: "paid", payment_intent: "pi_1" });

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(summary).toMatchObject({ scanned: 1, paid: 1, errors: 0 });
    const [saved] = await ctx.db.select().from(orders).where(eq(orders.id, id));
    expect(saved.status).toBe("paid");
    expect(saved.stripePaymentIntentId).toBe("pi_1");
    expect(await ctx.db.select().from(tickets)).toHaveLength(2);
  });

  it("reads the payment intent when it comes as an object and creates seated tickets (AC6)", async () => {
    const ctx = await seed(9, { rows: 3, columns: 3 });
    await makeOrder(ctx, { seats: true });
    const { stripe } = mockStripe({ status: "complete", payment_status: "paid", payment_intent: { id: "pi_2" } });

    await reconcilePendingOrders(ctx.db, stripe);

    const rows = await ctx.db.select().from(tickets);
    expect(rows).toHaveLength(2);
    expect(rows.every((t) => t.orderItemSeatId !== null)).toBe(true);
  });

  it("does not duplicate tickets when the order is no longer pending (AC7)", async () => {
    const ctx = await seed(20);
    const id = await makeOrder(ctx);
    // webhook won the race after the candidate query: simulate with a stripe mock that pays first
    const { retrieve, stripe } = mockStripe({ status: "complete", payment_status: "paid", payment_intent: "pi_1" });
    retrieve.mockImplementationOnce(async () => {
      await markOrderPaid(ctx.db, { orderId: id, paymentIntentId: "pi_1" });
      return { status: "complete", payment_status: "paid", payment_intent: "pi_1" } as never;
    });

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(summary).toMatchObject({ paid: 0, alreadyProcessed: 1 });
    expect(await ctx.db.select().from(tickets)).toHaveLength(2);
  });

  it("expires the order and frees seats when the session expired (AC8)", async () => {
    const ctx = await seed(9, { rows: 3, columns: 3 });
    const id = await makeOrder(ctx, { seats: true });
    const { expire, stripe } = mockStripe({ status: "expired", payment_status: "unpaid" });

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(summary).toMatchObject({ expired: 1, closedOpen: 0 });
    expect(expire).not.toHaveBeenCalled();
    expect(await statusOf(ctx.db, id)).toBe("expired");
    expect(await ctx.db.select().from(orderItemSeats)).toHaveLength(0);
  });

  it("closes an open session and expires the order (AC9)", async () => {
    const ctx = await seed(9, { rows: 3, columns: 3 });
    const id = await makeOrder(ctx, { seats: true });
    const { expire, stripe } = mockStripe({ status: "open", payment_status: "unpaid" });

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(expire).toHaveBeenCalledWith("cs_1");
    expect(summary).toMatchObject({ closedOpen: 1, errors: 0 });
    expect(await statusOf(ctx.db, id)).toBe("expired");
    expect(await ctx.db.select().from(orderItemSeats)).toHaveLength(0);
  });

  it("keeps the order pending and counts an error when expire fails (AC9)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const ctx = await seed(20);
    const id = await makeOrder(ctx);
    const { expire, stripe } = mockStripe({ status: "open", payment_status: "unpaid" });
    expire.mockRejectedValueOnce(new Error("already paid"));

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(summary).toMatchObject({ closedOpen: 0, errors: 1 });
    expect(await statusOf(ctx.db, id)).toBe("pending");
  });

  it("expires an order without a session without calling Stripe (AC10)", async () => {
    const ctx = await seed(20);
    const id = await makeOrder(ctx, { session: null });
    const { retrieve, stripe } = mockStripe({});

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(retrieve).not.toHaveBeenCalled();
    expect(summary.expired).toBe(1);
    expect(await statusOf(ctx.db, id)).toBe("expired");
  });

  it("leaves an order with async payment in progress untouched (AC11)", async () => {
    const ctx = await seed(20);
    const id = await makeOrder(ctx);
    const { stripe } = mockStripe({ status: "complete", payment_status: "unpaid", payment_intent: "pi_1" });

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(summary).toMatchObject({ skipped: 1, paid: 0, expired: 0 });
    expect(await statusOf(ctx.db, id)).toBe("pending");
  });

  it("ignores fresh, within-grace and non-pending orders (AC4)", async () => {
    const ctx = await seed(50);
    const fresh = await makeOrder(ctx, { minutesAgo: -10 });
    const inGrace = await makeOrder(ctx, { minutesAgo: RECONCILE_GRACE_MS / 60000 / 2 });
    const paid = await makeOrder(ctx);
    await markOrderPaid(ctx.db, { orderId: paid, paymentIntentId: "pi_x" });
    const { retrieve, stripe } = mockStripe({ status: "open", payment_status: "unpaid" });

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(summary.scanned).toBe(0);
    expect(retrieve).not.toHaveBeenCalled();
    expect(await statusOf(ctx.db, fresh)).toBe("pending");
    expect(await statusOf(ctx.db, inGrace)).toBe("pending");
    expect(await statusOf(ctx.db, paid)).toBe("paid");
  });

  it("processes at most the batch size, oldest first (AC5)", async () => {
    const ctx = await seed(RECONCILE_BATCH_SIZE + 10);
    const ids: string[] = [];
    // ids[0] is the newest, ids[last] the oldest
    for (let i = 0; i <= RECONCILE_BATCH_SIZE; i++) {
      ids.push(await makeOrder(ctx, { session: null, minutesAgo: 10 + i }));
    }
    const { stripe } = mockStripe({});

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(summary).toMatchObject({ scanned: RECONCILE_BATCH_SIZE, expired: RECONCILE_BATCH_SIZE });
    expect(await statusOf(ctx.db, ids[0])).toBe("pending");
    expect(await statusOf(ctx.db, ids[ids.length - 1])).toBe("expired");
  }, 60_000);

  it("isolates a failure per order and keeps going (AC12)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const ctx = await seed(20);
    const bad = await makeOrder(ctx, { session: "cs_bad", minutesAgo: 30 });
    const good = await makeOrder(ctx, { session: "cs_good", minutesAgo: 20 });
    const { retrieve, stripe } = mockStripe({ status: "expired", payment_status: "unpaid" });
    retrieve.mockImplementation(async (id?: string) => {
      if (id === "cs_bad") throw new Error("stripe down");
      return { status: "expired", payment_status: "unpaid" } as never;
    });

    const summary = await reconcilePendingOrders(ctx.db, stripe);

    expect(summary).toMatchObject({ scanned: 2, errors: 1, expired: 1 });
    expect(error).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ orderId: bad }));
    expect(await statusOf(ctx.db, bad)).toBe("pending");
    expect(await statusOf(ctx.db, good)).toBe("expired");
  });

  it("is idempotent across runs (AC13)", async () => {
    const ctx = await seed(20);
    await makeOrder(ctx, { session: "cs_a" });
    const { stripe } = mockStripe({ status: "complete", payment_status: "paid", payment_intent: "pi_1" });

    await reconcilePendingOrders(ctx.db, stripe);
    const second = await reconcilePendingOrders(ctx.db, stripe);

    expect(second.scanned).toBe(0);
    expect(await ctx.db.select().from(tickets)).toHaveLength(2);
  });
});
