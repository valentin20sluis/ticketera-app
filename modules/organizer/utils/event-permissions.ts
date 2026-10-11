import type { CurrentUser } from "@/modules/users/services/current-user.service";

export type EventStatus = "draft" | "published" | "cancelled" | "suspended";
export type EventAction = "edit" | "delete";

export type EventActor = Pick<CurrentUser, "id" | "role" | "isSuspended" | "deletedAt"> | null;
export type EventTarget = { organizerId: string; status: EventStatus };

export function isEventAdmin(actor: EventActor): boolean {
  return actor?.role === "admin" || actor?.role === "super_admin";
}

function isEnabled(actor: EventActor): actor is NonNullable<EventActor> {
  if (!actor || actor.isSuspended || actor.deletedAt) return false;
  return actor.role === "organizer" || isEventAdmin(actor);
}

function canTouch(actor: EventActor, event: EventTarget): boolean {
  if (!isEnabled(actor)) return false;
  return isEventAdmin(actor) || event.organizerId === actor.id;
}

const EDITABLE: Record<"organizer" | "admin", EventStatus[]> = {
  organizer: ["draft", "published"],
  admin: ["draft", "published", "suspended"],
};

// Permission only: "delete" also needs "no orders", which the service checks against the DB.
export function canWriteEvent(actor: EventActor, event: EventTarget, action: EventAction): boolean {
  if (!canTouch(actor, event)) return false;
  if (action === "delete") return event.status === "draft";
  return EDITABLE[isEventAdmin(actor) ? "admin" : "organizer"].includes(event.status);
}

export function nextStatuses(actor: EventActor, event: EventTarget): EventStatus[] {
  if (!canTouch(actor, event)) return [];
  const own: Partial<Record<EventStatus, EventStatus[]>> = {
    draft: ["published", "cancelled"],
    published: ["cancelled"],
  };
  if (!isEventAdmin(actor)) return own[event.status] ?? [];
  const admin: Partial<Record<EventStatus, EventStatus[]>> = {
    draft: ["published", "cancelled", "suspended"],
    published: ["cancelled", "suspended"],
    suspended: ["published", "cancelled"],
  };
  return admin[event.status] ?? [];
}
