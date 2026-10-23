import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-helpers";
import { newsletterSubscribers } from "@/lib/db/schema";
import { subscribe } from "./newsletter.service";

describe("subscribe", () => {
  it("inserts the email", async () => {
    const db = await createTestDb();
    await subscribe(db, "ana@example.com");
    const rows = await db.select().from(newsletterSubscribers);
    expect(rows.map((r) => r.email)).toEqual(["ana@example.com"]);
  });

  it("ignores duplicates without throwing", async () => {
    const db = await createTestDb();
    await subscribe(db, "ana@example.com");
    await expect(subscribe(db, "ana@example.com")).resolves.toBeUndefined();
    expect(await db.select().from(newsletterSubscribers)).toHaveLength(1);
  });
});
