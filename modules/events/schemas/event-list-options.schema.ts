import { z } from "zod";

export const EVENT_STATUSES = ["draft", "published", "cancelled", "suspended"] as const;

const eventListOptionsSchema = z.strictObject({
  organizerId: z.uuid().optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  limit: z.number().int().min(1).max(100).default(100),
});

export type EventListOptions = z.infer<typeof eventListOptionsSchema>;

export function parseEventListOptions(raw: unknown = {}): EventListOptions {
  return eventListOptionsSchema.parse(raw);
}
