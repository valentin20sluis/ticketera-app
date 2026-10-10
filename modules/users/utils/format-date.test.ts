import { describe, expect, it } from "vitest";
import { formatShortDate } from "./format-date";

describe("formatShortDate", () => {
  it("uses a 2-digit day and a 3-letter Spanish month", () => {
    expect(formatShortDate(new Date("2026-09-09T15:00:00Z"))).toBe("09 sep 2026");
    expect(formatShortDate(new Date("2026-01-20T15:00:00Z"))).toBe("20 ene 2026");
  });

  it("computes the day in America/Lima (UTC-5)", () => {
    expect(formatShortDate(new Date("2026-03-01T03:00:00Z"))).toBe("28 feb 2026");
    expect(formatShortDate(new Date("2026-01-01T04:59:00Z"))).toBe("31 dic 2025");
  });
});
