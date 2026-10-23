import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import { users } from "@/lib/db/schema";
import { OrganizerProfileError, saveOrganizerProfile } from "./organizer-profile.service";

const TIMEOUT = 60_000;
let db: Awaited<ReturnType<typeof createTestDb>>;
let org: typeof users.$inferSelect;
let other: typeof users.$inferSelect;
let admin: typeof users.$inferSelect;

const rucOf = async (id: string) =>
  (await db.select({ ruc: users.ruc }).from(users).where(eq(users.id, id)))[0].ruc;

beforeAll(async () => {
  db = await createTestDb();
  [org, other, admin] = await db
    .insert(users)
    .values([
      { clerkUserId: "c_org", email: "org@example.com", fullName: "Org", role: "organizer" },
      { clerkUserId: "c_other", email: "other@example.com", fullName: "Other", role: "organizer" },
      { clerkUserId: "c_admin", email: "admin@example.com", fullName: "Admin", role: "admin" },
    ])
    .returning();
}, TIMEOUT);

describe("saveOrganizerProfile", () => {
  it("saves the trimmed RUC only for the actor and bumps updated_at", async () => {
    expect(await saveOrganizerProfile(db, org, { ruc: " 20123456789 " })).toBe("20123456789");
    expect(await rucOf(org.id)).toBe("20123456789");
    expect(await rucOf(other.id)).toBeNull();
    const [row] = await db.select().from(users).where(eq(users.id, org.id));
    expect(row.updatedAt.getTime()).toBeGreaterThanOrEqual(org.updatedAt.getTime());
  });

  it("stores null for an empty RUC", async () => {
    await saveOrganizerProfile(db, org, { ruc: "20123456789" });
    expect(await saveOrganizerProfile(db, org, { ruc: "" })).toBeNull();
    expect(await rucOf(org.id)).toBeNull();
  });

  it("rejects non-organizers without writing", async () => {
    await expect(saveOrganizerProfile(db, admin, { ruc: "20123456789" })).rejects.toBeInstanceOf(
      OrganizerProfileError,
    );
    expect(await rucOf(admin.id)).toBeNull();
  });

  it("rejects invalid input without writing", async () => {
    await expect(saveOrganizerProfile(db, other, { ruc: "30123456789" })).rejects.toThrow("RUC no válido");
    await expect(saveOrganizerProfile(db, other, {})).rejects.toBeInstanceOf(OrganizerProfileError);
    expect(await rucOf(other.id)).toBeNull();
  });
});
