"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import {
  createEvent,
  deleteEvent,
  EventActionError,
  setEventStatus,
  updateEvent,
} from "@/modules/organizer/services/event-write.service";
import { requireRole } from "@/modules/users/services/current-user.service";

const PANEL_PATH = "/organizador";
const ROLES = ["organizer", "admin", "super_admin"] as const;
const INVALID_INPUT = "Datos no válidos";
const FAILED = "No se pudo completar la acción";

export interface EventActionState {
  error?: string;
  success?: boolean;
  eventId?: string;
}

const eventId = z.uuid();
const statusSchema = z.object({ eventId, status: z.enum(["published", "cancelled", "suspended"]) });
const deleteSchema = z.object({ eventId });

// Only EventActionError messages are shown; anything else stays generic.
async function run(work: () => Promise<{ id?: string } | void>): Promise<EventActionState> {
  try {
    const result = await work();
    revalidatePath(PANEL_PATH);
    return { success: true, ...(result?.id && { eventId: result.id }) };
  } catch (error) {
    return { error: error instanceof EventActionError ? error.message : FAILED };
  }
}

// The form payload is validated by the service (createEventFormSchema), the single source of truth.
// The owner is never read from the client: organizers create for themselves.
export async function createEventAction(input: unknown): Promise<EventActionState> {
  const actor = await requireRole([...ROLES]);
  return run(async () => createEvent(await getDb(), actor, input));
}

export async function updateEventAction(id: unknown, input: unknown): Promise<EventActionState> {
  const actor = await requireRole([...ROLES]);
  const parsedId = eventId.safeParse(id);
  if (!parsedId.success) return { error: INVALID_INPUT };
  return run(async () => updateEvent(await getDb(), actor, parsedId.data, input));
}

export async function setEventStatusAction(input: unknown): Promise<EventActionState> {
  const actor = await requireRole([...ROLES]);
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_INPUT };
  return run(async () => setEventStatus(await getDb(), actor, parsed.data.eventId, parsed.data.status));
}

export async function deleteEventAction(input: unknown): Promise<EventActionState> {
  const actor = await requireRole([...ROLES]);
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { error: INVALID_INPUT };
  return run(async () => deleteEvent(await getDb(), actor, parsed.data.eventId));
}
