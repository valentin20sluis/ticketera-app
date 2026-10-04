import { describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import { events, functionZones, users } from "@/lib/db/schema";
import { buildEventCatalog, seedEventCatalog } from "./event-catalog";

describe("buildEventCatalog", () => {
  it("builds the mock catalog with one function and five zones per event", () => {
    const rows = buildEventCatalog("organizer-id");

    expect(rows.eventCategories).toHaveLength(6);
    expect(rows.venues).toHaveLength(9);
    expect(rows.venueZones).toHaveLength(45);
    expect(rows.events).toHaveLength(10);
    expect(rows.eventFunctions).toHaveLength(10);
    expect(rows.functionZones).toHaveLength(50);
  });

  it("assigns every venue to the given organizer and keeps money as exact strings", () => {
    const rows = buildEventCatalog("organizer-id");

    expect(rows.venues.every((venue) => venue.organizerId === "organizer-id")).toBe(true);
    expect(rows.functionZones.every((zone) => zone.price.match(/^\d+\.\d{2}$/))).toBe(true);
  });
});

describe("seedEventCatalog", () => {
  it("inserts the catalog into a real schema and refuses to run twice", async () => {
    const db = await createTestDb();
    const [organizer] = await db
      .insert(users)
      .values({ clerkUserId: "clerk_org", email: "org@example.com", fullName: "Org", role: "organizer" })
      .returning();

    await seedEventCatalog(db, organizer.id);

    const [{ eventCount }] = await db.select({ eventCount: count() }).from(events);
    const [{ zoneCount }] = await db.select({ zoneCount: count() }).from(functionZones);
    expect(eventCount).toBe(10);
    expect(zoneCount).toBe(50);

    await expect(seedEventCatalog(db, organizer.id)).rejects.toThrow("ya está cargado");
  });
});
