import { and, eq, inArray, isNull } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { CurrentUser } from "@/modules/users/services/current-user.service";
import { canManageUser, type AssignableRole } from "@/modules/users/utils/permissions";

export type BulkResult = { done: number; failed: { userId: string; reason: string }[] };

// Only these messages are safe to show to the admin; any other error stays generic.
export class UserActionError extends Error {}

const NOT_FOUND = "Usuario no encontrado";
const NOT_ALLOWED = "No puedes modificar esta cuenta";

async function findTarget(db: Db, actor: CurrentUser, userId: string) {
  const [target] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
  if (!target) throw new UserActionError(NOT_FOUND);
  if (!canManageUser(actor, target)) throw new UserActionError(NOT_ALLOWED);
  return target;
}

export async function updateUserProfile(
  db: Db,
  actor: CurrentUser,
  userId: string,
  input: { fullName: string; role?: AssignableRole; isSuspended?: boolean },
) {
  const target = await findTarget(db, actor, userId);
  const fullName = input.fullName.trim();

  // Clerk first: the user.updated webhook overwrites full_name with Clerk's value.
  if (fullName !== target.fullName) {
    const [firstName, ...rest] = fullName.split(/\s+/);
    const client = await clerkClient();
    await client.users.updateUser(target.clerkUserId, { firstName, lastName: rest.join(" ") });
  }

  await db
    .update(users)
    .set({
      fullName,
      ...(input.role !== undefined && { role: input.role }),
      ...(input.isSuspended !== undefined && { isSuspended: input.isSuspended }),
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));
}

function isClerkNotFound(error: unknown) {
  return typeof error === "object" && error !== null && (error as { status?: unknown }).status === 404;
}

async function softDelete(db: Db, target: CurrentUser) {
  try {
    const client = await clerkClient();
    await client.users.deleteUser(target.clerkUserId);
  } catch (error) {
    if (!isClerkNotFound(error)) throw error;
  }
  // Logical delete: orders, events and venues keep their FK to this row.
  await db
    .update(users)
    .set({ deletedAt: new Date(), isSuspended: true, updatedAt: new Date() })
    .where(eq(users.id, target.id));
}

export async function deleteUser(
  db: Db,
  actor: CurrentUser,
  userId: string,
  confirmEmail: string,
) {
  const target = await findTarget(db, actor, userId);
  if (confirmEmail.trim().toLowerCase() !== target.email.toLowerCase()) {
    throw new UserActionError("El correo de confirmación no coincide");
  }
  await softDelete(db, target);
}

async function splitTargets(db: Db, actor: CurrentUser, userIds: string[]) {
  const found = await db
    .select()
    .from(users)
    .where(and(inArray(users.id, userIds), isNull(users.deletedAt)));
  const byId = new Map(found.map((user) => [user.id, user]));
  const allowed: CurrentUser[] = [];
  const failed: BulkResult["failed"] = [];
  for (const userId of userIds) {
    const target = byId.get(userId);
    if (!target) failed.push({ userId, reason: NOT_FOUND });
    else if (!canManageUser(actor, target)) failed.push({ userId, reason: NOT_ALLOWED });
    else allowed.push(target);
  }
  return { allowed, failed };
}

async function bulkUpdate(
  db: Db,
  actor: CurrentUser,
  userIds: string[],
  values: Partial<typeof users.$inferInsert>,
): Promise<BulkResult> {
  const { allowed, failed } = await splitTargets(db, actor, userIds);
  if (allowed.length > 0) {
    await db
      .update(users)
      .set({ ...values, updatedAt: new Date() })
      .where(inArray(users.id, allowed.map((user) => user.id)));
  }
  return { done: allowed.length, failed };
}

export function bulkChangeRole(db: Db, actor: CurrentUser, userIds: string[], role: AssignableRole) {
  return bulkUpdate(db, actor, userIds, { role });
}

export function bulkSetSuspended(db: Db, actor: CurrentUser, userIds: string[], suspended: boolean) {
  return bulkUpdate(db, actor, userIds, { isSuspended: suspended });
}

export async function bulkDelete(db: Db, actor: CurrentUser, userIds: string[]): Promise<BulkResult> {
  const { allowed, failed } = await splitTargets(db, actor, userIds);
  let done = 0;
  for (const target of allowed) {
    try {
      await softDelete(db, target);
      done += 1;
    } catch (error) {
      failed.push({
        userId: target.id,
        reason: error instanceof UserActionError ? error.message : "No se pudo eliminar",
      });
    }
  }
  return { done, failed };
}
