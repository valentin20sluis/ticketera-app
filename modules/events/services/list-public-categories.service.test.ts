import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-helpers";
import { eventCategories } from "@/lib/db/schema";
import { listPublicCategories } from "./list-public-categories.service";

describe("listPublicCategories", () => {
  it("returns [] when the table is empty", async () => {
    expect(await listPublicCategories(await createTestDb())).toEqual([]);
  });

  it("returns { id, name, iconKey, colorKey } ordered by name", async () => {
    const db = await createTestDb();
    await db.insert(eventCategories).values([
      { name: "Teatro", iconKey: "theater", colorKey: "purple" },
      { name: "Deportes", iconKey: "sports", colorKey: "blue" },
    ]);

    const result = await listPublicCategories(db);

    expect(result.map((c) => c.name)).toEqual(["Deportes", "Teatro"]);
    expect(result[0]).toEqual({
      id: expect.any(String),
      name: "Deportes",
      iconKey: "sports",
      colorKey: "blue",
    });
  });
});
