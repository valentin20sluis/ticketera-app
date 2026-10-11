import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-helpers";
import { eventCategories, events, users, venues } from "@/lib/db/schema";
import { listOrganizers } from "./organizer-list.service";

describe("listOrganizers", () => {
  it("counts published and total events per organizer, skipping deleted and non-organizers", async () => {
    const db = await createTestDb();
    const insertUser = async (tag: string, role: "organizer" | "customer", over = {}) =>
      (await db.insert(users).values({ clerkUserId: tag, email: `${tag}@x.co`, fullName: tag, role, ...over }).returning())[0];
    const org = await insertUser("ana", "organizer");
    const empty = await insertUser("beto", "organizer", { isSuspended: true });
    await insertUser("gone", "organizer", { deletedAt: new Date() });
    await insertUser("cli", "customer");
    const [category] = await db.insert(eventCategories).values({ name: "Música", iconKey: "m", colorKey: "c" }).returning();
    const [venue] = await db
      .insert(venues)
      .values({ organizerId: org.id, name: "V", address: "A", city: "Lima", lat: 0, lng: 0 })
      .returning();
    const event = (slug: string, status: "draft" | "published" | "cancelled") => ({
      organizerId: org.id, categoryId: category.id, venueId: venue.id, slug, title: slug, description: "d",
      imageUrl: "https://x.co/i.png", doorsOpenTime: "18:00", showStartTime: "19:00", minimumAge: "0", admissionType: "Libre", status,
    });
    await db.insert(events).values([event("a", "published"), event("b", "draft"), event("c", "cancelled")]);

    const { rows } = await listOrganizers(db, { q: "", page: 1, porPagina: 10 });
    expect(rows.map((r) => [r.fullName, r.activeEvents, r.totalEvents, r.isSuspended])).toEqual([
      ["ana", 1, 3, false],
      [empty.fullName, 0, 0, true],
    ]);
  });

  it("searches by name or email and paginates", async () => {
    const db = await createTestDb();
    for (const tag of ["ana", "beto", "carla"]) {
      await db.insert(users).values({ clerkUserId: tag, email: `${tag}@x.co`, fullName: tag, role: "organizer" });
    }
    const search = await listOrganizers(db, { q: "BET", page: 1, porPagina: 10 });
    expect(search.rows.map((r) => r.fullName)).toEqual(["beto"]);
    const byEmail = await listOrganizers(db, { q: "carla@", page: 1, porPagina: 10 });
    expect(byEmail.total).toBe(1);

    const second = await listOrganizers(db, { q: "", page: 2, porPagina: 2 });
    expect(second).toMatchObject({ total: 3, totalPages: 2, page: 2 });
    expect(second.rows.map((r) => r.fullName)).toEqual(["carla"]);
    expect((await listOrganizers(db, { q: "", page: 9, porPagina: 2 })).page).toBe(2);
  });
});
