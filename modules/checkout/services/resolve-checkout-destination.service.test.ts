import { beforeAll, describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-helpers";
import {
  eventCategories,
  eventFunctions,
  events,
  functionZones,
  users,
  venueZones,
  venues,
} from "@/lib/db/schema";
import type { Db } from "@/lib/db/client";
import { resolveCheckoutDestination } from "./resolve-checkout-destination.service";

type Org = { stripeAccountId?: string | null; stripeChargesEnabled?: boolean };

let db: Db;
let categoryId: string;

beforeAll(async () => {
  db = (await createTestDb()) as unknown as Db;
  const [category] = await db
    .insert(eventCategories)
    .values({ name: "Música", iconKey: "music", colorKey: "indigo" })
    .returning();
  categoryId = category.id;
}, 60_000);

async function seedOrganizer(org: Org = { stripeAccountId: "acct_1", stripeChargesEnabled: true }) {
  const [organizer] = await db
    .insert(users)
    .values({
      clerkUserId: `clerk_${crypto.randomUUID()}`,
      email: "o@example.com",
      fullName: "O",
      role: "organizer",
      stripeAccountId: org.stripeAccountId ?? null,
      stripeChargesEnabled: org.stripeChargesEnabled ?? false,
    })
    .returning();
  const [venue] = await db
    .insert(venues)
    .values({ organizerId: organizer.id, name: "V", address: "A", city: "Lima", lat: 0, lng: 0 })
    .returning();
  const [vz] = await db
    .insert(venueZones)
    .values({ venueId: venue.id, name: "Z", shapeX: 0, shapeY: 0, shapeWidth: 1, shapeHeight: 1, capacity: 10 })
    .returning();
  return { organizerId: organizer.id, venueId: venue.id, venueZoneId: vz.id };
}

type Seeded = Awaited<ReturnType<typeof seedOrganizer>>;

/** Creates an event with `functions` functions, each with `zonesPerFunction` zones. Returns zone ids. */
async function seedEvent(o: Seeded, functions = 1, zonesPerFunction = 1) {
  const slug = `e-${crypto.randomUUID()}`;
  const [event] = await db
    .insert(events)
    .values({
      organizerId: o.organizerId,
      categoryId,
      venueId: o.venueId,
      slug,
      title: "E",
      description: "d",
      imageUrl: "https://picsum.photos/seed/e/800",
      doorsOpenTime: "19:00",
      showStartTime: "20:00",
      minimumAge: "18",
      admissionType: "General",
    })
    .returning();
  const zoneIds: string[] = [];
  for (let f = 0; f < functions; f++) {
    const [fn] = await db.insert(eventFunctions).values({ eventId: event.id, startsAt: new Date() }).returning();
    for (let z = 0; z < zonesPerFunction; z++) {
      const [zone] = await db
        .insert(functionZones)
        .values({ functionId: fn.id, venueZoneId: o.venueZoneId, price: "10.00", currency: "PEN", capacity: 10 })
        .returning();
      zoneIds.push(zone.id);
    }
  }
  return { slug, zoneIds };
}

describe("resolveCheckoutDestination", () => {
  it("resolves a single event with a ready organizer", async () => {
    const o = await seedOrganizer({ stripeAccountId: "acct_ready", stripeChargesEnabled: true });
    const { slug, zoneIds } = await seedEvent(o);
    expect(await resolveCheckoutDestination(db, zoneIds)).toEqual({
      ok: true,
      eventSlug: slug,
      stripeAccountId: "acct_ready",
    });
  });

  it("counts several zones and functions of the same event as one event", async () => {
    const o = await seedOrganizer();
    const { slug, zoneIds } = await seedEvent(o, 2, 2);
    const result = await resolveCheckoutDestination(db, zoneIds);
    expect(result).toMatchObject({ ok: true, eventSlug: slug });
  });

  it("tolerates repeated zone ids", async () => {
    const o = await seedOrganizer();
    const { zoneIds } = await seedEvent(o);
    const result = await resolveCheckoutDestination(db, [zoneIds[0], zoneIds[0]]);
    expect(result.ok).toBe(true);
  });

  it("rejects two events of the same organizer", async () => {
    const o = await seedOrganizer();
    const a = await seedEvent(o);
    const b = await seedEvent(o);
    expect(await resolveCheckoutDestination(db, [...a.zoneIds, ...b.zoneIds])).toEqual({
      ok: false,
      error: "multiple_events",
    });
  });

  it("rejects events of two different organizers", async () => {
    const a = await seedEvent(await seedOrganizer());
    const b = await seedEvent(await seedOrganizer({ stripeAccountId: "acct_2", stripeChargesEnabled: true }));
    expect(await resolveCheckoutDestination(db, [...a.zoneIds, ...b.zoneIds])).toEqual({
      ok: false,
      error: "multiple_events",
    });
  });

  it("rejects an organizer without stripe account", async () => {
    const { zoneIds } = await seedEvent(await seedOrganizer({ stripeAccountId: null, stripeChargesEnabled: false }));
    expect(await resolveCheckoutDestination(db, zoneIds)).toEqual({
      ok: false,
      error: "organizer_payments_unavailable",
    });
  });

  it("rejects an organizer with account but charges disabled", async () => {
    const { zoneIds } = await seedEvent(await seedOrganizer({ stripeAccountId: "acct_x", stripeChargesEnabled: false }));
    expect(await resolveCheckoutDestination(db, zoneIds)).toEqual({
      ok: false,
      error: "organizer_payments_unavailable",
    });
  });

  it("returns zone_not_found for an unknown zone, even next to a valid one", async () => {
    const { zoneIds } = await seedEvent(await seedOrganizer());
    const missing = crypto.randomUUID();
    expect(await resolveCheckoutDestination(db, [missing])).toEqual({ ok: false, error: "zone_not_found" });
    expect(await resolveCheckoutDestination(db, [zoneIds[0], missing])).toEqual({
      ok: false,
      error: "zone_not_found",
    });
  });
});
