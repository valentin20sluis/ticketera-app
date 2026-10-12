import { z } from "zod";
import { MAX_TICKETS_PER_ZONE } from "@/modules/events/services/venue-zone.service";

export const MAX_QUANTITY_PER_ITEM = 10;

const seatSchema = z.strictObject({
  row: z.number().int().min(1),
  number: z.number().int().min(1),
});

// Standing zone: quantity. Numbered zone: seats. Never both.
const standingItem = z.strictObject({
  functionZoneId: z.uuid(),
  quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
});

const seatedItem = z.strictObject({
  functionZoneId: z.uuid(),
  seats: z
    .array(seatSchema)
    .min(1)
    .max(MAX_TICKETS_PER_ZONE)
    .refine((seats) => new Set(seats.map((s) => `${s.row}:${s.number}`)).size === seats.length, "duplicate seats"),
});

export const checkoutSessionSchema = z.object({
  items: z.array(z.union([standingItem, seatedItem])).min(1),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
