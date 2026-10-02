import { describe, expect, it } from "vitest";

import {
  buildOrganizerEventEntry,
  buildStackedZoneShape,
  type CreateEventFormValues,
} from "@/modules/organizer/utils/build-organizer-event-entry";

function expectNoOverlap(total: number) {
  const shapes = Array.from({ length: total }, (_, index) =>
    buildStackedZoneShape(index, total)
  );

  for (let i = 0; i < shapes.length - 1; i += 1) {
    expect(shapes[i].y + shapes[i].height).toBeLessThanOrEqual(shapes[i + 1].y);
  }
}

describe("buildStackedZoneShape", () => {
  it("no genera superposición con total: 1", () => {
    expectNoOverlap(1);
  });

  it("no genera superposición con total: 3", () => {
    expectNoOverlap(3);
  });
});

const baseValues: CreateEventFormValues = {
  details: {
    title: "Concierto de Prueba",
    description: "Una descripción de al menos diez caracteres",
    categoryId: "music",
    imageUrl: "https://example.com/image.jpg",
    doorsOpenTime: "19:00",
    showStartTime: "20:30",
    minimumAge: "18+",
    admissionType: "General",
  },
  venue: { mode: "existing", venueId: "venue-existing-001" },
  functionZones: {
    startsAt: "2026-05-10T19:00",
    zones: [
      { name: "General", capacity: 100, price: 50 },
      { name: "VIP", capacity: 20, price: 150 },
    ],
  },
};

describe("buildOrganizerEventEntry", () => {
  it("con mode new devuelve un venue nuevo y las venueZones usan ese venueId", () => {
    const values: CreateEventFormValues = {
      ...baseValues,
      venue: {
        mode: "new",
        venue: {
          name: "Arena Central",
          address: "Av. Siempre Viva 123",
          city: "Lima",
          lat: -12.05,
          lng: -77.04,
        },
      },
    };

    const entry = buildOrganizerEventEntry(values, { organizerId: "organizer-001" });

    expect(entry.venue).not.toBeNull();
    expect(entry.venue?.id).toBeTruthy();
    for (const venueZone of entry.venueZones) {
      expect(venueZone.venueId).toBe(entry.venue?.id);
    }
  });

  it("con mode existing devuelve venue null y las venueZones usan el venueId recibido", () => {
    const entry = buildOrganizerEventEntry(baseValues, { organizerId: "organizer-001" });

    expect(entry.venue).toBeNull();
    for (const venueZone of entry.venueZones) {
      expect(venueZone.venueId).toBe("venue-existing-001");
    }
  });

  it("el event.status generado es siempre draft", () => {
    const entry = buildOrganizerEventEntry(baseValues, { organizerId: "organizer-001" });

    expect(entry.event.status).toBe("draft");
  });

  it("genera la misma cantidad de venueZones y functionZones que filas en zones", () => {
    const entry = buildOrganizerEventEntry(baseValues, { organizerId: "organizer-001" });

    expect(entry.venueZones).toHaveLength(baseValues.functionZones.zones.length);
    expect(entry.functionZones).toHaveLength(baseValues.functionZones.zones.length);
  });
});
