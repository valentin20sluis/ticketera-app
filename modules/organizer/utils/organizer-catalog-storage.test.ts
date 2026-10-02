import { beforeEach, describe, expect, it } from "vitest";

import {
  appendOrganizerEvent,
  getEmptyCatalog,
  readStoredCatalog,
  writeStoredCatalog,
} from "@/modules/organizer/utils/organizer-catalog-storage";
import type {
  OrganizerCatalog,
  OrganizerEvent,
  OrganizerEventFunction,
  OrganizerFunctionZone,
  OrganizerVenue,
  OrganizerVenueZone,
} from "@/modules/organizer/types/organizer.types";

const STORAGE_KEY = "ticketera:organizer-catalog";

function buildVenue(id: string): OrganizerVenue {
  return {
    id,
    organizerId: "organizer-1",
    name: "Venue",
    address: "Address 123",
    city: "Lima",
    lat: -12,
    lng: -77,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildVenueZone(id: string, venueId: string): OrganizerVenueZone {
  return {
    id,
    venueId,
    name: "Zone",
    shapeX: 0,
    shapeY: 0,
    shapeWidth: 50,
    shapeHeight: 50,
    capacity: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildEvent(id: string): OrganizerEvent {
  return {
    id,
    organizerId: "organizer-1",
    categoryId: "music",
    venueId: "venue-1",
    slug: `event-${id}`,
    title: "Event",
    description: "Description",
    imageUrl: "https://example.com/image.png",
    doorsOpenTime: "19:00",
    showStartTime: "20:00",
    minimumAge: "18+",
    admissionType: "General",
    status: "draft",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildEventFunction(id: string, eventId: string): OrganizerEventFunction {
  return {
    id,
    eventId,
    startsAt: "2026-02-01T20:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

function buildFunctionZone(id: string, functionId: string): OrganizerFunctionZone {
  return {
    id,
    functionId,
    venueZoneId: "venue-zone-1",
    price: 100,
    currency: "PEN",
    capacity: 100,
    createdAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("organizer-catalog-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns an empty catalog when nothing is stored", () => {
    expect(readStoredCatalog()).toEqual(getEmptyCatalog());
  });

  it("returns an empty catalog without throwing when the stored value is not valid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "esto no es json");

    expect(() => readStoredCatalog()).not.toThrow();
    expect(readStoredCatalog()).toEqual(getEmptyCatalog());
  });

  it("round-trips a catalog through writeStoredCatalog + readStoredCatalog", () => {
    const catalog: OrganizerCatalog = {
      venues: [buildVenue("venue-1")],
      venueZones: [buildVenueZone("venue-zone-1", "venue-1")],
      events: [buildEvent("event-1")],
      eventFunctions: [buildEventFunction("function-1", "event-1")],
      functionZones: [buildFunctionZone("function-zone-1", "function-1")],
    };

    writeStoredCatalog(catalog);

    expect(readStoredCatalog()).toEqual(catalog);
  });

  it("appendOrganizerEvent with venue: null adds only the non-venue entities and keeps what was already stored", () => {
    const firstEntry = {
      venue: null,
      venueZones: [buildVenueZone("venue-zone-1", "venue-1")],
      event: buildEvent("event-1"),
      eventFunction: buildEventFunction("function-1", "event-1"),
      functionZones: [buildFunctionZone("function-zone-1", "function-1")],
    };

    const afterFirst = appendOrganizerEvent(firstEntry);

    expect(afterFirst.venues).toEqual([]);
    expect(afterFirst.events).toEqual([firstEntry.event]);

    const secondEntry = {
      venue: null,
      venueZones: [buildVenueZone("venue-zone-2", "venue-1")],
      event: buildEvent("event-2"),
      eventFunction: buildEventFunction("function-2", "event-2"),
      functionZones: [buildFunctionZone("function-zone-2", "function-2")],
    };

    const afterSecond = appendOrganizerEvent(secondEntry);

    expect(afterSecond.venues).toEqual([]);
    expect(afterSecond.events).toEqual([firstEntry.event, secondEntry.event]);
    expect(afterSecond.eventFunctions).toEqual([
      firstEntry.eventFunction,
      secondEntry.eventFunction,
    ]);
    expect(afterSecond.venueZones).toEqual([
      ...firstEntry.venueZones,
      ...secondEntry.venueZones,
    ]);
    expect(afterSecond.functionZones).toEqual([
      ...firstEntry.functionZones,
      ...secondEntry.functionZones,
    ]);
  });

  it("appendOrganizerEvent with a non-null venue adds it to the venues array", () => {
    const venue = buildVenue("venue-1");
    const entry = {
      venue,
      venueZones: [buildVenueZone("venue-zone-1", "venue-1")],
      event: buildEvent("event-1"),
      eventFunction: buildEventFunction("function-1", "event-1"),
      functionZones: [buildFunctionZone("function-zone-1", "function-1")],
    };

    const result = appendOrganizerEvent(entry);

    expect(result.venues).toEqual([venue]);
  });
});
