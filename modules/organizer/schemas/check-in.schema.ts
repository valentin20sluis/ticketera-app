import { z } from "zod";

export const MAX_CHECK_IN_CODE_LENGTH = 200;

// Raw scanner/manual input: trusted only after length check; format is decided by checkInCodeSchema.
export const checkInInputSchema = z.object({
  eventId: z.uuid(),
  code: z.string().max(MAX_CHECK_IN_CODE_LENGTH),
});

// Strips all whitespace (pasted line breaks too) and lowercases; must be a full UUID.
export const checkInCodeSchema = z
  .string()
  .max(MAX_CHECK_IN_CODE_LENGTH)
  .transform((value) => value.replace(/\s+/g, "").toLowerCase())
  .pipe(z.uuid());

export type CheckInInput = z.infer<typeof checkInInputSchema>;
