import { SUPER_ADMIN_EMAIL } from "@/modules/users/constants";
import type { UserRole } from "@/modules/users/types/user.types";

export const ASSIGNABLE_ROLES = ["admin", "organizer", "customer"] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function isAssignableRole(value: unknown): value is AssignableRole {
  return ASSIGNABLE_ROLES.some((role) => role === value);
}

// Clerk invitations carry the role in publicMetadata; super_admin is never
// accepted from there, only from the email match.
export function resolveInitialRole(email: string, publicRole: unknown): UserRole {
  if (email.toLowerCase() === SUPER_ADMIN_EMAIL) return "super_admin";
  return isAssignableRole(publicRole) ? publicRole : "customer";
}

// super_admin is the root account: only super_admin acts, and nobody can
// change or suspend it from the panel (including itself).
export function canManageUser(
  actor: { role: UserRole },
  target: { role: UserRole },
): boolean {
  return actor.role === "super_admin" && target.role !== "super_admin";
}
