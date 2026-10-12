import { describe, expect, it } from "vitest";
import { checkoutSessionSchema } from "./checkout-session.schema";

const id = "3f2b8c1e-9d4a-4b6e-8a1c-2d5e7f9a0b3c";
const seat = (row: number, number: number) => ({ row, number });

describe("checkoutSessionSchema", () => {
  it.each([
    { items: [{ functionZoneId: id, quantity: 2 }] },
    { items: [{ functionZoneId: id, seats: [seat(1, 1), seat(2, 3)] }] },
    { items: [{ functionZoneId: id, quantity: 1 }, { functionZoneId: id, seats: [seat(1, 1)] }] },
  ])("accepts %j", (body) => {
    expect(checkoutSessionSchema.safeParse(body).success).toBe(true);
  });

  it.each([
    { items: [] },
    { items: [{ functionZoneId: "nope", quantity: 1 }] },
    { items: [{ functionZoneId: id, quantity: 0 }] },
    { items: [{ functionZoneId: id, quantity: 1.5 }] },
    { items: [{ functionZoneId: id, quantity: 11 }] },
    { items: [{ functionZoneId: id }] },
    { items: [{ functionZoneId: id, quantity: 1, seats: [seat(1, 1)] }] },
    { items: [{ functionZoneId: id, seats: [] }] },
    { items: [{ functionZoneId: id, seats: [seat(1, 1), seat(1, 1)] }] },
    { items: [{ functionZoneId: id, seats: Array.from({ length: 7 }, (_, i) => seat(1, i + 1)) }] },
    { items: [{ functionZoneId: id, seats: [seat(0, 1)] }] },
    { items: [{ functionZoneId: id, seats: [seat(1, 0)] }] },
    {},
  ])("rejects %j", (body) => {
    expect(checkoutSessionSchema.safeParse(body).success).toBe(false);
  });
});
