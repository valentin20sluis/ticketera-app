import { asc, eq } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";
import type { Db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { CurrentUser } from "@/modules/users/services/current-user.service";
import { canManageUser, type AssignableRole } from "@/modules/users/utils/permissions";

export function listUsers(db: Db) {
  return db.select().from(users).orderBy(asc(users.createdAt));
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
  const [target] = await db.select().from(users).where(eq(users.id, userId));
  if (!target) throw new Error("Usuario no encontrado");
  return target;
}

export async function changeUserRole(
  db: Db,
  actor: CurrentUser,
  userId: string,
  role: AssignableRole,
) {
  const target = await findTarget(db, userId);
  if (!canManageUser(actor, target)) throw new Error("No puedes modificar esta cuenta");
  await db.update(users).set({ role, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function setUserSuspended(
  db: Db,
  actor: CurrentUser,
  userId: string,
  suspended: boolean,
) {
  const target = await findTarget(db, userId);
  if (!canManageUser(actor, target)) throw new Error("No puedes modificar esta cuenta");
  await db
    .update(users)
    .set({ isSuspended: suspended, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
