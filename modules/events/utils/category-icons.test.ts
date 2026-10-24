import { Baby, Music, PartyPopper, Presentation, Tag, Theater, Trophy } from "lucide-react";
import { describe, expect, it } from "vitest";
import { getCategoryIcon } from "./category-icons";

describe("getCategoryIcon", () => {
  it.each([
    ["music", Music],
    ["sports", Trophy],
    ["theater", Theater],
    ["festivals", PartyPopper],
    ["conferences", Presentation],
    ["family", Baby],
  ])("maps %s", (key, icon) => {
    expect(getCategoryIcon(key)).toBe(icon);
  });

  it("falls back to Tag for unknown keys", () => {
    expect(getCategoryIcon("nope")).toBe(Tag);
  });
});
