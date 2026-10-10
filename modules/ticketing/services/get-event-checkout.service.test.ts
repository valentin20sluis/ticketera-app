import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { seedEventCatalog } from "@/lib/db/seed/event-catalog";
import { createTestDb } from "@/lib/db/test-helpers";
import { eventFunctions, events, functionZones, orderItems, orders, users } from "@/lib/db/schema";
import { MOCK_EVENTS } from "@/modules/events/data/events.mock";
import { getCheckoutEventBySlug } from "./get-event-checkout.service";

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
});
