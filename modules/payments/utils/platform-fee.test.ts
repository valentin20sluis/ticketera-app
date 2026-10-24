import { describe, expect, it } from "vitest";

import {
  InvalidPlatformFeeError,
  calculatePlatformFee,
  parsePlatformFeePercent,
} from "./platform-fee";

describe("calculatePlatformFee", () => {
  it.each([
    [10000, 10, 1000],
    [1005, 10, 101],
    [1004, 10, 100],
    [1, 10, 0],
    [5, 10, 1],
    [10000, 7.5, 750],
    [333, 33.33, 111],
    [10000, 0, 0],
    [0, 10, 0],
    [10000, 100, 10000],
    [1, 100, 1],
  ])("total %d at %d%% = %d", (total, percent, expected) => {
    expect(calculatePlatformFee(total, percent)).toBe(expected);
  });

  it("always returns a non-negative integer not above the total", () => {
    for (const total of [0, 1, 7, 99, 1005, 123457]) {
      for (const percent of [0, 0.01, 3.33, 7.5, 10, 33.33, 99.99, 100]) {
        const fee = calculatePlatformFee(total, percent);
        expect(Number.isInteger(fee)).toBe(true);
        expect(fee).toBeGreaterThanOrEqual(0);
        expect(fee).toBeLessThanOrEqual(total);
      }
    }
  });

  it.each([NaN, -1, 101, Infinity])("rejects invalid percent %s", (percent) => {
    expect(() => calculatePlatformFee(1000, percent)).toThrow(InvalidPlatformFeeError);
  });

  it.each([-1, 1.5, NaN, Infinity])("rejects invalid total %s", (total) => {
    expect(() => calculatePlatformFee(total, 10)).toThrow(RangeError);
  });
});

describe("parsePlatformFeePercent", () => {
  it.each([
    ["10", 10],
    ["0", 0],
    ["7.5", 7.5],
    ["100", 100],
    [" 10 ", 10],
  ])("accepts %j", (raw, expected) => {
    expect(parsePlatformFeePercent(raw)).toBe(expected);
  });

  it.each([undefined, "", "  ", "abc", "NaN", "-1", "101", "Infinity"])(
    "throws InvalidPlatformFeeError for %j",
    (raw) => {
      expect(() => parsePlatformFeePercent(raw)).toThrow(InvalidPlatformFeeError);
    },
  );
});
