import { z } from "zod";

// Format only (11 digits, prefix 10/15/17/20); the check digit is not validated.
const RUC_REGEX = /^(10|15|17|20)\d{9}$/;

export const organizerProfileSchema = z.object({
  ruc: z
    .string()
    .trim()
    .refine((value) => value === "" || RUC_REGEX.test(value), "RUC no válido")
    .transform((value) => (value === "" ? null : value)),
});

export type OrganizerProfileInput = z.input<typeof organizerProfileSchema>;
