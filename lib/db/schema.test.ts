import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "./test-helpers";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  tickets,
  users,
  venueZones,
  venues,
} from "./schema";

async function seedCore(db: Awaited<ReturnType<typeof createTestDb>>) {
  const [organizer] = await db
    .insert(users)
    .values({
      clerkUserId: `clerk_organizer_${crypto.randomUUID()}`,
      email: "organizer@example.com",
      fullName: "Org Test",
      role: "organizer",
    })
    .returning();

  const [category] = await db
    .insert(eventCategories)
    .values({ name: "Música", iconKey: "music", colorKey: "indigo" })
    .returning();

  const [venue] = await db
    .insert(venues)
    .values({
      organizerId: organizer.id,
      name: "Estadio Test",
      address: "Av. Test 123",
      city: "Lima",
      lat: -12.05,
      lng: -77.03,
    })
    .returning();

  const [zone] = await db
    .insert(venueZones)
    .values({
      venueId: venue.id,
      name: "Campo VIP",
      shapeX: 10,
      shapeY: 10,
      shapeWidth: 20,
      shapeHeight: 20,
      capacity: 100,
    })
    .returning();

  const [event] = await db
    .insert(events)
    .values({
      organizerId: organizer.id,
      categoryId: category.id,
      venueId: venue.id,
      slug: `evento-test-${crypto.randomUUID()}`,
      title: "Evento Test",
      description: "Descripción",
      imageUrl: "https://picsum.photos/seed/evento-test/800",
      doorsOpenTime: "19:00",
      showStartTime: "20:00",
      minimumAge: "18",
      admissionType: "General",
      status: "published",
    })
    .returning();

  const [eventFunction] = await db
    .insert(eventFunctions)
    .values({ eventId: event.id, startsAt: new Date("2026-12-01T20:00:00-05:00") })
    .returning();

  const [functionZone] = await db
    .insert(functionZones)
    .values({
      functionId: eventFunction.id,
      venueZoneId: zone.id,
      price: "19.99",
      currency: "PEN",
      capacity: 100,
    })
    .returning();

  return { organizer, category, venue, zone, event, eventFunction, functionZone };
}

describe("database schema", () => {
  it("inserts a full chain from user to ticket and reads it back", async () => {
    const db = await createTestDb();
    const { functionZone } = await seedCore(db);

    const [customer] = await db
      .insert(users)
      .values({
        clerkUserId: `clerk_customer_${crypto.randomUUID()}`,
        email: "customer@example.com",
        fullName: "Customer Test",
        role: "customer",
      })
      .returning();

    const [order] = await db
      .insert(orders)
      .values({
        customerId: customer.id,
        status: "paid",
        totalAmount: "19.99",
        currency: "PEN",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      })
      .returning();

    const [orderItem] = await db
      .insert(orderItems)
      .values({ orderId: order.id, functionZoneId: functionZone.id, quantity: 1, unitPrice: "19.99" })
      .returning();

    const [ticket] = await db
      .insert(tickets)
      .values({ orderItemId: orderItem.id, qrCode: `QR-${crypto.randomUUID()}` })
      .returning();

    expect(ticket.status).toBe("valid");
  });

  it("rejects an order_item referencing a nonexistent function_zone", async () => {
    const db = await createTestDb();
    const [customer] = await db
      .insert(users)
      .values({
        clerkUserId: `clerk_customer_${crypto.randomUUID()}`,
        email: "c2@example.com",
        fullName: "C2",
        role: "customer",
      })
      .returning();
    const [order] = await db
      .insert(orders)
      .values({ customerId: customer.id, status: "pending", totalAmount: "0", currency: "PEN", expiresAt: new Date() })
      .returning();

    await expect(
      db.insert(orderItems).values({
        orderId: order.id,
        functionZoneId: "00000000-0000-0000-0000-000000000000",
        quantity: 1,
        unitPrice: "10.00",
      }),
    ).rejects.toThrow();
  });

  it("enforces unique constraints on clerk_user_id, slug and qr_code", async () => {
    const db = await createTestDb();

    await db
      .insert(users)
      .values({ clerkUserId: "dup_clerk", email: "a@example.com", fullName: "A", role: "customer" });
    await expect(
      db.insert(users).values({ clerkUserId: "dup_clerk", email: "b@example.com", fullName: "B", role: "customer" }),
    ).rejects.toThrow();

    const { event } = await seedCore(db);
    await expect(
      db.insert(events).values({
        organizerId: event.organizerId,
        categoryId: event.categoryId,
        venueId: event.venueId,
        slug: event.slug,
        title: "Duplicado",
        description: "x",
        imageUrl: "https://picsum.photos/seed/dup/800",
        doorsOpenTime: "19:00",
        showStartTime: "20:00",
        minimumAge: "18",
        admissionType: "General",
      }),
    ).rejects.toThrow();

    const { functionZone } = await seedCore(db);
    const [customer] = await db
      .insert(users)
      .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "c3@example.com", fullName: "C3", role: "customer" })
      .returning();
    const [order] = await db
      .insert(orders)
      .values({ customerId: customer.id, status: "paid", totalAmount: "19.99", currency: "PEN", expiresAt: new Date() })
      .returning();
    const [orderItem] = await db
      .insert(orderItems)
      .values({ orderId: order.id, functionZoneId: functionZone.id, quantity: 1, unitPrice: "19.99" })
      .returning();
    await db.insert(tickets).values({ orderItemId: orderItem.id, qrCode: "DUP-QR" });
    await expect(db.insert(tickets).values({ orderItemId: orderItem.id, qrCode: "DUP-QR" })).rejects.toThrow();
  });

  it("round-trips a decimal price exactly, without float drift", async () => {
    const db = await createTestDb();
    const { functionZone } = await seedCore(db);

    const stored = await db
      .select({ price: functionZones.price })
      .from(functionZones)
      .where(eq(functionZones.id, functionZone.id));

    expect(stored[0].price).toBe("19.99");
  });
});
