import { describe, expect, it, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-helpers";
import { users } from "@/lib/db/schema";
import { parseUserListParams } from "@/modules/users/schemas/user-list-params.schema";
import { eq } from "drizzle-orm";
import { UserActionError } from "./user-account.service";
import { countUsersByTab, listUsers, setUserSuspended } from "./user-admin.service";

vi.mock("@/modules/users/constants", () => ({ HIDDEN_FROM_PANEL_EMAILS: ["hidden@example.com"] }));

type Raw = Parameters<typeof parseUserListParams>[0];
const params = (raw: Raw = {}) => parseUserListParams(raw);
const names = (result: { rows: { fullName: string }[] }) => result.rows.map((row) => row.fullName);
const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

async function seed() {
  const db = await createTestDb();
  await db.insert(users).values([
    { clerkUserId: "c1", email: "ana@example.com", fullName: "ana", role: "customer", createdAt: daysAgo(100) },
    { clerkUserId: "c2", email: "beto@example.com", fullName: "Beto", role: "organizer", createdAt: daysAgo(20) },
    { clerkUserId: "c3", email: "carla@example.com", fullName: "Carla", role: "admin", createdAt: daysAgo(5) },
    { clerkUserId: "c4", email: "root@example.com", fullName: "Root", role: "super_admin", createdAt: daysAgo(3) },
    {
      clerkUserId: "c5",
      email: "dani@example.com",
      fullName: "Dani",
      role: "customer",
      isSuspended: true,
      createdAt: daysAgo(2),
    },
    {
      clerkUserId: "c6",
      email: "gone@example.com",
      fullName: "Eliminado",
      role: "customer",
      deletedAt: new Date(),
    },
    { clerkUserId: "c7", email: "hidden@example.com", fullName: "Oculto", role: "customer" },
  ]);
  return db;
}

describe("listUsers", () => {
  it("orders by created_at ascending by default and excludes deleted and hidden users", async () => {
    const db = await seed();
    const result = await listUsers(db, params());
    expect(names(result)).toEqual(["ana", "Beto", "Carla", "Root", "Dani"]);
    expect(result).toMatchObject({ total: 5, page: 1, pageSize: 10, totalPages: 1 });
    expect(await db.select().from(users)).toHaveLength(7);
  });

  it("paginates in SQL and clamps the page to the last one", async () => {
    const db = await seed();
    const second = await listUsers(db, params({ porPagina: "10", page: "2" }));
    expect(second.page).toBe(1);

    const rows = Array.from({ length: 12 }, (_, i) => ({
      clerkUserId: `p${i}`,
      email: `p${i}@example.com`,
      fullName: `P${i}`,
      role: "customer" as const,
      createdAt: daysAgo(1000 - i),
    }));
    await db.insert(users).values(rows);
    const page2 = await listUsers(db, params({ page: "2" }));
    expect(page2).toMatchObject({ total: 17, page: 2, totalPages: 2 });
    expect(page2.rows).toHaveLength(7);
    const clamped = await listUsers(db, params({ page: "99" }));
    expect(clamped.page).toBe(2);
  });

  it("filters by role and treats admin as admin + super_admin", async () => {
    const db = await seed();
    expect(names(await listUsers(db, params({ rol: "admin" })))).toEqual(["Carla", "Root"]);
    expect(names(await listUsers(db, params({ rol: "organizer" })))).toEqual(["Beto"]);
    expect(names(await listUsers(db, params({ rol: "customer" })))).toEqual(["ana", "Dani"]);
  });

  it("filters by state", async () => {
    const db = await seed();
    expect(names(await listUsers(db, params({ estado: "suspendido" })))).toEqual(["Dani"]);
    expect(await listUsers(db, params({ estado: "activo" }))).toMatchObject({ total: 4 });
  });

  it("filters by registration date", async () => {
    const db = await seed();
    expect(names(await listUsers(db, params({ registro: "7d" })))).toEqual(["Carla", "Root", "Dani"]);
    expect(names(await listUsers(db, params({ registro: "30d" })))).toEqual([
      "Beto",
      "Carla",
      "Root",
      "Dani",
    ]);
  });

  it("sorts by newest and by name ignoring case", async () => {
    const db = await seed();
    expect(names(await listUsers(db, params({ orden: "recientes" })))).toEqual([
      "Dani",
      "Root",
      "Carla",
      "Beto",
      "ana",
    ]);
    expect(names(await listUsers(db, params({ orden: "nombre-asc" })))).toEqual([
      "ana",
      "Beto",
      "Carla",
      "Dani",
      "Root",
    ]);
    expect(names(await listUsers(db, params({ orden: "nombre-desc" })))[0]).toBe("Root");
  });

  it("searches full_name and email case-insensitively", async () => {
    const db = await seed();
    expect(names(await listUsers(db, params({ q: "ANA" })))).toEqual(["ana"]);
    expect(names(await listUsers(db, params({ q: "carla@" })))).toEqual(["Carla"]);
  });

  it("treats %, _ and \\ in the search text as literals", async () => {
    const db = await seed();
    await db.insert(users).values([
      { clerkUserId: "s1", email: "s1@example.com", fullName: "100% real", role: "customer" },
      { clerkUserId: "s2", email: "s2@example.com", fullName: "a_b", role: "customer" },
      { clerkUserId: "s3", email: "s3@example.com", fullName: "axb", role: "customer" },
      { clerkUserId: "s4", email: "s4@example.com", fullName: "back\\slash", role: "customer" },
    ]);
    expect(names(await listUsers(db, params({ q: "100%" })))).toEqual(["100% real"]);
    expect(names(await listUsers(db, params({ q: "a_b" })))).toEqual(["a_b"]);
    expect(names(await listUsers(db, params({ q: "\\" })))).toEqual(["back\\slash"]);
    expect(names(await listUsers(db, params({ q: "%" })))).toEqual(["100% real"]);
  });
});

describe("setUserSuspended", () => {
  it("fails as not found and changes nothing on a deleted user", async () => {
    const db = await seed();
    const [actor] = await db.select().from(users).where(eq(users.clerkUserId, "c4"));
    const [gone] = await db.select().from(users).where(eq(users.clerkUserId, "c6"));

    const attempt = setUserSuspended(db, actor, gone.id, true);
    await expect(attempt).rejects.toBeInstanceOf(UserActionError);
    await expect(attempt).rejects.toThrow("Usuario no encontrado");

    const [after] = await db.select().from(users).where(eq(users.id, gone.id));
    expect(after.isSuspended).toBe(false);
  });

  it("suspends an active user", async () => {
    const db = await seed();
    const [actor] = await db.select().from(users).where(eq(users.clerkUserId, "c4"));
    const [ana] = await db.select().from(users).where(eq(users.clerkUserId, "c1"));

    await setUserSuspended(db, actor, ana.id, true);

    const [after] = await db.select().from(users).where(eq(users.id, ana.id));
    expect(after.isSuspended).toBe(true);
  });
});

describe("countUsersByTab", () => {
  it("counts every tab in one go, ignoring rol/estado and excluding deleted and hidden", async () => {
    const db = await seed();
    const expected = { all: 5, customer: 2, organizer: 1, admin: 2, suspended: 1 };
    expect(await countUsersByTab(db, params())).toEqual(expected);
    expect(await countUsersByTab(db, params({ rol: "organizer", estado: "suspendido" }))).toEqual(
      expected,
    );
  });

  it("respects q and registro", async () => {
    const db = await seed();
    expect(await countUsersByTab(db, params({ registro: "7d" }))).toEqual({
      all: 3,
      customer: 1,
      organizer: 0,
      admin: 2,
      suspended: 1,
    });
    expect(await countUsersByTab(db, params({ q: "beto" }))).toMatchObject({ all: 1, organizer: 1 });
  });
});
