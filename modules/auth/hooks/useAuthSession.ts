"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";

import type { AuthSession } from "@/modules/auth/types/auth.types";

export interface UseAuthSessionResult {
  session: AuthSession | null;
  logout: () => void;
}

export function useAuthSession(): UseAuthSessionResult {
  const router = useRouter();
  const { user } = useUser();
  const { signOut } = useClerk();

  const session: AuthSession | null = user
    ? {
        email: user.primaryEmailAddress?.emailAddress ?? "",
        fullName: user.fullName,
      }
    : null;

  const logout = useCallback(() => {
    signOut(() => router.push("/"));
  }, [signOut, router]);

  return { session, logout };
}
