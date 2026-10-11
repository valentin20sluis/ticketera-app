import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { parseEventListOptions } from "./event-list-options.schema";

const UUID = "3f1c2a54-8d3e-4b7a-9c1e-2a6b5d4c3e1f";

describe("parseEventListOptions", () => {
  it("applies the default limit", () => {
    expect(parseEventListOptions({})).toEqual({ limit: 100 });
  });

  it("accepts valid options", () => {
    expect(parseEventListOptions({ organizerId: UUID, status: "draft", limit: 5 })).toEqual({
      organizerId: UUID,
      status: "draft",
      limit: 5,
    });
  });

  it.each([
    ["invalid uuid", { organizerId: "nope" }],
    ["status outside the whitelist", { status: "archived" }],
    ["limit 0", { limit: 0 }],
    ["limit 101", { limit: 101 }],
    ["non-integer limit", { limit: 1.5 }],
    ["unknown key", { foo: "bar" }],
  ])("rejects %s", (_name, raw) => {
    expect(() => parseEventListOptions(raw)).toThrow(ZodError);
  });
});
