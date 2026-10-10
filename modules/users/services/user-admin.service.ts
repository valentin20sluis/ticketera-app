import { and, asc, desc, eq, gte, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { HIDDEN_FROM_PANEL_EMAILS } from "@/modules/users/constants";
import type { UserListParams } from "@/modules/users/schemas/user-list-params.schema";
import type { CurrentUser } from "@/modules/users/services/current-user.service";
import { UserActionError } from "@/modules/users/services/user-account.service";
import { canManageUser, type AssignableRole } from "@/modules/users/utils/permissions";

const DAY_MS = 24 * 60 * 60 * 1000;

function escapeLike(text: string) {
  return text.replace(/[\\%_]/g, "\\$&");
}

function registeredSince(registro: UserListParams["registro"]) {
  if (registro === "7d") return new Date(Date.now() - 7 * DAY_MS);
  if (registro === "30d") return new Date(Date.now() - 30 * DAY_MS);
  if (registro === "anio") return new Date(Date.UTC(new Date().getUTCFullYear(), 0, 1));
  return undefined;
}

// Visibility + search + registration date: shared by the list and the tab counters.
function baseConditions({ q, registro }: Pick<UserListParams, "q" | "registro">) {
  const since = registeredSince(registro);
  const pattern = `%${escapeLike(q)}%`;
  return [
    isNull(users.deletedAt),
    notInArray(users.email, HIDDEN_FROM_PANEL_EMAILS),
    q
      ? or(
          sql`${users.fullName} ILIKE ${pattern} ESCAPE '\\'`,
          sql`${users.email} ILIKE ${pattern} ESCAPE '\\'`,
        )
      : undefined,
    since ? gte(users.createdAt, since) : undefined,
  ];
}

function roleCondition(rol: UserListParams["rol"]) {
  if (!rol) return undefined;
  return rol === "admin" ? inArray(users.role, ["admin", "super_admin"]) : eq(users.role, rol);
}

function orderBy(orden: UserListParams["orden"]) {
  const lowerName = sql`lower(${users.fullName})`;
  const primary = {
    antiguos: asc(users.createdAt),
    recientes: desc(users.createdAt),
    "nombre-asc": asc(lowerName),
    "nombre-desc": desc(lowerName),
  }[orden];
  return [primary, asc(users.id)];
}

export async function listUsers(db: Db, params: UserListParams) {
  const where = and(
    ...baseConditions(params),
    roleCondition(params.rol),
    params.estado ? eq(users.isSuspended, params.estado === "suspendido") : undefined,
  );
  const pageSize = params.porPagina;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(users)
    .where(where);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(params.page, totalPages);

  const rows = await db
    .select()
    .from(users)
    .where(where)
    .orderBy(...orderBy(params.orden))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  return { rows, total, page, pageSize, totalPages };
}

export async function countUsersByTab(db: Db, params: UserListParams) {
  const [counts] = await db
    .select({
      all: sql<number>`count(*)::int`,
      customer: sql<number>`(count(*) filter (where ${users.role} = 'customer'))::int`,
      organizer: sql<number>`(count(*) filter (where ${users.role} = 'organizer'))::int`,
      admin: sql<number>`(count(*) filter (where ${users.role} in ('admin', 'super_admin')))::int`,
      suspended: sql<number>`(count(*) filter (where ${users.isSuspended}))::int`,
    })
    .from(users)
    .where(and(...baseConditions(params)));
  return counts;
}

// The role travels in the invitation's publicMetadata and is applied to the
// local row when the invited user signs up (see resolveInitialRole).
export async function inviteUser(email: string, role: AssignableRole) {
  const client = await clerkClient();
  await client.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: { role },
    notify: true,
  });
}

async function findTarget(db: Db, userId: string) {
  const [target] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  if (!target) throw new UserActionError("Usuario no encontrado");
  return target;
}

export async function setUserSuspended(
  db: Db,
  actor: CurrentUser,
  userId: string,
  suspended: boolean,
) {
  const target = await findTarget(db, userId);
  if (!canManageUser(actor, target)) throw new UserActionError("No puedes modificar esta cuenta");
  await db
    .update(users)
    .set({ isSuspended: suspended, updatedAt: new Date() })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
}
