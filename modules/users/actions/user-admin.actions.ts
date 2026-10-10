"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireRole } from "@/modules/users/services/current-user.service";
import { inviteUser, setUserSuspended } from "@/modules/users/services/user-admin.service";
import {
  bulkChangeRole,
  bulkDelete,
  bulkSetSuspended,
  deleteUser,
  updateUserProfile,
  UserActionError,
  type BulkResult,
} from "@/modules/users/services/user-account.service";
import { describeInviteError } from "@/modules/users/utils/invite-error";
import { ASSIGNABLE_ROLES } from "@/modules/users/utils/permissions";

const PANEL_PATH = "/super-admin/usuarios";

export interface InviteUserState {
  error?: string;
  success?: boolean;
}

export interface AdminActionState {
  error?: string;
  result?: BulkResult;
  success?: boolean;
}

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(ASSIGNABLE_ROLES),
});

const userId = z.uuid();
const role = z.enum(ASSIGNABLE_ROLES);
const userIds = z
  .array(z.uuid())
  .min(1)
  .max(50)
  .refine((ids) => new Set(ids).size === ids.length);

const updateSchema = z.object({
  userId,
  fullName: z.string().trim().min(1).max(255),
  role: role.optional(),
  isSuspended: z.boolean().optional(),
});
const suspendSchema = z.object({ userId, suspended: z.boolean() });
const deleteSchema = z.object({ userId, confirmEmail: z.string().min(1).max(320) });
const bulkSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("role"), userIds, role }),
  z.object({ type: z.literal("suspend"), userIds, suspended: z.boolean() }),
  z.object({ type: z.literal("delete"), userIds }),
]);

const INVALID_INPUT = "Datos no válidos";
const FAILED = "No se pudo completar la acción";

async function run(work: () => Promise<BulkResult | void>): Promise<AdminActionState> {
  try {
    const result = await work();
    revalidatePath(PANEL_PATH);
    return result ? { success: true, result } : { success: true };
  } catch (error) {
    return { error: error instanceof UserActionError ? error.message : FAILED };
  }
}

export async function inviteUserAction(
  _previous: InviteUserState,
  formData: FormData,
): Promise<InviteUserState> {
  await requireRole(["super_admin"]);

  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: "Revisa el email y el rol" };

  const requestHeaders = await headers();
  const host = requestHeaders.get("host");
  const origin =
    requestHeaders.get("origin") ?? `${requestHeaders.get("x-forwarded-proto") ?? "http"}://${host}`;

  try {
    await inviteUser(parsed.data.email, parsed.data.role, `${origin}/ingresar`);
  } catch (error) {
    return { error: describeInviteError(error) };
  }

  revalidatePath(PANEL_PATH);
  return { success: true };
}

export async function updateUserAction(input: unknown): Promise<AdminActionState> {
  const actor = await requireRole(["super_admin"]);
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_INPUT };
  const { userId: id, ...profile } = parsed.data;
  return run(async () => updateUserProfile(await getDb(), actor, id, profile));
}

export async function setSuspendedAction(input: unknown): Promise<AdminActionState> {
  const actor = await requireRole(["super_admin"]);
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_INPUT };
  return run(async () =>
    setUserSuspended(await getDb(), actor, parsed.data.userId, parsed.data.suspended),
  );
}

export async function deleteUserAction(input: unknown): Promise<AdminActionState> {
  const actor = await requireRole(["super_admin"]);
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_INPUT };
  return run(async () =>
    deleteUser(await getDb(), actor, parsed.data.userId, parsed.data.confirmEmail),
  );
}

export async function bulkUsersAction(input: unknown): Promise<AdminActionState> {
  const actor = await requireRole(["super_admin"]);
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_INPUT };
  const data = parsed.data;
  return run(async () => {
    const db = await getDb();
    if (data.type === "role") return bulkChangeRole(db, actor, data.userIds, data.role);
    if (data.type === "suspend") return bulkSetSuspended(db, actor, data.userIds, data.suspended);
    return bulkDelete(db, actor, data.userIds);
  });
}
