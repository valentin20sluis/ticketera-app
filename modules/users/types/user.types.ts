import type { userRoleEnum } from "@/lib/db/schema";

export type UserRole = (typeof userRoleEnum.enumValues)[number];
