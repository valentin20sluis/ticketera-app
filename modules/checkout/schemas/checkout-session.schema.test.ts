import { describe, expect, it } from "vitest";
import { checkoutSessionSchema } from "./checkout-session.schema";

const id = "3f2b8c1e-9d4a-4b6e-8a1c-2d5e7f9a0b3c";

describe("checkoutSessionSchema", () => {
  it("accepts valid items", () => {
    expect(checkoutSessionSchema.safeParse({ items: [{ functionZoneId: id, quantity: 2 }] }).success).toBe(true);
  });

  it.each([
    { items: [] },
    { items: [{ functionZoneId: "nope", quantity: 1 }] },
    { items: [{ functionZoneId: id, quantity: 0 }] },
    { items: [{ functionZoneId: id, quantity: 1.5 }] },
    { items: [{ functionZoneId: id, quantity: 11 }] },
    {},
  ])("rejects %j", (body) => {
    expect(checkoutSessionSchema.safeParse(body).success).toBe(false);
  });
});
