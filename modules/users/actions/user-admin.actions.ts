"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { requireRole } from "@/modules/users/services/current-user.service";
import {
  changeUserRole,
  inviteUser,
  setUserSuspended,
} from "@/modules/users/services/user-admin.service";
import { ASSIGNABLE_ROLES } from "@/modules/users/utils/permissions";

const PANEL_PATH = "/super-admin/usuarios";

export interface InviteUserState {
  error?: string;
  success?: boolean;
}

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(ASSIGNABLE_ROLES),
});

const roleSchema = z.object({
  userId: z.uuid(),
  role: z.enum(ASSIGNABLE_ROLES),
});

const suspendSchema = z.object({
  userId: z.uuid(),
  suspended: z.enum(["true", "false"]),
});

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

  try {
    await inviteUser(parsed.data.email, parsed.data.role);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo enviar la invitación" };
  }

  revalidatePath(PANEL_PATH);
  return { success: true };
}

export async function changeRoleAction(formData: FormData): Promise<void> {
  const actor = await requireRole(["super_admin"]);
  const parsed = roleSchema.parse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });

  await changeUserRole(await getDb(), actor, parsed.userId, parsed.role);
  revalidatePath(PANEL_PATH);
}

export async function setSuspendedAction(formData: FormData): Promise<void> {
  const actor = await requireRole(["super_admin"]);
  const parsed = suspendSchema.parse({
    userId: formData.get("userId"),
    suspended: formData.get("suspended"),
  });

  await setUserSuspended(await getDb(), actor, parsed.userId, parsed.suspended === "true");
  revalidatePath(PANEL_PATH);
}
