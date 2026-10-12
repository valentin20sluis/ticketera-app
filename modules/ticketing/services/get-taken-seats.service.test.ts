import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  orderItemSeats,
  orderItems,
  orders,
  users,
  venueZones,
  venues,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";
import { getTakenSeats } from "./get-taken-seats.service";

async function seed() {
  const db = await createTestDb();
  const [u] = await db
    .insert(users)
    .values({ clerkUserId: "clerk_x", email: "o@example.com", fullName: "O", role: "organizer" })
    .returning();
  const [category] = await db
    .insert(eventCategories)
    .values({ name: "M", iconKey: "music", colorKey: "indigo" })
    .returning();
  const [venue] = await db
    .insert(venues)
    .values({ organizerId: u.id, name: "V", address: "A", city: "Lima", lat: 0, lng: 0 })
    .returning();
  const [vz] = await db
    .insert(venueZones)
    .values({
      venueId: venue.id,
      name: "Z",
      shapeX: 0,
      shapeY: 0,
      shapeWidth: 1,
      shapeHeight: 1,
      capacity: 20,
      seatRows: 4,
      seatColumns: 5,
    })
    .returning();
  const [event] = await db
    .insert(events)
    .values({
      organizerId: u.id,
      categoryId: category.id,
      venueId: venue.id,
      slug: "e",
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
    .values({ functionId: fn.id, venueZoneId: vz.id, price: "10.00", currency: "PEN", capacity: 20 })
    .returning();
  return { db, userId: u.id, zone };
}

describe("getTakenSeats", () => {
  it("returns seats of paid and live pending orders, not expired ones", async () => {
    const { db, userId, zone } = await seed();
    const hold = async (status: "paid" | "pending" | "expired", expiresAt: Date, row: number) => {
      const [order] = await db
        .insert(orders)
        .values({ customerId: userId, status, totalAmount: "10.00", currency: "PEN", expiresAt })
        .returning();
      const [item] = await db
        .insert(orderItems)
        .values({ orderId: order.id, functionZoneId: zone.id, quantity: 1, unitPrice: "10.00" })
        .returning();
      await db
        .insert(orderItemSeats)
        .values({ orderItemId: item.id, functionZoneId: zone.id, seatRow: row, seatNumber: 1 });
    };
    const future = new Date(Date.now() + 600_000);
    const past = new Date(Date.now() - 1000);
    await hold("paid", past, 1);
    await hold("pending", future, 2);
    await hold("pending", past, 3);
    await hold("expired", future, 4);

    expect(await getTakenSeats(db as unknown as Db, zone.id)).toEqual([
      { row: 1, number: 1 },
      { row: 2, number: 1 },
    ]);
  });
});
