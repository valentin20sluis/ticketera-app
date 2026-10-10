import { describe, expect, it } from "vitest";
import { createTestDb } from "@/lib/db/test-helpers";
import { users } from "@/lib/db/schema";
import { listUsers } from "./user-admin.service";

describe("listUsers", () => {
  it("hides the configured emails from the panel but keeps their rows", async () => {
    const db = await createTestDb();
    await db.insert(users).values([
      { clerkUserId: "clerk_hidden", email: "slvalentin97@gmail.com", fullName: "Oculto", role: "customer" },
      { clerkUserId: "clerk_visible", email: "org@example.com", fullName: "Visible", role: "organizer" },
    ]);

    const rows = await listUsers(db);

    expect(rows.map((row) => row.email)).toEqual(["org@example.com"]);
    const stored = await db.select().from(users);
    expect(stored).toHaveLength(2);
  });
});
