import { describe, expect, it } from "vitest";
import { canManageUser, resolveInitialRole } from "./permissions";

describe("resolveInitialRole", () => {
  it("makes the configured email the super_admin, regardless of casing", () => {
    expect(resolveInitialRole("SLVALENTIN19@gmail.com", "organizer")).toBe("super_admin");
  });

  it("uses the invited role for other emails", () => {
    expect(resolveInitialRole("org@example.com", "organizer")).toBe("organizer");
  });

  it("never accepts super_admin from metadata", () => {
    expect(resolveInitialRole("x@example.com", "super_admin")).toBe("customer");
  });

  it("defaults to customer when there is no valid metadata role", () => {
    expect(resolveInitialRole("x@example.com", undefined)).toBe("customer");
    expect(resolveInitialRole("x@example.com", "hacker")).toBe("customer");
  });
});

describe("canManageUser", () => {
  it("lets super_admin manage admins, organizers and customers", () => {
    expect(canManageUser({ role: "super_admin" }, { role: "organizer" })).toBe(true);
    expect(canManageUser({ role: "super_admin" }, { role: "customer" })).toBe(true);
  });

  it("blocks every other role", () => {
    expect(canManageUser({ role: "admin" }, { role: "customer" })).toBe(false);
    expect(canManageUser({ role: "organizer" }, { role: "customer" })).toBe(false);
  });

  it("never allows touching the root super_admin account", () => {
    expect(canManageUser({ role: "super_admin" }, { role: "super_admin" })).toBe(false);
  });
});
