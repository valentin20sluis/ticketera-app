import { describe, expect, it } from "vitest";
import { organizerProfileSchema } from "./organizer-profile.schema";

const parse = (ruc: string) => organizerProfileSchema.safeParse({ ruc });

describe("organizerProfileSchema", () => {
  it.each(["10", "15", "17", "20"])("accepts prefix %s", (prefix) => {
    const ruc = `${prefix}123456789`;
    expect(parse(ruc)).toMatchObject({ success: true, data: { ruc } });
  });

  it("trims and maps empty to null", () => {
    expect(parse("  20123456789 ")).toMatchObject({ success: true, data: { ruc: "20123456789" } });
    expect(parse("   ")).toMatchObject({ success: true, data: { ruc: null } });
  });

  it.each(["2012345678", "201234567890", "2012345678a", "20-12345678", "201 2345678", "30123456789"])(
    "rejects %s",
    (ruc) => {
      expect(parse(ruc).success).toBe(false);
    },
  );
});
