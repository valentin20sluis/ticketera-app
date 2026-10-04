"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AuthSession } from "@/modules/auth/types/auth.types";
import {
  clearStoredAuthSession,
  readStoredAuthSession,
} from "@/modules/auth/utils/auth-session-storage";

export interface UseAuthSessionResult {
  session: AuthSession | null;
  logout: () => void;
}

/**
 * Initializes `session` as `null` (no `localStorage` read during the
 * initial render) so the first client render matches the server render;
 * re-reads `localStorage` inside a `useEffect` keyed on `pathname` so an
 * already-mounted instance (e.g. the navbar's `AuthNavSection`) picks up a
 * session written on another route as soon as a `router.push` changes the
 * URL, without needing a global store or a custom event.
 */
export function useAuthSession(): UseAuthSessionResult {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);

  useEffect(() => {
    // Intentional: re-syncing React state from `localStorage` (an external
    // system React cannot read during render/SSR) whenever `pathname`
    // changes — including right after mount — is exactly how this hook
    // notices a session written on a different route.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSession(readStoredAuthSession());
  }, [pathname]);

  const logout = useCallback(() => {
    clearStoredAuthSession();
    setSession(null);
    router.push("/");
  }, [router]);

  return { session, logout };
}
