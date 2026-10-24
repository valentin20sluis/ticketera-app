import { z } from "zod";

export const INVALID_EMAIL = "Ingresa un correo válido.";

// Trimmed and lowercased before validating, so dedupe works regardless of casing.
export const newsletterEmailSchema = z
  .string(INVALID_EMAIL)
  .trim()
  .toLowerCase()
  .max(254, INVALID_EMAIL)
  .pipe(z.email(INVALID_EMAIL));
