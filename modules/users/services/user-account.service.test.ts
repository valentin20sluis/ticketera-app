import { beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-helpers";
import { orders, users } from "@/lib/db/schema";
import type { CurrentUser } from "./current-user.service";
import {
  bulkChangeRole,
  bulkDelete,
  bulkSetSuspended,
  deleteUser,
  updateUserProfile,
  UserActionError,
} from "./user-account.service";

const clerk = vi.hoisted(() => ({ updateUser: vi.fn(), deleteUser: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ clerkClient: async () => ({ users: clerk }) }));

async function setup() {
  const db = await createTestDb();
  const [actor, root, a, b] = await db
    .insert(users)
    .values([
      { clerkUserId: "c_actor", email: "actor@example.com", fullName: "Actor", role: "super_admin" },
      { clerkUserId: "c_root", email: "root@example.com", fullName: "Root", role: "super_admin" },
      { clerkUserId: "c_a", email: "Ana@Example.com", fullName: "Ana Perez", role: "customer" },
      { clerkUserId: "c_b", email: "b@example.com", fullName: "Beto", role: "customer" },
    ])
    .returning();
  const row = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0];
  return { db, actor: actor as CurrentUser, root, a, b, row };
}

beforeEach(() => {
  clerk.updateUser.mockReset().mockResolvedValue({});
  clerk.deleteUser.mockReset().mockResolvedValue({});
});

describe("updateUserProfile", () => {
  it("updates Clerk before the DB, splitting first name and last name", async () => {
    const { db, actor, a, row } = await setup();
    clerk.updateUser.mockImplementation(async () => {
      expect((await row(a.id)).fullName).toBe("Ana Perez");
    });

    await updateUserProfile(db, actor, a.id, { fullName: "  Ana Maria Perez ", role: "organizer", isSuspended: true });

    expect(clerk.updateUser).toHaveBeenCalledWith("c_a", { firstName: "Ana", lastName: "Maria Perez" });
    const updated = await row(a.id);
    expect(updated).toMatchObject({ fullName: "Ana Maria Perez", role: "organizer", isSuspended: true });
  });

  it("leaves the DB untouched when Clerk fails", async () => {
    const { db, actor, a, row } = await setup();
    clerk.updateUser.mockRejectedValue(new Error("clerk down"));

    await expect(
      updateUserProfile(db, actor, a.id, { fullName: "Otro", role: "organizer" }),
    ).rejects.toThrow("clerk down");

    expect(await row(a.id)).toMatchObject({ fullName: "Ana Perez", role: "customer" });
  });

  it("does not call Clerk when the name is unchanged", async () => {
    const { db, actor, a, row } = await setup();

    await updateUserProfile(db, actor, a.id, { fullName: "Ana Perez", role: "admin" });

    expect(clerk.updateUser).not.toHaveBeenCalled();
    expect((await row(a.id)).role).toBe("admin");
  });

  it("rejects the root account and non super_admin actors", async () => {
    const { db, actor, root, a } = await setup();

    await expect(updateUserProfile(db, actor, root.id, { fullName: "X" })).rejects.toThrow();
    await expect(
      updateUserProfile(db, { ...a, role: "admin" } as CurrentUser, a.id, { fullName: "X" }),
    ).rejects.toThrow();
    expect(clerk.updateUser).not.toHaveBeenCalled();
  });

  it("throws a domain error and changes nothing on an already deleted user", async () => {
    const { db, actor, a, row } = await setup();
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, a.id));

    const attempt = updateUserProfile(db, actor, a.id, { fullName: "Otro", role: "admin" });
    await expect(attempt).rejects.toBeInstanceOf(UserActionError);
    await expect(attempt).rejects.toThrow("Usuario no encontrado");

    expect(clerk.updateUser).not.toHaveBeenCalled();
    expect(await row(a.id)).toMatchObject({ fullName: "Ana Perez", role: "customer" });
  });
});

describe("deleteUser", () => {
  it("requires the matching email, ignoring case", async () => {
    const { db, actor, a, row } = await setup();

    const mismatch = deleteUser(db, actor, a.id, "otro@example.com");
    await expect(mismatch).rejects.toBeInstanceOf(UserActionError);
    await expect(mismatch).rejects.toThrow("El correo de confirmación no coincide");
    expect(clerk.deleteUser).not.toHaveBeenCalled();

    await deleteUser(db, actor, a.id, "ANA@example.COM");
    expect((await row(a.id)).deletedAt).not.toBeNull();
  });

  it("rejects the root account", async () => {
    const { db, actor, root } = await setup();

    await expect(deleteUser(db, actor, root.id, root.email)).rejects.toThrow(
      "No puedes modificar esta cuenta",
    );
    expect(clerk.deleteUser).not.toHaveBeenCalled();
  });

  it("calls Clerk first and fails without DB changes if Clerk errors", async () => {
    const { db, actor, a, row } = await setup();
    clerk.deleteUser.mockRejectedValue(Object.assign(new Error("boom"), { status: 500 }));

    await expect(deleteUser(db, actor, a.id, a.email)).rejects.toThrow("boom");

    expect(await row(a.id)).toMatchObject({ deletedAt: null, isSuspended: false });
  });

  it("tolerates a Clerk 404 and keeps the user's orders", async () => {
    const { db, actor, a, row } = await setup();
    clerk.deleteUser.mockRejectedValue(Object.assign(new Error("not found"), { status: 404 }));
    await db.insert(orders).values({
      customerId: a.id,
      totalAmount: "10.00",
      expiresAt: new Date(Date.now() + 60_000),
    });

    await deleteUser(db, actor, a.id, a.email);

    expect(await row(a.id)).toMatchObject({ isSuspended: true });
    expect((await row(a.id)).deletedAt).not.toBeNull();
    expect(await db.select().from(orders)).toHaveLength(1);
  });
});

describe("bulk operations", () => {
  const missing = "00000000-0000-4000-8000-000000000000";

  it("changes role only for allowed users and reports the rest", async () => {
    const { db, actor, root, a, b, row } = await setup();

    const result = await bulkChangeRole(db, actor, [a.id, b.id, root.id, missing], "organizer");

    expect(result.done).toBe(2);
    expect(result.failed.map((f) => f.userId).sort()).toEqual([root.id, missing].sort());
    expect((await row(a.id)).role).toBe("organizer");
    expect((await row(root.id)).role).toBe("super_admin");
  });

  it("suspends and reactivates in bulk", async () => {
    const { db, actor, root, a, b, row } = await setup();

    expect(await bulkSetSuspended(db, actor, [a.id, b.id, root.id], true)).toMatchObject({ done: 2 });
    expect((await row(b.id)).isSuspended).toBe(true);
    expect((await row(root.id)).isSuspended).toBe(false);

    await bulkSetSuspended(db, actor, [a.id], false);
    expect((await row(a.id)).isSuspended).toBe(false);
  });

  it("bulkDelete continues after a Clerk failure", async () => {
    const { db, actor, root, a, b, row } = await setup();
    clerk.deleteUser.mockImplementation(async (clerkId: string) => {
      if (clerkId === "c_a") throw new Error("clerk down");
    });

    const result = await bulkDelete(db, actor, [a.id, b.id, root.id]);

    expect(result.done).toBe(1);
    expect(result.failed).toEqual(
      expect.arrayContaining([
        { userId: root.id, reason: expect.any(String) },
        { userId: a.id, reason: "No se pudo eliminar" },
      ]),
    );
    expect((await row(a.id)).deletedAt).toBeNull();
    expect((await row(b.id)).deletedAt).not.toBeNull();
  });
});
