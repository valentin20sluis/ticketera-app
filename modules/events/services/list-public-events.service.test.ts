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
import type { Event } from "@/modules/events/types/event.types";
import { listPublicEvents, pickHeroEvents } from "./list-public-events.service";

const NOW = new Date("2030-01-01T12:00:00Z");
const day = (n: number) => new Date(NOW.getTime() + n * 86_400_000);

async function setup() {
  const db = await createTestDb();
  const [organizer, customer] = await db
    .insert(users)
    .values([
      { clerkUserId: "c_org", email: "o@example.com", fullName: "O", role: "organizer" },
      { clerkUserId: "c_cus", email: "c@example.com", fullName: "C", role: "customer" },
    ])
    .returning();
  const [category] = await db
    .insert(eventCategories)
    .values({ name: "Música", iconKey: "music", colorKey: "pink" })
    .returning();
  const [venue] = await db
    .insert(venues)
    .values({ organizerId: organizer.id, name: "Estadio", address: "Av 1", city: "Lima", lat: 0, lng: 0 })
    .returning();
  const [zone] = await db
    .insert(venueZones)
    .values({
      venueId: venue.id,
      name: "Z",
      shapeX: 0,
      shapeY: 0,
      shapeWidth: 1,
      shapeHeight: 1,
      capacity: 1000,
    })
    .returning();

  async function addEvent(
    slug: string,
    opts: {
      status?: "draft" | "published" | "cancelled" | "suspended";
      featured?: boolean;
      functions?: { startsAt: Date; zones: { price: string; capacity: number }[] }[];
    } = {},
  ) {
    const [event] = await db
      .insert(events)
      .values({
        organizerId: organizer.id,
        categoryId: category.id,
        venueId: venue.id,
        slug,
        title: slug,
        description: "d",
        imageUrl: "/img.png",
        doorsOpenTime: "18:00",
        showStartTime: "19:00",
        minimumAge: "18+",
        admissionType: "general",
        status: opts.status ?? "published",
        featured: opts.featured ?? false,
      })
      .returning();
    const zoneIds: string[] = [];
    for (const fn of opts.functions ?? [{ startsAt: day(10), zones: [{ price: "50.00", capacity: 100 }] }]) {
      const [created] = await db.insert(eventFunctions).values({ eventId: event.id, startsAt: fn.startsAt }).returning();
      for (const z of fn.zones) {
        const [fz] = await db
          .insert(functionZones)
          .values({ functionId: created.id, venueZoneId: zone.id, price: z.price, capacity: z.capacity })
          .returning();
        zoneIds.push(fz.id);
      }
    }
    return { event, zoneIds };
  }

  async function reserve(
    zoneId: string,
    quantity: number,
    status: "paid" | "pending" | "expired" | "cancelled",
    expiresAt: Date,
  ) {
    const [order] = await db
      .insert(orders)
      .values({ customerId: customer.id, status, totalAmount: "0", expiresAt })
      .returning();
    await db.insert(orderItems).values({ orderId: order.id, functionZoneId: zoneId, quantity, unitPrice: "0" });
  }

  return { db, addEvent, reserve };
}

