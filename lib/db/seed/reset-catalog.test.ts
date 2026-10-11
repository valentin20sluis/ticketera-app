import { describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  eventCategories,
  events,
  functionZones,
  orderItems,
  orders,
  tickets,
  users,
  venues,
} from "@/lib/db/schema";
import { seedEventCatalog } from "./event-catalog";
import { resetCatalog } from "./reset-catalog";

async function countOf(db: Awaited<ReturnType<typeof createTestDb>>, table: PgTable) {
  const [{ n }] = await db.select({ n: count() }).from(table);
  return n;
}

describe("resetCatalog", () => {
  it("wipes the catalog and all sales but keeps users, then the seed leaves 0 sales", async () => {
    const db = await createTestDb();
    const [organizer] = await db
      .insert(users)
      .values({ clerkUserId: "clerk_org", email: "org@example.com", fullName: "Org", role: "organizer" })
      .returning();
    await seedEventCatalog(db, organizer.id);

    const [zone] = await db.select({ id: functionZones.id }).from(functionZones).limit(1);
    const [order] = await db
      .insert(orders)
      .values({ customerId: organizer.id, status: "paid", totalAmount: "100.00", expiresAt: new Date() })
      .returning();
    const [item] = await db
      .insert(orderItems)
      .values({ orderId: order.id, functionZoneId: zone.id, quantity: 1, unitPrice: "100.00" })
      .returning();
    await db.insert(tickets).values({ orderItemId: item.id, qrCode: "qr-1" });

    const deleted = await resetCatalog(db);

    expect(deleted).toMatchObject({ tickets: 1, order_items: 1, orders: 1, events: 10, function_zones: 50 });
    for (const table of [orders, orderItems, tickets, events, venues, eventCategories]) {
      expect(await countOf(db, table)).toBe(0);
    }
    expect(await countOf(db, users)).toBe(1);

    await seedEventCatalog(db, organizer.id);
    expect(await countOf(db, events)).toBe(10);
    expect(await countOf(db, functionZones)).toBe(50);
    for (const table of [orders, orderItems, tickets]) {
      expect(await countOf(db, table)).toBe(0);
    }
  });

  it("is all-or-nothing when run inside a failing transaction", async () => {
    const db = await createTestDb();
    const [organizer] = await db
      .insert(users)
      .values({ clerkUserId: "clerk_org", email: "org@example.com", fullName: "Org", role: "organizer" })
      .returning();
    await seedEventCatalog(db, organizer.id);

    await expect(
      db.transaction(async (tx) => {
        await resetCatalog(tx);
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");

    expect(await countOf(db, events)).toBe(10);
  });
});
