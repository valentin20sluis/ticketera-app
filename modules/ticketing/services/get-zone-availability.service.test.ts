import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItems,
  orders,
  users,
  venueZones,
  venues,
} from "@/lib/db/schema";
import { getZoneAvailability } from "./get-zone-availability.service";

async function seedFunctionZone(db: Awaited<ReturnType<typeof createTestDb>>, capacity: number) {
  const [organizer] = await db
    .insert(users)
    .values({ clerkUserId: `clerk_${crypto.randomUUID()}`, email: "o@example.com", fullName: "O", role: "organizer" })
    .returning();
  const [category] = await db
    .insert(eventCategories)
    .values({ name: "Música", iconKey: "music", colorKey: "indigo" })
    .returning();
  const [venue] = await db
    .insert(venues)
    .values({ organizerId: organizer.id, name: "V", address: "A", city: "Lima", lat: 0, lng: 0 })
    .returning();
  const [zone] = await db
    .insert(venueZones)
    .values({ venueId: venue.id, name: "Z", shapeX: 0, shapeY: 0, shapeWidth: 10, shapeHeight: 10, capacity })
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
  const [eventFunction] = await db
    .insert(eventFunctions)
    .values({ eventId: event.id, startsAt: new Date() })
    .returning();
  const [functionZone] = await db
    .insert(functionZones)
    .values({ functionId: eventFunction.id, venueZoneId: zone.id, price: "10.00", currency: "PEN", capacity })
    .returning();

  return functionZone;
}

async function placeOrder(
  db: Awaited<ReturnType<typeof createTestDb>>,
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

describe("getZoneAvailability", () => {
  it("returns full capacity when there are no orders", async () => {
    const db = await createTestDb();
    const zone = await seedFunctionZone(db, 10);

    expect(await getZoneAvailability(db, zone.id)).toBe(10);
  });

  it("subtracts paid orders", async () => {
    const db = await createTestDb();
    const zone = await seedFunctionZone(db, 10);
    await placeOrder(db, zone.id, 3, "paid", new Date());

    expect(await getZoneAvailability(db, zone.id)).toBe(7);
  });

  it("subtracts pending orders that have not expired", async () => {
    const db = await createTestDb();
    const zone = await seedFunctionZone(db, 10);
    await placeOrder(db, zone.id, 2, "pending", new Date(Date.now() + 10 * 60 * 1000));

    expect(await getZoneAvailability(db, zone.id)).toBe(8);
  });

  it("ignores pending orders that have already expired", async () => {
    const db = await createTestDb();
    const zone = await seedFunctionZone(db, 10);
    await placeOrder(db, zone.id, 5, "pending", new Date(Date.now() - 60 * 1000));

    expect(await getZoneAvailability(db, zone.id)).toBe(10);
  });

  it("combines paid, live pending, and expired pending correctly", async () => {
    const db = await createTestDb();
    const zone = await seedFunctionZone(db, 10);
    await placeOrder(db, zone.id, 3, "paid", new Date());
    await placeOrder(db, zone.id, 2, "pending", new Date(Date.now() + 10 * 60 * 1000));
    await placeOrder(db, zone.id, 5, "pending", new Date(Date.now() - 60 * 1000));

    expect(await getZoneAvailability(db, zone.id)).toBe(5);
  });

  it("computes each function_zone independently", async () => {
    const db = await createTestDb();
    const zoneA = await seedFunctionZone(db, 10);
    const zoneB = await seedFunctionZone(db, 10);
    await placeOrder(db, zoneA.id, 7, "paid", new Date());

    expect(await getZoneAvailability(db, zoneA.id)).toBe(3);
    expect(await getZoneAvailability(db, zoneB.id)).toBe(10);
  });

  it("throws for a nonexistent function_zone", async () => {
    const db = await createTestDb();
    await expect(getZoneAvailability(db, "00000000-0000-0000-0000-000000000000")).rejects.toThrow("not found");
  });
});
