import { describe, expect, it } from "vitest";
import { describeInviteError } from "./invite-error";

const clerk = (code: string) =>
  Object.assign(new Error("Bad Request"), {
    errors: [{ code, message: "raw", longMessage: "raw detail" }],
  });

describe("describeInviteError", () => {
  it.each([
    ["duplicate_record", "Ese correo ya tiene una invitación pendiente"],
    ["form_identifier_exists", "Ese correo ya tiene una cuenta"],
    ["form_param_format_invalid", "El correo no es válido"],
    ["form_param_nil", "El correo no es válido"],
  ])("maps %s", (code, message) => {
    expect(describeInviteError(clerk(code))).toBe(message);
  });

  it.each([
    ["unknown code", clerk("something_else")],
    ["plain Error", new Error("Bad Request")],
    ["empty errors", Object.assign(new Error("x"), { errors: [] })],
    ["null", null],
    ["string", "boom"],
  ])("falls back for %s without leaking details", (_n, error) => {
    expect(describeInviteError(error)).toBe("No se pudo enviar la invitación");
  });
});
