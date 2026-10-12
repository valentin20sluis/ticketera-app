import { describe, expect, it } from "vitest";
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
import { getZoneAvailability } from "./get-zone-availability.service";
import {
  InsufficientStockError,
  InvalidOrderError,
  SeatTakenError,
  attachCheckoutSession,
  createPendingOrder,
  markOrderExpired,
  markOrderPaid,
  setOrderInvoiceUrl,
} from "./order.service";

async function seed(capacity: number, price = "25.50", layout?: { rows: number; columns: number }) {
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
    .values({ functionId: fn.id, venueZoneId: vz.id, price, currency: "PEN", capacity })
    .returning();
  return { db: db as unknown as Db, customerId: customer.id, zone };
}

describe("order.service", () => {
  it("creates a pending order pricing from the DB and reserving stock", async () => {
    const { db, customerId, zone } = await seed(10);
    const { order, items } = await createPendingOrder(db, {
      customerId,
      items: [{ functionZoneId: zone.id, quantity: 2 }],
    });

    expect(order.status).toBe("pending");
    expect(order.totalAmount).toBe("51.00");
    expect(order.currency).toBe("PEN");
    expect(order.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(items[0].unitPrice).toBe("25.50");
    expect(await getZoneAvailability(db, zone.id)).toBe(8);
  });

  it("throws InsufficientStockError and creates nothing when stock is short", async () => {
    const { db, customerId, zone } = await seed(3);
    await expect(
      createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, quantity: 4 }] }),
    ).rejects.toBeInstanceOf(InsufficientStockError);
    expect(await db.select().from(orders)).toHaveLength(0);
  });

  it("markOrderPaid is idempotent and creates one ticket per unit", async () => {
    const { db, customerId, zone } = await seed(10);
    const { order } = await createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, quantity: 3 }] });

    expect(await markOrderPaid(db, { orderId: order.id, paymentIntentId: "pi_1" })).toEqual({ updated: true });
    expect(await markOrderPaid(db, { orderId: order.id, paymentIntentId: "pi_1" })).toEqual({ updated: false });

    const rows = await db.select().from(tickets);
    expect(rows).toHaveLength(3);
    expect(new Set(rows.map((t) => t.qrCode)).size).toBe(3);
    const [saved] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(saved.status).toBe("paid");
    expect(saved.stripePaymentIntentId).toBe("pi_1");
  });

  it("markOrderExpired only affects pending orders", async () => {
    const { db, customerId, zone } = await seed(10);
    const a = await createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, quantity: 1 }] });
    const b = await createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, quantity: 1 }] });
    await markOrderPaid(db, { orderId: b.order.id, paymentIntentId: "pi_2" });

    await markOrderExpired(db, a.order.id);
    await markOrderExpired(db, b.order.id);

    const [sa] = await db.select().from(orders).where(eq(orders.id, a.order.id));
    const [sb] = await db.select().from(orders).where(eq(orders.id, b.order.id));
    expect(sa.status).toBe("expired");
    expect(sb.status).toBe("paid");
  });

  it("stores the checkout session and invoice url", async () => {
    const { db, customerId, zone } = await seed(10);
    const { order } = await createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, quantity: 1 }] });
    await attachCheckoutSession(db, order.id, "cs_1");
    await setOrderInvoiceUrl(db, order.id, "https://invoice.example/1");

    const [saved] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(saved.stripeCheckoutSessionId).toBe("cs_1");
    expect(saved.invoiceUrl).toBe("https://invoice.example/1");
  });

  describe("numbered zones", () => {
    const layout = { rows: 4, columns: 5 };
    const seatsOf = async (db: Db) =>
      (await db.select().from(orderItemSeats)).map((s) => `${s.seatRow}:${s.seatNumber}`).sort();

    it("creates order and seat rows pricing per seat (AC3)", async () => {
      const { db, customerId, zone } = await seed(20, "10.00", layout);
      const { order, items } = await createPendingOrder(db, {
        customerId,
        items: [{ functionZoneId: zone.id, seats: [{ row: 1, number: 1 }, { row: 2, number: 3 }] }],
      });
      expect(items[0].quantity).toBe(2);
      expect(order.totalAmount).toBe("20.00");
      expect(await seatsOf(db)).toEqual(["1:1", "2:3"]);
    });

    it("concurrent same seat: exactly one wins and nothing is left behind (AC4)", async () => {
      const { db, customerId, zone } = await seed(20, "10.00", layout);
      const req = () =>
        createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, seats: [{ row: 1, number: 1 }] }] });
      const results = await Promise.allSettled([req(), req()]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      const failed = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
      expect(failed.reason).toBeInstanceOf(SeatTakenError);
      expect(await db.select().from(orders)).toHaveLength(1);
      expect(await seatsOf(db)).toEqual(["1:1"]);
    });

    it("concurrent different seats both succeed (AC4)", async () => {
      const { db, customerId, zone } = await seed(20, "10.00", layout);
      const req = (n: number) =>
        createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, seats: [{ row: 1, number: n }] }] });
      await Promise.all([req(1), req(2)]);
      expect(await seatsOf(db)).toEqual(["1:1", "1:2"]);
    });

    it("frees seats of an expired pending order, rejects live pending and paid (AC5)", async () => {
      const { db, customerId, zone } = await seed(20, "10.00", layout);
      const take = (row: number) =>
        createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, seats: [{ row, number: 1 }] }] });
      const stale = await take(1);
      await db.update(orders).set({ expiresAt: new Date(Date.now() - 1000) }).where(eq(orders.id, stale.order.id));
      await take(2);
      const paid = await take(3);
      await markOrderPaid(db, { orderId: paid.order.id, paymentIntentId: "pi_s" });

      await expect(take(2)).rejects.toBeInstanceOf(SeatTakenError);
      await expect(take(3)).rejects.toBeInstanceOf(SeatTakenError);
      const again = await take(1);
      expect(again.order.status).toBe("pending");
      const [old] = await db.select().from(orders).where(eq(orders.id, stale.order.id));
      expect(old.status).toBe("expired");
    });

    it("markOrderExpired deletes seats; markOrderPaid issues one ticket per seat; late pay is a no-op (AC6)", async () => {
      const { db, customerId, zone } = await seed(20, "10.00", layout);
      const a = await createPendingOrder(db, {
        customerId,
        items: [{ functionZoneId: zone.id, seats: [{ row: 1, number: 1 }] }],
      });
      await markOrderExpired(db, a.order.id);
      expect(await seatsOf(db)).toEqual([]);
      expect(await markOrderPaid(db, { orderId: a.order.id, paymentIntentId: "pi_late" })).toEqual({ updated: false });
      expect(await db.select().from(tickets)).toHaveLength(0);

      const b = await createPendingOrder(db, {
        customerId,
        items: [{ functionZoneId: zone.id, seats: [{ row: 2, number: 2 }, { row: 2, number: 3 }] }],
      });
      await markOrderPaid(db, { orderId: b.order.id, paymentIntentId: "pi_ok" });
      const rows = await db.select().from(tickets);
      expect(rows).toHaveLength(2);
      expect(rows.every((t) => t.orderItemSeatId !== null)).toBe(true);
    });

    it("standing zones keep anonymous tickets without seat (AC6)", async () => {
      const { db, customerId, zone } = await seed(10);
      const { order } = await createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, quantity: 2 }] });
      await markOrderPaid(db, { orderId: order.id, paymentIntentId: "pi_std" });
      const rows = await db.select().from(tickets);
      expect(rows).toHaveLength(2);
      expect(rows.every((t) => t.orderItemSeatId === null)).toBe(true);
    });

    it.each([
      ["out of range row", { seats: [{ row: 5, number: 1 }] }],
      ["out of range number", { seats: [{ row: 1, number: 6 }] }],
      ["zero row", { seats: [{ row: 0, number: 1 }] }],
      ["duplicates", { seats: [{ row: 1, number: 1 }, { row: 1, number: 1 }] }],
      ["too many", { seats: Array.from({ length: 7 }, (_, i) => ({ row: 1, number: i + 1 })) }],
      ["missing seats", { quantity: 2 }],
    ])("rejects %s without writing (AC7)", async (_name, item) => {
      const { db, customerId, zone } = await seed(20, "10.00", layout);
      await expect(
        createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, ...item }] }),
      ).rejects.toBeInstanceOf(InvalidOrderError);
      expect(await db.select().from(orders)).toHaveLength(0);
      expect(await seatsOf(db)).toEqual([]);
    });

    it("rejects seats in a standing zone and unknown zones (AC7)", async () => {
      const { db, customerId, zone } = await seed(10);
      await expect(
        createPendingOrder(db, { customerId, items: [{ functionZoneId: zone.id, seats: [{ row: 1, number: 1 }] }] }),
      ).rejects.toBeInstanceOf(InvalidOrderError);
      await expect(
        createPendingOrder(db, { customerId, items: [{ functionZoneId: crypto.randomUUID(), quantity: 1 }] }),
      ).rejects.toBeInstanceOf(InvalidOrderError);
      expect(await db.select().from(orders)).toHaveLength(0);
    });
  });
});
