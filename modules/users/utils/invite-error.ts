const FALLBACK = "No se pudo enviar la invitación";

const MESSAGES: Record<string, string> = {
  duplicate_record: "Ese correo ya tiene una invitación pendiente",
  form_identifier_exists: "Ese correo ya tiene una cuenta",
  form_param_format_invalid: "El correo no es válido",
  form_param_nil: "El correo no es válido",
};

// Only maps known Clerk codes; raw messages never reach the UI.
export function describeInviteError(error: unknown): string {
  const errors = (error as { errors?: unknown } | null)?.errors;
  if (!Array.isArray(errors)) return FALLBACK;
  for (const item of errors) {
    const code = (item as { code?: unknown } | null)?.code;
    if (typeof code === "string" && Object.hasOwn(MESSAGES, code)) return MESSAGES[code];
  }
  return FALLBACK;
}
