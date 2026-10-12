import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reconcilePendingOrders: vi.fn(),
  getDb: vi.fn(async () => "db"),
}));

vi.mock("@/lib/stripe", () => ({ stripe: "stripe" }));
vi.mock("@/lib/db/client", () => ({ getDb: mocks.getDb }));
vi.mock("@/modules/ticketing/services/reconcile-orders.service", () => ({
  reconcilePendingOrders: mocks.reconcilePendingOrders,
}));

import { GET } from "./route";

const call = (authorization?: string) =>
  GET({
    headers: new Headers(authorization ? { authorization } : {}),
  } as unknown as NextRequest);

const summary = {
  scanned: 3,
  paid: 1,
  expired: 1,
  closedOpen: 1,
  alreadyProcessed: 0,
  skipped: 0,
  errors: 0,
};

describe("reconcile-orders cron", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "s3cret");
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it.each([
    ["no header", undefined],
    ["wrong token", "Bearer nope"],
    ["same-length wrong token", "Bearer s3cres"],
    ["non-Bearer scheme", "Basic s3cret"],
    ["raw secret", "s3cret"],
  ])("returns 401 with %s and touches nothing", async (_, header) => {
    expect((await call(header)).status).toBe(401);
    expect(mocks.getDb).not.toHaveBeenCalled();
    expect(mocks.reconcilePendingOrders).not.toHaveBeenCalled();
  });

  it("fails closed with 500 when CRON_SECRET is missing", async () => {
    vi.stubEnv("CRON_SECRET", "");
    expect((await call("Bearer undefined")).status).toBe(500);
    expect((await call("Bearer ")).status).toBe(500);
    expect(mocks.reconcilePendingOrders).not.toHaveBeenCalled();
  });

  it("returns the summary and logs it with the right token", async () => {
    mocks.reconcilePendingOrders.mockResolvedValue(summary);
    const res = await call("Bearer s3cret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(summary);
    expect(mocks.reconcilePendingOrders).toHaveBeenCalledWith("db", "stripe");
    expect(console.log).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when the service throws", async () => {
    mocks.reconcilePendingOrders.mockRejectedValue(new Error("db down"));
    expect((await call("Bearer s3cret")).status).toBe(500);
  });
});
