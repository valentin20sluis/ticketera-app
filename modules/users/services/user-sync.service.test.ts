import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import { users } from "@/lib/db/schema";
import { markClerkUserDeleted, upsertClerkUser } from "./user-sync.service";

describe("upsertClerkUser", () => {
  it("creates a customer by default", async () => {
    const db = await createTestDb();
    const row = await upsertClerkUser(db, { clerkUserId: "clerk_1", email: "a@example.com", fullName: "A" });

    expect(row.role).toBe("customer");
  });

  it("applies the invited role from metadata on creation", async () => {
    const db = await createTestDb();
    const row = await upsertClerkUser(db, {
      clerkUserId: "clerk_2",
      email: "org@example.com",
      fullName: "Org",
      publicRole: "organizer",
    });

    expect(row.role).toBe("organizer");
  });

  it("keeps the stored role and updates identity fields on re-sync", async () => {
    const db = await createTestDb();
    await upsertClerkUser(db, { clerkUserId: "clerk_3", email: "a@example.com", fullName: "A" });
    await db.update(users).set({ role: "admin" }).where(eq(users.clerkUserId, "clerk_3"));

    const row = await upsertClerkUser(db, { clerkUserId: "clerk_3", email: "new@example.com", fullName: "Nuevo" });

    expect(row.role).toBe("admin");
    expect(row.email).toBe("new@example.com");
    expect(row.fullName).toBe("Nuevo");
  });

  it("makes the super admin email a super_admin", async () => {
    const db = await createTestDb();
    const row = await upsertClerkUser(db, {
      clerkUserId: "clerk_root",
      email: "slvalentin19@gmail.com",
      fullName: "Root",
    });

    expect(row.role).toBe("super_admin");
  });
});

describe("markClerkUserDeleted", () => {
  it("suspends the row instead of deleting it, so orders keep their FK", async () => {
    const db = await createTestDb();
    await upsertClerkUser(db, { clerkUserId: "clerk_4", email: "d@example.com", fullName: "D" });

    await markClerkUserDeleted(db, "clerk_4");

    const [row] = await db.select().from(users).where(eq(users.clerkUserId, "clerk_4"));
    expect(row.isSuspended).toBe(true);
  });
});
