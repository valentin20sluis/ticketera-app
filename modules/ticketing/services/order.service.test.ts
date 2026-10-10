import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
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
  attachCheckoutSession,
  createPendingOrder,
  markOrderExpired,
  markOrderPaid,
  setOrderInvoiceUrl,
} from "./order.service";

async function seed(capacity: number, price = "25.50") {
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
    .values({ venueId: venue.id, name: "Z", shapeX: 0, shapeY: 0, shapeWidth: 1, shapeHeight: 1, capacity })
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
});
