import { describe, expect, it } from "vitest";
import { formatDateTime, formatPrice } from "@/lib/formatters";

describe("formatPrice", () => {
  it("formats whole amounts without decimals", () => {
    expect(formatPrice(80)).toBe("S/ 80");
  });

  it("formats fractional amounts with two decimals", () => {
    expect(formatPrice(80.5)).toBe("S/ 80.50");
  });

  it("groups thousands with a comma", () => {
    expect(formatPrice(1200)).toBe("S/ 1,200");
  });
});

describe("formatDateTime", () => {
  it("uses the Lima calendar day when it differs from the UTC day", () => {
    const result = formatDateTime("2026-03-15T01:30:00.000Z");
    expect(result).toMatch(/^sáb\.? 14 mar\.? · 20:30$/);
  });

  it("uses 24 hour format for afternoon times", () => {
    const result = formatDateTime("2026-03-14T21:05:00.000Z");
    expect(result).toMatch(/· 16:05$/);
    expect(result).not.toMatch(/[ap]\.?\s?m/i);
  });

  it("includes abbreviated weekday, day, abbreviated month and HH:mm", () => {
    const result = formatDateTime("2026-07-08T15:00:00.000Z");
    expect(result).toMatch(/^\p{L}{3,4}\.? \d{1,2} \p{L}{3,4}\.? · \d{2}:\d{2}$/u);
  });
});
