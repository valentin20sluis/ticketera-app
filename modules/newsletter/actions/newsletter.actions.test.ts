import { beforeEach, describe, expect, it, vi } from "vitest";
import { subscribeAction } from "./newsletter.actions";

const mocks = vi.hoisted(() => ({ subscribe: vi.fn(), db: {} }));
vi.mock("@/lib/db/client", () => ({ getDb: async () => mocks.db }));
vi.mock("@/modules/newsletter/services/newsletter.service", () => ({ subscribe: mocks.subscribe }));

const form = (email?: string) => {
  const fd = new FormData();
  if (email !== undefined) fd.set("email", email);
  return fd;
};

describe("subscribeAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("subscribes with the normalized email", async () => {
    expect(await subscribeAction({}, form("  Ana@Example.com "))).toEqual({ success: true });
    expect(mocks.subscribe).toHaveBeenCalledWith(mocks.db, "ana@example.com");
  });

  it.each([undefined, "", "nope"])("rejects invalid email %j without calling the service", async (email) => {
    expect(await subscribeAction({}, form(email))).toEqual({ error: "Ingresa un correo válido." });
    expect(mocks.subscribe).not.toHaveBeenCalled();
  });

  it("returns a generic message on service failure", async () => {
    mocks.subscribe.mockImplementation(async () => {
      throw new Error("connection refused at 10.0.0.1");
    });
    expect(await subscribeAction({}, form("a@b.co"))).toEqual({
      error: "No se pudo completar la suscripción. Intenta de nuevo.",
    });
  });
});
