import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { eventsMock } from "@/modules/events/data/event.mock";
import {
  EVENT_CATEGORIES,
  type TicketEvent,
} from "@/modules/events/types/event.types";
import {
  filterEventsByCategory,
  getEventCities,
  getEventPath,
  getEvents,
  getFeaturedEvents,
  getThisWeekEvents,
} from "./event.service";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function makeEvent(overrides: Partial<TicketEvent>): TicketEvent {
  return {
    id: "fixture",
    slug: "fixture",
    title: "Fixture",
    category: "concerts",
    imageSrc: "/images/events/fixture.jpg",
    imageAlt: "Fixture",
    startsAt: "2030-01-01T00:00:00.000Z",
    venue: "Lugar",
    city: "Lima",
    minPrice: 10,
    status: "available",
    featured: false,
    ...overrides,
  };
}

describe("filterEventsByCategory", () => {
  const fixtures = [
    makeEvent({ id: "1", category: "sports" }),
    makeEvent({ id: "2", category: "concerts" }),
    makeEvent({ id: "3", category: "sports" }),
    makeEvent({ id: "4", category: "theater" }),
  ];

  it("returns every event for 'all'", () => {
    expect(filterEventsByCategory(fixtures, "all")).toEqual(fixtures);
  });

  it("returns only events of the given category", () => {
    const result = filterEventsByCategory(fixtures, "sports");
    expect(result.map((event) => event.id)).toEqual(["1", "3"]);
    expect(result.every((event) => event.category === "sports")).toBe(true);
  });

  it("keeps the original order", () => {
    const reversed = [...fixtures].reverse();
    expect(
      filterEventsByCategory(reversed, "sports").map((event) => event.id),
    ).toEqual(["3", "1"]);
  });

  it("does not mutate the input array", () => {
    const input = [...fixtures];
    filterEventsByCategory(input, "sports");
    filterEventsByCategory(input, "all");
    expect(input).toEqual(fixtures);
    expect(input).toHaveLength(fixtures.length);
  });

  it("returns an empty array for a category without events", () => {
    expect(filterEventsByCategory(fixtures, "family")).toEqual([]);
  });
});

describe("getEvents", () => {
  it("returns events sorted by startsAt ascending", async () => {
    const events = await getEvents();
    const times = events.map((event) => Date.parse(event.startsAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(events).toHaveLength(eventsMock.length);
  });

  it("has no repeated ids or slugs", async () => {
    const events = await getEvents();
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length);
    expect(new Set(events.map((event) => event.slug)).size).toBe(events.length);
  });
});

describe("getFeaturedEvents", () => {
  it("returns the 4 featured events", async () => {
    const featured = await getFeaturedEvents();
    expect(featured).toHaveLength(4);
    expect(featured.every((event) => event.featured)).toBe(true);
  });

  it("returns only upcoming events, from at least 3 categories", async () => {
    const featured = await getFeaturedEvents();
    const now = Date.now();
    expect(featured.every((event) => Date.parse(event.startsAt) > now)).toBe(
      true,
    );
    expect(new Set(featured.map((event) => event.category)).size).toBeGreaterThanOrEqual(3);
  });
});

describe("getThisWeekEvents", () => {
  it("includes the lower bound and excludes the upper bound of the window", async () => {
    const events = await getEvents();
    const last = events[events.length - 1];
    const lastTime = Date.parse(last.startsAt);

    const atUpperBound = await getThisWeekEvents(new Date(lastTime - WEEK_MS));
    expect(atUpperBound.map((event) => event.id)).not.toContain(last.id);

    const justInside = await getThisWeekEvents(
      new Date(lastTime - WEEK_MS + 1),
    );
    expect(justInside.map((event) => event.id)).toContain(last.id);

    const atLowerBound = await getThisWeekEvents(new Date(lastTime));
    expect(atLowerBound.map((event) => event.id)).toContain(last.id);

    const justPast = await getThisWeekEvents(new Date(lastTime + 1));
    expect(justPast.map((event) => event.id)).not.toContain(last.id);
  });

  it("returns only events inside the window, ascending", async () => {
    const now = new Date();
    const events = await getThisWeekEvents(now);
    const times = events.map((event) => Date.parse(event.startsAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(
      times.every((time) => time >= now.getTime() && time < now.getTime() + WEEK_MS),
    ).toBe(true);
  });

  it("returns at least 5 events with the default now", async () => {
    const events = await getThisWeekEvents();
    expect(events.length).toBeGreaterThanOrEqual(5);
  });
});

describe("getEventCities", () => {
  it("returns unique cities sorted alphabetically", async () => {
    const cities = await getEventCities();
    expect(new Set(cities).size).toBe(cities.length);
    expect(cities).toEqual([...cities].sort((a, b) => a.localeCompare(b, "es")));
    expect(cities.length).toBeGreaterThanOrEqual(3);
  });
});

describe("getEventPath", () => {
  it("builds the event detail path from the slug", () => {
    expect(getEventPath("noche-de-rock-andino")).toBe(
      "/events/noche-de-rock-andino",
    );
  });
});

describe("eventsMock invariants", () => {
  it("defines 12 events with kebab-case slugs", () => {
    expect(eventsMock).toHaveLength(12);
    expect(
      eventsMock.every((event) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(event.slug)),
    ).toBe(true);
  });

  it("has at least 2 events per category", () => {
    for (const { value } of EVENT_CATEGORIES) {
      expect(
        filterEventsByCategory(eventsMock, value).length,
        `category ${value}`,
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("points every imageSrc to an existing file in public/ and has an imageAlt", () => {
    for (const event of eventsMock) {
      const file = path.join(process.cwd(), "public", event.imageSrc);
      expect(fs.existsSync(file), event.imageSrc).toBe(true);
      expect(event.imageAlt.trim().length, event.id).toBeGreaterThan(0);
    }
  });

  it("has at least 1 sold-out and 2 low-stock events", () => {
    expect(
      eventsMock.filter((event) => event.status === "sold-out").length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      eventsMock.filter((event) => event.status === "low-stock").length,
    ).toBeGreaterThanOrEqual(2);
  });

  it("has 6 events within the next 7 days", () => {
    const now = Date.now();
    const thisWeek = eventsMock.filter((event) => {
      const time = Date.parse(event.startsAt);
      return time >= now && time < now + WEEK_MS;
    });
    expect(thisWeek).toHaveLength(6);
  });
});
