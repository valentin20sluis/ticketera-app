import { describe, expect, it } from "vitest";
import { checkInCodeSchema, checkInInputSchema } from "./check-in.schema";

const UUID = "3f2b8c1e-5a4d-4e6f-9a1b-2c3d4e5f6a7b";

describe("checkInCodeSchema", () => {
  it("accepts a plain UUID", () => {
    expect(checkInCodeSchema.parse(UUID)).toBe(UUID);
  });

  it("normalizes whitespace, line breaks and case", () => {
    expect(checkInCodeSchema.parse(`  ${UUID.toUpperCase()} \n`)).toBe(UUID);
    expect(checkInCodeSchema.parse(`${UUID.slice(0, 8)} \n${UUID.slice(8)}`)).toBe(UUID);
  });

  it.each(["", "   ", "3F2B8C1E", "TICKETERA-123-1", "not-a-uuid", "x".repeat(201)])("rejects %j", (value) => {
    expect(checkInCodeSchema.safeParse(value).success).toBe(false);
  });
});

describe("checkInInputSchema", () => {
  it("accepts a uuid eventId and any string code up to 200 chars", () => {
    expect(checkInInputSchema.safeParse({ eventId: UUID, code: "TICKETERA-1-1" }).success).toBe(true);
    expect(checkInInputSchema.safeParse({ eventId: UUID, code: "" }).success).toBe(true);
  });

  it("rejects bad eventId, non-string and too long code", () => {
    expect(checkInInputSchema.safeParse({ eventId: "x", code: UUID }).success).toBe(false);
    expect(checkInInputSchema.safeParse({ eventId: UUID, code: 1 }).success).toBe(false);
    expect(checkInInputSchema.safeParse({ eventId: UUID, code: "a".repeat(201) }).success).toBe(false);
  });
});
