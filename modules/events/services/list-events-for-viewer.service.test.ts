import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { createTestDb } from "@/lib/db/test-helpers";
import { eventCategories, eventFunctions, events, users, venues } from "@/lib/db/schema";
import { EVENT_STATUSES } from "@/modules/events/schemas/event-list-options.schema";
import {
  listEventsForViewer,
  resolveEventScope,
  type EventViewer,
} from "./list-events-for-viewer.service";

type Role = "customer" | "organizer" | "admin" | "super_admin";

const viewer = (id: string, role: Role, extra: Partial<NonNullable<EventViewer>> = {}): EventViewer => ({
  id,
  role,
  isSuspended: false,
  deletedAt: null,
  ...extra,
});

async function setup() {
  const db = await createTestDb();
  const [orgA, orgB] = await db
    .insert(users)
    .values([
      { clerkUserId: "clerk_a", email: "a@example.com", fullName: "A", role: "organizer" },
      { clerkUserId: "clerk_b", email: "b@example.com", fullName: "B", role: "organizer" },
    ])
    .returning();
  const [category] = await db
    .insert(eventCategories)
    .values({ name: "Música", iconKey: "music", colorKey: "red" })
    .returning();

  const ids: Record<string, string> = {};
  for (const organizer of [orgA, orgB]) {
    const [venue] = await db
      .insert(venues)
      .values({ organizerId: organizer.id, name: "V", address: "Av 1", city: "Lima", lat: 0, lng: 0 })
      .returning();
    for (const status of EVENT_STATUSES) {
      const [event] = await db
        .insert(events)
        .values({
          organizerId: organizer.id,
          categoryId: category.id,
          venueId: venue.id,
          slug: `${organizer.fullName}-${status}`,
          title: `${organizer.fullName} ${status}`,
          description: "d",
          imageUrl: "/img.png",
          doorsOpenTime: "18:00",
          showStartTime: "19:00",
          minimumAge: "18+",
          admissionType: "general",
          status,
        })
        .returning();
      ids[`${organizer.fullName}-${status}`] = event.id;
    }
  }
  return { db, orgA, orgB, ids };
}

const slugsOf = (rows: { slug: string }[]) => rows.map((row) => row.slug).sort();
const ALL_SLUGS = ["A", "B"].flatMap((o) => EVENT_STATUSES.map((s) => `${o}-${s}`)).sort();
const PUBLISHED_SLUGS = ["A-published", "B-published"];

describe("resolveEventScope", () => {
  it("maps every viewer kind to its scope", () => {
    expect(resolveEventScope(null)).toEqual({ kind: "public" });
    expect(resolveEventScope(viewer("u", "customer"))).toEqual({ kind: "public" });
    expect(resolveEventScope(viewer("u", "organizer", { isSuspended: true }))).toEqual({ kind: "public" });
    expect(resolveEventScope(viewer("u", "organizer", { deletedAt: new Date() }))).toEqual({ kind: "public" });
    expect(resolveEventScope(viewer("u", "organizer"))).toEqual({ kind: "own", organizerId: "u" });
    expect(resolveEventScope(viewer("u", "admin"))).toEqual({ kind: "all" });
    expect(resolveEventScope(viewer("u", "super_admin"))).toEqual({ kind: "all" });
    expect(resolveEventScope(viewer("u", "admin", { isSuspended: true }))).toEqual({ kind: "public" });
  });
});

describe("listEventsForViewer", () => {
  it("anonymous sees only published events, ignoring options", async () => {
    const { db, orgA } = await setup();
    const rows = await listEventsForViewer(db, null, { organizerId: orgA.id, status: "draft" });
    expect(slugsOf(rows)).toEqual(PUBLISHED_SLUGS);
  });

  it.each([
    ["customer", (): Partial<NonNullable<EventViewer>> => ({}), "customer" as Role],
    ["suspended customer", () => ({ isSuspended: true }), "customer" as Role],
    ["suspended organizer", () => ({ isSuspended: true }), "organizer" as Role],
    ["deleted organizer", () => ({ deletedAt: new Date() }), "organizer" as Role],
    ["suspended admin", () => ({ isSuspended: true }), "admin" as Role],
  ])("%s sees only published events", async (_name, extra, role) => {
    const { db, orgA } = await setup();
    const rows = await listEventsForViewer(db, viewer(orgA.id, role, extra()), { status: "draft" });
    expect(slugsOf(rows)).toEqual(PUBLISHED_SLUGS);
  });

  it("organizer sees all statuses of their own events, ignoring a foreign organizerId", async () => {
    const { db, orgA, orgB } = await setup();
    const rows = await listEventsForViewer(db, viewer(orgA.id, "organizer"), { organizerId: orgB.id });
    expect(slugsOf(rows)).toEqual(EVENT_STATUSES.map((s) => `A-${s}`).sort());
  });

  it.each(["admin", "super_admin"] as const)("%s sees everything and can filter", async (role) => {
    const { db, orgA, orgB } = await setup();
    const v = viewer(orgA.id, role);
    expect(slugsOf(await listEventsForViewer(db, v))).toEqual(ALL_SLUGS);
    expect(slugsOf(await listEventsForViewer(db, v, { organizerId: orgB.id }))).toEqual(
      EVENT_STATUSES.map((s) => `B-${s}`).sort(),
    );
    expect(slugsOf(await listEventsForViewer(db, v, { status: "draft" }))).toEqual(["A-draft", "B-draft"]);
  });

  it("rejects an invalid organizerId", async () => {
    const { db } = await setup();
    await expect(listEventsForViewer(db, null, { organizerId: "nope" })).rejects.toThrow(ZodError);
  });

  it("honors limit", async () => {
    const { db, orgA } = await setup();
    expect(await listEventsForViewer(db, viewer(orgA.id, "admin"), { limit: 3 })).toHaveLength(3);
  });

  it("returns exactly the closed key list, with null startDate when there is no function", async () => {
    const { db, orgA } = await setup();
    const [row] = await listEventsForViewer(db, viewer(orgA.id, "organizer"));
    expect(Object.keys(row).sort()).toEqual(["id", "imageUrl", "slug", "startDate", "status", "title"]);
    expect(row.startDate).toBeNull();
  });

  it("startDate is the earliest function as ISO", async () => {
    const { db, orgA, ids } = await setup();
    const early = new Date("2030-01-01T20:00:00.000Z");
    await db.insert(eventFunctions).values([
      { eventId: ids["A-published"], startsAt: new Date("2030-06-01T20:00:00.000Z") },
      { eventId: ids["A-published"], startsAt: early },
    ]);
    const rows = await listEventsForViewer(db, viewer(orgA.id, "organizer"));
    expect(rows.find((r) => r.slug === "A-published")?.startDate).toBe(early.toISOString());
  });
});
