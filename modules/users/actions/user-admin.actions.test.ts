import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireRole, revalidatePath, svc, UserActionError } = vi.hoisted(() => ({
  UserActionError: class UserActionError extends Error {},
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  svc: {
    updateUserProfile: vi.fn(),
    deleteUser: vi.fn(),
    bulkChangeRole: vi.fn(),
    bulkSetSuspended: vi.fn(),
    bulkDelete: vi.fn(),
    setUserSuspended: vi.fn(),
    inviteUser: vi.fn(),
  },
}));

const { headersGet } = vi.hoisted(() => ({ headersGet: vi.fn() }));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: headersGet })),
}));
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn(async () => "db") }));
vi.mock("@/modules/users/services/current-user.service", () => ({ requireRole }));
vi.mock("@/modules/users/services/user-account.service", () => ({ ...svc, UserActionError }));
vi.mock("@/modules/users/services/user-admin.service", () => ({
  inviteUser: svc.inviteUser,
  setUserSuspended: svc.setUserSuspended,
}));

import {
  bulkUsersAction,
  deleteUserAction,
  inviteUserAction,
  setSuspendedAction,
  updateUserAction,
} from "./user-admin.actions";

const actor = { id: "actor", role: "super_admin" };
const id = "7b0c2f3e-5a1d-4c8e-9f21-0a1b2c3d4e5f";
const id2 = "8b0c2f3e-5a1d-4c8e-9f21-0a1b2c3d4e5f";

beforeEach(() => {
  vi.clearAllMocks();
  requireRole.mockResolvedValue(actor);
});

describe("requireRole first", () => {
  it("does not call any service when requireRole throws", async () => {
    requireRole.mockRejectedValue(new Error("redirect"));
    await expect(updateUserAction({ userId: id, fullName: "A" })).rejects.toThrow();
    await expect(setSuspendedAction({ userId: id, suspended: true })).rejects.toThrow();
    await expect(deleteUserAction({ userId: id, confirmEmail: "a@b.c" })).rejects.toThrow();
    await expect(bulkUsersAction({ type: "delete", userIds: [id] })).rejects.toThrow();
    for (const fn of Object.values(svc)) expect(fn).not.toHaveBeenCalled();
    expect(requireRole).toHaveBeenCalledWith(["super_admin"]);
  });
});