describe("listPublicEvents", () => {
  it("returns only published events with a future function and zones", async () => {
    const { db, addEvent } = await setup();
    await addEvent("ok");
    await addEvent("draft", { status: "draft" });
    await addEvent("cancelled", { status: "cancelled" });
    await addEvent("suspended", { status: "suspended" });
    await addEvent("past", { functions: [{ startsAt: day(-1), zones: [{ price: "10", capacity: 10 }] }] });
    await addEvent("no-zones", { functions: [{ startsAt: day(5), zones: [] }] });
    await addEvent("no-functions", { functions: [] });

    const result = await listPublicEvents(db, NOW);

    expect(result.map((e) => e.slug)).toEqual(["ok"]);
  });

  it("maps the Event shape using the nearest future function and the minimum zone price", async () => {
    const { db, addEvent } = await setup();
    const { event } = await addEvent("show", {
      featured: true,
      functions: [
        { startsAt: day(-3), zones: [{ price: "1.00", capacity: 10 }] },
        { startsAt: day(20), zones: [{ price: "90.00", capacity: 10 }] },
        { startsAt: day(7), zones: [{ price: "120.00", capacity: 10 }, { price: "45.50", capacity: 10 }] },
      ],
    });

    const [result] = await listPublicEvents(db, NOW);

    expect(result).toEqual({
      id: event.id,
      slug: "show",
      title: "show",
      description: "d",
      imageUrl: "/img.png",
      doorsOpenTime: "18:00",
      showStartTime: "19:00",
      minimumAge: "18+",
      admissionType: "general",
      featured: true,
      venueName: "Estadio",
      city: "Lima",
      venueAddress: "Av 1",
      venueLat: 0,
      venueLng: 0,
      categoryId: "music",
      currency: "PEN",
      startDate: day(7).toISOString(),
      priceFrom: 45.5,
      status: "available",
    });
  });

  it("orders by startDate ascending", async () => {
    const { db, addEvent } = await setup();
    await addEvent("late", { functions: [{ startsAt: day(30), zones: [{ price: "1", capacity: 10 }] }] });
    await addEvent("soon", { functions: [{ startsAt: day(2), zones: [{ price: "1", capacity: 10 }] }] });

    expect((await listPublicEvents(db, NOW)).map((e) => e.slug)).toEqual(["soon", "late"]);
  });

  it("breaks startDate ties by id", async () => {
    const { db, addEvent } = await setup();
    await addEvent("a");
    await addEvent("b");

    const ids = (await listPublicEvents(db, NOW)).map((e) => e.id);

    expect(ids).toEqual([...ids].sort());
  });

  describe("status", () => {
    it("is sold-out when every future zone has no availability", async () => {
      const { db, addEvent, reserve } = await setup();
      const { zoneIds } = await addEvent("e", {
        functions: [{ startsAt: day(5), zones: [{ price: "1", capacity: 10 }, { price: "1", capacity: 5 }] }],
      });
      await reserve(zoneIds[0], 10, "paid", day(-1));
      await reserve(zoneIds[1], 5, "pending", day(1));

      expect((await listPublicEvents(db, NOW))[0].status).toBe("sold-out");
    });

    it("is last-tickets at 20% or less remaining", async () => {
      const { db, addEvent, reserve } = await setup();
      const { zoneIds } = await addEvent("e", {
        functions: [{ startsAt: day(5), zones: [{ price: "1", capacity: 100 }] }],
      });
      await reserve(zoneIds[0], 80, "paid", day(-1));

      expect((await listPublicEvents(db, NOW))[0].status).toBe("last-tickets");
    });

    it("is available above 20% remaining", async () => {
      const { db, addEvent, reserve } = await setup();
      const { zoneIds } = await addEvent("e", {
        functions: [{ startsAt: day(5), zones: [{ price: "1", capacity: 100 }] }],
      });
      await reserve(zoneIds[0], 79, "paid", day(-1));

      expect((await listPublicEvents(db, NOW))[0].status).toBe("available");
    });

    it("ignores expired, cancelled and lapsed pending orders", async () => {
      const { db, addEvent, reserve } = await setup();
      const { zoneIds } = await addEvent("e", {
        functions: [{ startsAt: day(5), zones: [{ price: "1", capacity: 100 }] }],
      });
      await reserve(zoneIds[0], 100, "pending", day(-1));
      await reserve(zoneIds[0], 100, "expired", day(1));
      await reserve(zoneIds[0], 100, "cancelled", day(1));

      expect((await listPublicEvents(db, NOW))[0].status).toBe("available");
    });

    it("counts a vigente pending order", async () => {
      const { db, addEvent, reserve } = await setup();
      const { zoneIds } = await addEvent("e", {
        functions: [{ startsAt: day(5), zones: [{ price: "1", capacity: 100 }] }],
      });
      await reserve(zoneIds[0], 90, "pending", day(1));

      expect((await listPublicEvents(db, NOW))[0].status).toBe("last-tickets");
    });
  });
});

describe("pickHeroEvents", () => {
  const make = (n: number, featured: boolean): Event =>
    ({
      id: `e${n}`,
      slug: `e${n}`,
      featured,
      startDate: day(n).toISOString(),
    }) as Event;

  it("returns [] for an empty list", () => {
    expect(pickHeroEvents([])).toEqual([]);
  });

  it("returns the featured events sorted by date", () => {
    const list = [make(5, true), make(1, false), make(3, true), make(2, true)];

    expect(pickHeroEvents(list).map((e) => e.id)).toEqual(["e2", "e3", "e5"]);
  });

  it("caps at 5 featured events, earliest first", () => {
    const list = [7, 6, 5, 4, 3, 2, 1].map((n) => make(n, true));

    expect(pickHeroEvents(list).map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4", "e5"]);
  });

  it("falls back to the first 5 when none is featured", () => {
    const list = [1, 2, 3, 4, 5, 6, 7].map((n) => make(n, false));

    expect(pickHeroEvents(list).map((e) => e.id)).toEqual(["e1", "e2", "e3", "e4", "e5"]);
  });

  it("does not mutate the input", () => {
    const list = [make(3, true), make(1, true)];
    const copy = [...list];

    pickHeroEvents(list);

    expect(list).toEqual(copy);
  });
});
