import { describe, expect, it } from "vitest";
import { buildUserListHref, parseUserListParams } from "./user-list-params.schema";

describe("parseUserListParams", () => {
  it("returns defaults for missing params", () => {
    expect(parseUserListParams({})).toEqual({
      q: "",
      rol: undefined,
      estado: undefined,
      registro: undefined,
      orden: "antiguos",
      page: 1,
      porPagina: 10,
    });
  });

  it("falls back to defaults for invalid values", () => {
    const params = parseUserListParams({
      page: "-3",
      porPagina: "1000",
      orden: "x",
      rol: "super_admin",
      estado: "x",
      registro: "x",
    });
    expect(params).toMatchObject({ page: 1, porPagina: 10, orden: "antiguos" });
    expect(params.rol).toBeUndefined();
    expect(params.estado).toBeUndefined();
    expect(params.registro).toBeUndefined();
    expect(parseUserListParams({ page: "abc" }).page).toBe(1);
    expect(parseUserListParams({ page: "1.5" }).page).toBe(1);
  });

  it("accepts whitelisted values, takes the first of arrays and trims/limits q", () => {
    const params = parseUserListParams({
      q: ["  ana  ", "otro"],
      rol: "admin",
      estado: "suspendido",
      registro: "anio",
      orden: "nombre-desc",
      page: "3",
      porPagina: "25",
    });
    expect(params).toEqual({
      q: "ana",
      rol: "admin",
      estado: "suspendido",
      registro: "anio",
      orden: "nombre-desc",
      page: 3,
      porPagina: 25,
    });
    expect(parseUserListParams({ q: "a".repeat(300) }).q).toHaveLength(100);
  });
});

describe("buildUserListHref", () => {
  const base = parseUserListParams({});

  it("omits defaults", () => {
    expect(buildUserListHref(base)).toBe("/super-admin/usuarios");
  });

  it("encodes q and keeps filters", () => {
    const params = parseUserListParams({ q: "a&b c", rol: "organizer" });
    expect(buildUserListHref(params)).toBe("/super-admin/usuarios?q=a%26b+c&rol=organizer");
  });

  it("resets page when changing anything but page", () => {
    const params = parseUserListParams({ page: "4" });
    expect(buildUserListHref(params, { estado: "activo" })).toBe("/super-admin/usuarios?estado=activo");
    expect(buildUserListHref(params, { porPagina: 25 })).toBe("/super-admin/usuarios?porPagina=25");
    expect(buildUserListHref(params, { page: 5 })).toBe("/super-admin/usuarios?page=5");
  });

  it("can clear a filter with undefined", () => {
    const params = parseUserListParams({ rol: "customer" });
    expect(buildUserListHref(params, { rol: undefined })).toBe("/super-admin/usuarios");
  });
});
