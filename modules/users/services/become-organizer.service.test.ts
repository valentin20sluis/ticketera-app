import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import { users } from "@/lib/db/schema";
import type { CurrentUser } from "./current-user.service";
import { UserActionError } from "./user-account.service";
import { upsertClerkUser } from "./user-sync.service";
import { becomeOrganizer } from "./become-organizer.service";

async function setup(values: Partial<typeof users.$inferInsert> = {}) {
  const db = await createTestDb();
  const [user] = await db
    .insert(users)
    .values({ clerkUserId: "c_a", email: "ana@example.com", fullName: "Ana", role: "customer", ...values })
    .returning();
  const row = async () => (await db.select().from(users).where(eq(users.id, user.id)))[0];
  return { db, user: user as CurrentUser, row };
}

describe("becomeOrganizer", () => {
  it("upgrades an active customer and bumps updated_at (AC1)", async () => {
    const { db, user, row } = await setup();

    await expect(becomeOrganizer(db, user)).resolves.toBe("upgraded");

    const after = await row();
    expect(after.role).toBe("organizer");
    expect(after.updatedAt.getTime()).toBeGreaterThanOrEqual(user.updatedAt.getTime());
  });

  it("is idempotent for an organizer without touching the row (AC2)", async () => {
    const { db, user, row } = await setup({ role: "organizer" });

    await expect(becomeOrganizer(db, user)).resolves.toBe("already_organizer");

    expect((await row()).updatedAt).toEqual(user.updatedAt);
  });

  it.each(["admin", "super_admin"] as const)("rejects %s without downgrading (AC3)", async (role) => {
    const { db, user, row } = await setup({ role });

    const attempt = becomeOrganizer(db, user);
    await expect(attempt).rejects.toBeInstanceOf(UserActionError);
    await expect(attempt).rejects.toThrow("Tu cuenta ya tiene acceso al panel");

    expect((await row()).role).toBe(role);
  });

  it("rejects suspended and deleted customers (AC4)", async () => {
    const suspended = await setup({ isSuspended: true });
    const attempt = becomeOrganizer(suspended.db, suspended.user);
    await expect(attempt).rejects.toBeInstanceOf(UserActionError);
    await expect(attempt).rejects.toThrow("Tu cuenta está suspendida");
    expect((await suspended.row()).role).toBe("customer");

    const deleted = await setup({ deletedAt: new Date() });
    await expect(becomeOrganizer(deleted.db, deleted.user)).rejects.toBeInstanceOf(UserActionError);
    expect((await deleted.row()).role).toBe("customer");
  });

  it("resolves two concurrent calls as upgraded + already_organizer (AC5)", async () => {
    const { db, user, row } = await setup();

    const results = await Promise.all([becomeOrganizer(db, user), becomeOrganizer(db, user)]);

    expect([...results].sort()).toEqual(["already_organizer", "upgraded"]);
    expect((await row()).role).toBe("organizer");
  });

  it("decides by the DB, not by a stale actor (AC6)", async () => {
    const { db, user, row } = await setup({ role: "admin" });

    await expect(becomeOrganizer(db, { ...user, role: "customer" })).rejects.toBeInstanceOf(UserActionError);

    expect((await row()).role).toBe("admin");
  });

  it("keeps the role after a Clerk user.updated re-sync (AC7)", async () => {
    const { db, user, row } = await setup();
    await becomeOrganizer(db, user);

    await upsertClerkUser(db, {
      clerkUserId: "c_a",
      email: "ana@example.com",
      fullName: "Ana Perez",
      publicRole: "customer",
    });

    expect(await row()).toMatchObject({ role: "organizer", fullName: "Ana Perez" });
  });
});
