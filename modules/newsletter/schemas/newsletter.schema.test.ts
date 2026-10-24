import { describe, expect, it } from "vitest";
import { INVALID_EMAIL, newsletterEmailSchema } from "./newsletter.schema";

describe("newsletterEmailSchema", () => {
  it("trims and lowercases", () => {
    expect(newsletterEmailSchema.parse("  Ana@Example.COM ")).toBe("ana@example.com");
  });

  it.each(["", "   ", "sin-arroba", "a@", null])("rejects %j", (value) => {
    const result = newsletterEmailSchema.safeParse(value);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toBe(INVALID_EMAIL);
  });

  it("accepts 254 chars and rejects 255", () => {
    const email = (len: number) => `${"a".repeat(len - 12)}@example.com`;
    expect(newsletterEmailSchema.safeParse(email(254)).success).toBe(true);
    expect(newsletterEmailSchema.safeParse(email(255)).success).toBe(false);
  });
});
