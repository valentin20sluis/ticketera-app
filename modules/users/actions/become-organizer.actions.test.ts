import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentUser, revalidatePath, redirect, becomeOrganizer, UserActionError } = vi.hoisted(
  () => ({
    UserActionError: class UserActionError extends Error {},
    getCurrentUser: vi.fn(),
    revalidatePath: vi.fn(),
    redirect: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    becomeOrganizer: vi.fn(),
  }),
);

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn(async () => "db") }));
vi.mock("@/modules/users/services/current-user.service", () => ({ getCurrentUser }));
vi.mock("@/modules/users/services/become-organizer.service", () => ({ becomeOrganizer }));
vi.mock("@/modules/users/services/user-account.service", () => ({ UserActionError }));

import { becomeOrganizerAction } from "./become-organizer.actions";

const user = { id: "u1", role: "customer" };

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getCurrentUser.mockResolvedValue(user);
  becomeOrganizer.mockResolvedValue("upgraded");
});

describe("becomeOrganizerAction", () => {
  it("takes no parameters (actor only from the session)", () => {
    expect(becomeOrganizerAction.length).toBe(0);
  });

  it("redirects to /ingresar without calling the service when there is no session", async () => {
    getCurrentUser.mockResolvedValue(null);
    await expect(becomeOrganizerAction()).rejects.toThrow("NEXT_REDIRECT:/ingresar");
    expect(becomeOrganizer).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each(["upgraded", "already_organizer"])(
    "on %s revalidates the root layout and redirects outside the try",
    async (result) => {
      becomeOrganizer.mockResolvedValue(result);
      // the sentinel propagates: it was not swallowed as a service error
      await expect(becomeOrganizerAction()).rejects.toThrow("NEXT_REDIRECT:/organizador");
      expect(becomeOrganizer).toHaveBeenCalledWith("db", user);
      expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
      expect(redirect).toHaveBeenCalledTimes(1);
    },
  );

  it("returns the message of UserActionError without redirecting", async () => {
    becomeOrganizer.mockRejectedValue(new UserActionError("Tu cuenta está suspendida"));
    expect(await becomeOrganizerAction()).toEqual({ error: "Tu cuenta está suspendida" });
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["service", () => becomeOrganizer.mockRejectedValue(new Error("db secret"))],
    ["getCurrentUser", () => getCurrentUser.mockRejectedValue(new Error("clerk secret"))],
  ])("returns a generic error without leaking when %s throws", async (_n, arrange) => {
    arrange();
    expect(await becomeOrganizerAction()).toEqual({ error: "No se pudo completar la acción" });
    expect(redirect).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
