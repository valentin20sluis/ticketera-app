import { describe, expect, it } from "vitest";

import { getOrganizerEventSummaries } from "@/modules/organizer/utils/get-organizer-event-summaries";
import type { OrganizerCatalog } from "@/modules/organizer/types/organizer.types";

const ORGANIZER_ID = "organizer-1";

function buildCatalog(): OrganizerCatalog {
  return {
    venues: [
      {
        id: "venue-1",
        organizerId: ORGANIZER_ID,
        name: "Arena Central",
        address: "Address 123",
        city: "Lima",
        lat: -12,
        lng: -77,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    venueZones: [],
    events: [
      {
        id: "event-with-function",
        organizerId: ORGANIZER_ID,
        categoryId: "music",
        venueId: "venue-1",
        slug: "event-with-function",
        title: "Event With Function",
        description: "Description",
        imageUrl: "https://example.com/image.png",
        doorsOpenTime: "19:00",
        showStartTime: "20:00",
        minimumAge: "18+",
        admissionType: "General",
        status: "published",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "event-without-function",
        organizerId: ORGANIZER_ID,
        categoryId: "theater",
        venueId: "venue-1",
        slug: "event-without-function",
        title: "Event Without Function",
        description: "Description",
        imageUrl: "https://example.com/image2.png",
        doorsOpenTime: "18:00",
        showStartTime: "19:00",
        minimumAge: "Todas las edades",
        admissionType: "General",
        status: "draft",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "event-other-organizer",
        organizerId: "organizer-2",
        categoryId: "sports",
        venueId: "venue-1",
        slug: "event-other-organizer",
        title: "Event Other Organizer",
        description: "Description",
        imageUrl: "https://example.com/image3.png",
        doorsOpenTime: "16:00",
        showStartTime: "17:00",
        minimumAge: "Todas las edades",
        admissionType: "General",
        status: "published",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    eventFunctions: [
      {
        id: "function-1",
        eventId: "event-with-function",
        startsAt: "2026-03-01T20:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    functionZones: [
      {
        id: "function-zone-1",
        functionId: "function-1",
        venueZoneId: "venue-zone-1",
        price: 100,
        currency: "PEN",
        capacity: 300,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "function-zone-2",
        functionId: "function-1",
        venueZoneId: "venue-zone-2",
        price: 50,
        currency: "PEN",
        capacity: 700,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };
}

describe("getOrganizerEventSummaries", () => {
  it("resolves zonesCount and totalCapacity for an event with a function and 2 zones", () => {
    const summaries = getOrganizerEventSummaries(buildCatalog(), ORGANIZER_ID);
    const summary = summaries.find((item) => item.id === "event-with-function");

    expect(summary).toBeDefined();
    expect(summary?.startsAt).toBe("2026-03-01T20:00:00.000Z");
    expect(summary?.zonesCount).toBe(2);
    expect(summary?.totalCapacity).toBe(1000);
    expect(summary?.categoryName).toBe("Música");
    expect(summary?.venueName).toBe("Arena Central");
    expect(summary?.city).toBe("Lima");
  });

  it("returns startsAt: null and zero zones/capacity for an event without any eventFunction", () => {
    const summaries = getOrganizerEventSummaries(buildCatalog(), ORGANIZER_ID);
    const summary = summaries.find((item) => item.id === "event-without-function");

    expect(summary).toBeDefined();
    expect(summary?.startsAt).toBeNull();
    expect(summary?.zonesCount).toBe(0);
    expect(summary?.totalCapacity).toBe(0);
  });

  it("excludes events belonging to a different organizerId", () => {
    const summaries = getOrganizerEventSummaries(buildCatalog(), ORGANIZER_ID);

    expect(summaries.some((item) => item.id === "event-other-organizer")).toBe(false);
  });
});
