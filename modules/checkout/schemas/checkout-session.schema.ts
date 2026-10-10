import { z } from "zod";

export const MAX_QUANTITY_PER_ITEM = 10;

export const checkoutSessionSchema = z.object({
  items: z
    .array(
      z.object({
        functionZoneId: z.uuid(),
        quantity: z.number().int().min(1).max(MAX_QUANTITY_PER_ITEM),
      }),
    )
    .min(1),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;
