import { describe, expect, it } from "vitest";
import { resolveDbConfig } from "./client";

describe("resolveDbConfig", () => {
  it("resolves the neon driver from env vars", () => {
    const config = resolveDbConfig({
      DATABASE_DRIVER: "neon",
      DATABASE_URL: "postgres://user:pass@host/db",
    });

    expect(config).toEqual({ driver: "neon", connectionString: "postgres://user:pass@host/db" });
  });

  it("resolves the pg driver from env vars", () => {
    const config = resolveDbConfig({
      DATABASE_DRIVER: "pg",
      DATABASE_URL: "postgres://user:pass@host/db",
    });

    expect(config).toEqual({ driver: "pg", connectionString: "postgres://user:pass@host/db" });
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => resolveDbConfig({ DATABASE_DRIVER: "neon" })).toThrow("DATABASE_URL");
  });

  it("throws when DATABASE_DRIVER is missing or invalid", () => {
    expect(() => resolveDbConfig({ DATABASE_URL: "postgres://x" })).toThrow("DATABASE_DRIVER");
    expect(() =>
      resolveDbConfig({ DATABASE_DRIVER: "sqlite", DATABASE_URL: "postgres://x" }),
    ).toThrow("DATABASE_DRIVER");
  });

  it("resolves the pg driver via a Cloud SQL instance connection name, without DATABASE_URL", () => {
    const config = resolveDbConfig({
      DATABASE_DRIVER: "pg",
      CLOUD_SQL_INSTANCE_CONNECTION_NAME: "my-project:us-central1:my-instance",
    });

    expect(config).toEqual({
      driver: "pg",
      cloudSqlInstanceConnectionName: "my-project:us-central1:my-instance",
    });
  });

  it("throws when the pg driver has neither DATABASE_URL nor a Cloud SQL instance connection name", () => {
    expect(() => resolveDbConfig({ DATABASE_DRIVER: "pg" })).toThrow("DATABASE_URL");
  });
});
