import { describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import { events, functionZones, users } from "@/lib/db/schema";
import { buildEventCatalog, seedEventCatalog, upcomingDate } from "./event-catalog";

describe("upcomingDate", () => {
  const now = new Date("2026-10-11T12:00:00.000Z");

  it("shifts a past date by whole years keeping month, day and time", () => {
    const result = upcomingDate("2026-09-30T20:30:00.000Z", now);
    expect(result.toISOString()).toBe("2027-09-30T20:30:00.000Z");
  });

  it("shifts several years when needed", () => {
    expect(upcomingDate("2022-01-05T10:00:00.000Z", now).toISOString()).toBe("2027-01-05T10:00:00.000Z");
  });

  it("keeps a future date unchanged", () => {
    expect(upcomingDate("2026-12-01T20:00:00.000Z", now).toISOString()).toBe("2026-12-01T20:00:00.000Z");
  });

  it("moves a date exactly equal to now one year ahead", () => {
    expect(upcomingDate(now, now).toISOString()).toBe("2027-10-11T12:00:00.000Z");
  });
});

describe("buildEventCatalog", () => {
  it("starts every function after the injected now", () => {
    const now = new Date("2026-10-11T12:00:00.000Z");
    const rows = buildEventCatalog("organizer-id", now);

    expect(rows.eventFunctions.every((fn) => (fn.startsAt as Date) > now)).toBe(true);
  });

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