describe("inviteUserAction", () => {
  const form = (email = "a@b.co", role = "organizer") => {
    const data = new FormData();
    data.set("email", email);
    data.set("role", role);
    return data;
  };
  const headerValues = (values: Record<string, string>) =>
    headersGet.mockImplementation((name: string) => values[name] ?? null);

  it("requires super_admin before anything else", async () => {
    requireRole.mockRejectedValue(new Error("redirect"));
    await expect(inviteUserAction({}, form())).rejects.toThrow();
    expect(requireRole).toHaveBeenCalledWith(["super_admin"]);
    expect(svc.inviteUser).not.toHaveBeenCalled();
  });

  it("rejects invalid input without inviting", async () => {
    headerValues({ host: "x.com" });
    expect(await inviteUserAction({}, form("nope"))).toEqual({ error: "Revisa el email y el rol" });
    expect(svc.inviteUser).not.toHaveBeenCalled();
  });

  it("uses the origin header for the redirect url", async () => {
    headerValues({ origin: "https://app.example.com", host: "other.com" });
    expect(await inviteUserAction({}, form())).toEqual({ success: true });
    expect(svc.inviteUser).toHaveBeenCalledWith("a@b.co", "organizer", "https://app.example.com/ingresar");
    expect(revalidatePath).toHaveBeenCalledWith("/super-admin/usuarios");
  });

  it("falls back to x-forwarded-proto and host", async () => {
    headerValues({ host: "app.example.com", "x-forwarded-proto": "https" });
    await inviteUserAction({}, form());
    expect(svc.inviteUser).toHaveBeenCalledWith("a@b.co", "organizer", "https://app.example.com/ingresar");
  });

  it("defaults to http when there is no proto header", async () => {
    headerValues({ host: "localhost:3000" });
    await inviteUserAction({}, form());
    expect(svc.inviteUser).toHaveBeenCalledWith("a@b.co", "organizer", "http://localhost:3000/ingresar");
  });

  it("returns the translated Clerk reason, never the raw message", async () => {
    headerValues({ host: "x.com" });
    svc.inviteUser.mockRejectedValue(
      Object.assign(new Error("Bad Request"), { errors: [{ code: "duplicate_record" }] }),
    );
    expect(await inviteUserAction({}, form())).toEqual({
      error: "Ese correo ya tiene una invitación pendiente",
    });
    svc.inviteUser.mockRejectedValue(new Error("secret"));
    expect(await inviteUserAction({}, form())).toEqual({ error: "No se pudo enviar la invitación" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("invalid input returns { error } without touching services", () => {
  const many = Array.from({ length: 51 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`);
  it.each([
    ["update: bad uuid", () => updateUserAction({ userId: "x", fullName: "A" })],
    ["update: empty name", () => updateUserAction({ userId: id, fullName: "   " })],
    ["update: super_admin role", () => updateUserAction({ userId: id, fullName: "A", role: "super_admin" })],
    ["suspend: non boolean", () => setSuspendedAction({ userId: id, suspended: "true" })],
    ["delete: no email", () => deleteUserAction({ userId: id, confirmEmail: "" })],
    ["bulk: empty", () => bulkUsersAction({ type: "delete", userIds: [] })],
    ["bulk: > 50", () => bulkUsersAction({ type: "delete", userIds: many })],
    ["bulk: repeated", () => bulkUsersAction({ type: "suspend", userIds: [id, id], suspended: true })],
    ["bulk: super_admin role", () => bulkUsersAction({ type: "role", userIds: [id], role: "super_admin" })],
    ["bulk: unknown type", () => bulkUsersAction({ type: "x", userIds: [id] })],
  ])("%s", async (_name, call) => {
    const out = await call();
    expect(out.error).toBeTruthy();
    for (const fn of Object.values(svc)) expect(fn).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("valid input", () => {
  it("updateUserAction trims the name, passes the actor and revalidates", async () => {
    const out = await updateUserAction({ userId: id, fullName: "  Ana Perez ", role: "admin" });
    expect(out).toEqual({ success: true });
    expect(svc.updateUserProfile).toHaveBeenCalledWith("db", actor, id, { fullName: "Ana Perez", role: "admin" });
    expect(revalidatePath).toHaveBeenCalledWith("/super-admin/usuarios");
  });

  it("setSuspendedAction calls setUserSuspended", async () => {
    expect(await setSuspendedAction({ userId: id, suspended: true })).toEqual({ success: true });
    expect(svc.setUserSuspended).toHaveBeenCalledWith("db", actor, id, true);
    expect(revalidatePath).toHaveBeenCalledWith("/super-admin/usuarios");
  });

  it("deleteUserAction calls deleteUser with the confirmation email", async () => {
    await deleteUserAction({ userId: id, confirmEmail: "a@b.co" });
    expect(svc.deleteUser).toHaveBeenCalledWith("db", actor, id, "a@b.co");
    expect(revalidatePath).toHaveBeenCalledWith("/super-admin/usuarios");
  });

  it.each([
    ["role", { type: "role", userIds: [id, id2], role: "organizer" }, "bulkChangeRole", [[id, id2], "organizer"]],
    ["suspend", { type: "suspend", userIds: [id], suspended: false }, "bulkSetSuspended", [[id], false]],
    ["delete", { type: "delete", userIds: [id] }, "bulkDelete", [[id]]],
  ] as const)("bulk %s returns the BulkResult", async (_t, input, fn, args) => {
    const result = { done: 1, failed: [] };
    svc[fn].mockResolvedValue(result);
    expect(await bulkUsersAction(input)).toEqual({ success: true, result });
    expect(svc[fn]).toHaveBeenCalledWith("db", actor, ...args);
    expect(revalidatePath).toHaveBeenCalledWith("/super-admin/usuarios");
  });

  it("returns a generic error and skips revalidate when the service throws", async () => {
    svc.deleteUser.mockRejectedValue(new Error("clerk secret detail"));
    const out = await deleteUserAction({ userId: id, confirmEmail: "a@b.co" });
    expect(out).toEqual({ error: expect.any(String) });
    expect(out).toEqual({ error: "No se pudo completar la acción" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("shows the message of domain errors", async () => {
    svc.deleteUser.mockRejectedValue(new UserActionError("El correo de confirmación no coincide"));
    const out = await deleteUserAction({ userId: id, confirmEmail: "a@b.co" });
    expect(out).toEqual({ error: "El correo de confirmación no coincide" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
