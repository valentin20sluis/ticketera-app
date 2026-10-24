import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { seedEventCatalog } from "@/lib/db/seed/event-catalog";
import { createTestDb } from "@/lib/db/test-helpers";
import { eventFunctions, events, functionZones, orderItemSeats, orderItems, orders, users, venueZones } from "@/lib/db/schema";
import { MOCK_EVENTS } from "@/modules/events/data/events.mock";
import { getCheckoutEventBySlug } from "./get-event-checkout.service";
import { createPendingOrder } from "./order.service";

type TestDb = Awaited<ReturnType<typeof createTestDb>>;

const SLUG = MOCK_EVENTS[0].slug;
const DAY = 24 * 60 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function setup() {
  const db = await createTestDb();
  const [organizer] = await db
    .insert(users)
    .values({ clerkUserId: "clerk_org", email: "o@example.com", fullName: "O", role: "organizer" })
    .returning();
  await seedEventCatalog(db, organizer.id);
  const [event] = await db.select().from(events).where(eq(events.slug, SLUG));
  const [fn] = await db.select().from(eventFunctions).where(eq(eventFunctions.eventId, event.id));
  await db
    .update(eventFunctions)
    .set({ startsAt: new Date(Date.now() + 10 * DAY) })
    .where(eq(eventFunctions.id, fn.id));
  const [updated] = await db.select().from(eventFunctions).where(eq(eventFunctions.id, fn.id));
  return { db, event, fn: updated };
}

async function placeOrder(
  db: TestDb,
  functionZoneId: string,
  quantity: number,
  status: "pending" | "paid",
  expiresAt: Date,
) {
  const [customer] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "c@example.com", fullName: "C", role: "customer" })
    .returning();
  const [order] = await db
    .insert(orders)
    .values({ customerId: customer.id, status, totalAmount: "10.00", currency: "PEN", expiresAt })
    .returning();
  await db.insert(orderItems).values({ orderId: order.id, functionZoneId, quantity, unitPrice: "10.00" });
}

