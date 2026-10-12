import { describe, expect, it } from "vitest";

import {
  eventDetailsSchema,
  functionZonesStepSchema,
  venueStepSchema,
  zoneRowSchema,
} from "@/modules/organizer/schemas/create-event.schema";

const validDetails = {
  title: "Concierto de prueba",
  description: "Una descripción de al menos diez caracteres",
  categoryId: "music",
  imageUrl: "https://example.com/image.jpg",
  doorsOpenTime: "19:00",
  showStartTime: "20:30",
  minimumAge: "18+",
  admissionType: "General",
};

describe("eventDetailsSchema", () => {
  it("acepta datos válidos", () => {
    const result = eventDetailsSchema.safeParse(validDetails);

    expect(result.success).toBe(true);
  });

  it("rechaza una imageUrl que no es una URL", () => {
    const result = eventDetailsSchema.safeParse({
      ...validDetails,
      imageUrl: "no-es-una-url",
    });

    expect(result.success).toBe(false);
  });
});

describe("venueStepSchema", () => {
  it("rechaza mode existing con venueId vacío", () => {
    const result = venueStepSchema.safeParse({ mode: "existing", venueId: "" });

    expect(result.success).toBe(false);
  });

  it("acepta mode new con venue válido", () => {
    const result = venueStepSchema.safeParse({
      mode: "new",
      venue: {
        name: "Arena Central",
        address: "Av. Siempre Viva 123",
        city: "Lima",
        lat: -12.05,
        lng: -77.04,
      },
    });

    expect(result.success).toBe(true);
  });
});

describe("zoneRowSchema", () => {
  it("rechaza capacity 0", () => {
    const result = zoneRowSchema.safeParse({ name: "General", capacity: 0, price: 10 });

    expect(result.success).toBe(false);
  });

  it("rechaza price negativo", () => {
    const result = zoneRowSchema.safeParse({ name: "General", capacity: 10, price: -1 });

    expect(result.success).toBe(false);
  });
});

describe("zoneRowSchema numbered seats", () => {
  const base = { name: "VIP", capacity: 0, price: 10 };

  it("fuerza capacity a filas x columnas", () => {
    const result = zoneRowSchema.safeParse({ ...base, capacity: 999, seatRows: 4, seatColumns: 5 });

    expect(result.success && result.data.capacity).toBe(20);
  });

  it("rechaza solo uno de los dos", () => {
    expect(zoneRowSchema.safeParse({ ...base, seatRows: 4 }).success).toBe(false);
    expect(zoneRowSchema.safeParse({ ...base, seatColumns: 4 }).success).toBe(false);
  });

  it("rechaza filas > 26 y columnas > 40", () => {
    expect(zoneRowSchema.safeParse({ ...base, seatRows: 27, seatColumns: 5 }).success).toBe(false);
    expect(zoneRowSchema.safeParse({ ...base, seatRows: 26, seatColumns: 41 }).success).toBe(false);
    expect(zoneRowSchema.safeParse({ ...base, seatRows: 26, seatColumns: 40 }).success).toBe(true);
  });
});

describe("functionZonesStepSchema", () => {
  it("rechaza zones vacío", () => {
    const result = functionZonesStepSchema.safeParse({
      startsAt: "2026-05-10T19:00",
      zones: [],
    });

    expect(result.success).toBe(false);
  });

  it("acepta una zona válida", () => {
    const result = functionZonesStepSchema.safeParse({
      startsAt: "2026-05-10T19:00",
      zones: [{ name: "General", capacity: 100, price: 50 }],
    });

    expect(result.success).toBe(true);
  });
});
