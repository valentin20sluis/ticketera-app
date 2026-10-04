import { beforeEach, describe, expect, it } from "vitest";

import {
  clearStoredAuthSession,
  readStoredAuthSession,
  writeStoredAuthSession,
} from "@/modules/auth/utils/auth-session-storage";
import type { AuthSession } from "@/modules/auth/types/auth.types";

const STORAGE_KEY = "ticketera:auth-session";

describe("auth-session-storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null when nothing is stored", () => {
    expect(readStoredAuthSession()).toBeNull();
  });

  it("returns null without throwing when the stored value is not valid JSON", () => {
    localStorage.setItem(STORAGE_KEY, "esto no es json");

    expect(() => readStoredAuthSession()).not.toThrow();
    expect(readStoredAuthSession()).toBeNull();
  });

  it("round-trips a session through writeStoredAuthSession + readStoredAuthSession", () => {
    const session: AuthSession = {
      email: "persona@example.com",
      fullName: "Persona Ejemplo",
    };

    writeStoredAuthSession(session);

    expect(readStoredAuthSession()).toEqual(session);
  });

  it("overwrites a previously stored session on a second write", () => {
    const firstSession: AuthSession = {
      email: "primera@example.com",
      fullName: "Primera Persona",
    };
    const secondSession: AuthSession = {
      email: "segunda@example.com",
      fullName: null,
    };

    writeStoredAuthSession(firstSession);
    writeStoredAuthSession(secondSession);

    expect(readStoredAuthSession()).toEqual(secondSession);
  });

  it("clears the stored session so a later read returns null", () => {
    writeStoredAuthSession({
      email: "persona@example.com",
      fullName: "Persona Ejemplo",
    });

    clearStoredAuthSession();

    expect(readStoredAuthSession()).toBeNull();
  });
});