describe("getCheckoutEventBySlug", () => {
  it("returns null for an unknown slug", async () => {
    const { db } = await setup();
    expect(await getCheckoutEventBySlug(db, "no-existe")).toBeNull();
  });

  it("returns null when the event is not published", async () => {
    const { db, event } = await setup();
    await db.update(events).set({ status: "draft" }).where(eq(events.id, event.id));
    expect(await getCheckoutEventBySlug(db, SLUG)).toBeNull();
  });

  it("returns null when there is no upcoming function", async () => {
    const { db, fn } = await setup();
    await db
      .update(eventFunctions)
      .set({ startsAt: new Date(Date.now() - DAY) })
      .where(eq(eventFunctions.id, fn.id));
    expect(await getCheckoutEventBySlug(db, SLUG)).toBeNull();
  });

  it("returns the event and zones keyed by function_zones uuid", async () => {
    const { db, fn } = await setup();
    const result = await getCheckoutEventBySlug(db, SLUG);
    const rows = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id));

    expect(result?.event).toMatchObject({ slug: SLUG, title: MOCK_EVENTS[0].title, venueName: MOCK_EVENTS[0].venueName });
    expect(result?.event.startDate).toBe(fn.startsAt.toISOString());
    expect(result?.zones).toHaveLength(rows.length);
    for (const zone of result?.zones ?? []) {
      const row = rows.find((r) => r.id === zone.id);
      expect(zone.id).toMatch(UUID);
      expect(row).toBeDefined();
      expect(zone.price).toBe(Number(row?.price));
      expect(zone.capacity).toBe(row?.capacity);
      expect(zone.available).toBe(row?.capacity);
      expect(Object.keys(zone.shape).sort()).toEqual(["height", "width", "x", "y"]);
    }
  });

  it("discounts paid and live pending orders but not expired pending ones", async () => {
    const { db, fn } = await setup();
    const [fz] = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id));
    await placeOrder(db, fz.id, 3, "paid", new Date());
    await placeOrder(db, fz.id, 2, "pending", new Date(Date.now() + 10 * 60 * 1000));
    await placeOrder(db, fz.id, 5, "pending", new Date(Date.now() - 60 * 1000));

    const result = await getCheckoutEventBySlug(db, SLUG);
    expect(result?.zones.find((z) => z.id === fz.id)?.available).toBe(fz.capacity - 5);
  });

  it("attaches seatLayout and takenSeats only to numbered zones (AC9)", async () => {
    const { db, fn } = await setup();
    const [fz, standing] = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id));
    await db
      .update(venueZones)
      .set({ seatRows: 2, seatColumns: 5, capacity: 10 })
      .where(eq(venueZones.id, fz.venueZoneId));
    const [customer] = await db
      .insert(users)
      .values({ clerkUserId: "clerk_seat", email: "s@example.com", fullName: "S", role: "customer" })
      .returning();
    const [order] = await db
      .insert(orders)
      .values({
        customerId: customer.id,
        status: "pending",
        totalAmount: "10.00",
        currency: "PEN",
        expiresAt: new Date(Date.now() + 600_000),
      })
      .returning();
    const [item] = await db
      .insert(orderItems)
      .values({ orderId: order.id, functionZoneId: fz.id, quantity: 1, unitPrice: "10.00" })
      .returning();
    await db.insert(orderItemSeats).values({ orderItemId: item.id, functionZoneId: fz.id, seatRow: 2, seatNumber: 4 });

    const result = await getCheckoutEventBySlug(db, SLUG);
    const numbered = result?.zones.find((z) => z.id === fz.id);
    expect(numbered?.seatLayout).toEqual({ rows: 2, columns: 5 });
    expect(numbered?.takenSeats).toEqual([{ row: 2, number: 4 }]);
    const plain = result?.zones.find((z) => z.id === standing.id);
    expect(plain?.seatLayout).toBeUndefined();
    expect(plain?.takenSeats).toBeUndefined();
  });

  it("picks the nearest upcoming function", async () => {
    const { db, event, fn } = await setup();
    const sooner = new Date(Date.now() + 2 * DAY);
    const [later] = await db
      .insert(eventFunctions)
      .values({ eventId: event.id, startsAt: new Date(Date.now() + 30 * DAY) })
      .returning();
    await db.update(eventFunctions).set({ startsAt: sooner }).where(eq(eventFunctions.id, fn.id));
    await db.insert(functionZones).values({
      functionId: later.id,
      venueZoneId: (await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id)))[0].venueZoneId,
      price: "1.00",
      currency: "PEN",
      capacity: 1,
    });

    const result = await getCheckoutEventBySlug(db, SLUG);
    expect(result?.event.startDate).toBe(sooner.toISOString());
    expect(result?.zones.every((z) => z.capacity !== 1)).toBe(true);
  });

  describe("multiple functions", () => {
    async function withSecondFunction() {
      const { db, event, fn } = await setup();
      const [other] = await db
        .insert(eventFunctions)
        .values({ eventId: event.id, startsAt: new Date(Date.now() + 30 * DAY) })
        .returning();
      const [base] = await db.select().from(functionZones).where(eq(functionZones.functionId, fn.id));
      const [otherZone] = await db
        .insert(functionZones)
        .values({ functionId: other.id, venueZoneId: base.venueZoneId, price: "1.00", currency: "PEN", capacity: 7 })
        .returning();
      return { db, event, fn, other, base, otherZone };
    }

    it("serves the requested function and lists all upcoming ones in order", async () => {
      const { db, fn, other, otherZone } = await withSecondFunction();
      const result = await getCheckoutEventBySlug(db, SLUG, other.id);

      expect(result?.selectedFunctionId).toBe(other.id);
      expect(result?.event.startDate).toBe(other.startsAt.toISOString());
      expect(result?.zones.map((z) => z.id)).toEqual([otherZone.id]);
      expect(result?.functions.map((f) => f.id)).toEqual([fn.id, other.id]);
    });

    it("falls back to the nearest for invalid, past or foreign ids", async () => {
      const { db, event, fn } = await withSecondFunction();
      const [past] = await db
        .insert(eventFunctions)
        .values({ eventId: event.id, startsAt: new Date(Date.now() - DAY) })
        .returning();
      const [foreign] = await db
        .select({ id: eventFunctions.id })
        .from(eventFunctions)
        .innerJoin(events, eq(events.id, eventFunctions.eventId))
        .where(eq(events.slug, MOCK_EVENTS[1].slug));

      for (const id of ["nope", past.id, foreign.id, crypto.randomUUID()]) {
        const result = await getCheckoutEventBySlug(db, SLUG, id);
        expect(result?.selectedFunctionId).toBe(fn.id);
      }
    });

    it("an order on function B does not consume stock of function A", async () => {
      const { db, fn, other, base, otherZone } = await withSecondFunction();
      const [customer] = await db
        .insert(users)
        .values({ clerkUserId: "clerk_buyer", email: "b@example.com", fullName: "B", role: "customer" })
        .returning();
      const { order } = await createPendingOrder(db, {
        customerId: customer.id,
        items: [{ functionZoneId: otherZone.id, quantity: 2 }],
      });

      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
      expect(items.map((i) => i.functionZoneId)).toEqual([otherZone.id]);

      const a = await getCheckoutEventBySlug(db, SLUG, fn.id);
      const b = await getCheckoutEventBySlug(db, SLUG, other.id);
      expect(a?.zones.find((z) => z.id === base.id)?.available).toBe(base.capacity);
      expect(b?.zones[0].available).toBe(otherZone.capacity - 2);
    });
  });
});
