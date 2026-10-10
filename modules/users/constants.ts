import type { UserRole } from "@/modules/users/types/user.types";

export const SUPER_ADMIN_EMAIL = "slvalentin19@gmail.com";

// Hidden from the users panel only; the rows still exist in the database.
export const HIDDEN_FROM_PANEL_EMAILS: string[] = [];

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  organizer: "Organizador",
  customer: "Cliente",
};
