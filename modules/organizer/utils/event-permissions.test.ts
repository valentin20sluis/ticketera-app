import { describe, expect, it } from "vitest"
import { canWriteEvent, nextStatuses, type EventActor, type EventStatus } from "./event-permissions"

const actor = (role: "organizer" | "admin" | "super_admin" | "customer", over = {}): NonNullable<EventActor> => ({
  id: "me",
  role,
  isSuspended: false,
  deletedAt: null,
  ...over,
})
const ev = (status: EventStatus, organizerId = "me") => ({ organizerId, status })

describe("canWriteEvent", () => {
  it("lets an organizer edit own draft/published only", () => {
    expect(canWriteEvent(actor("organizer"), ev("draft"), "edit")).toBe(true)
    expect(canWriteEvent(actor("organizer"), ev("published"), "edit")).toBe(true)
    expect(canWriteEvent(actor("organizer"), ev("cancelled"), "edit")).toBe(false)
    expect(canWriteEvent(actor("organizer"), ev("suspended"), "edit")).toBe(false)
  })

  it("denies an organizer on other organizers' events", () => {
    expect(canWriteEvent(actor("organizer"), ev("draft", "other"), "edit")).toBe(false)
    expect(canWriteEvent(actor("organizer"), ev("draft", "other"), "delete")).toBe(false)
  })

  it("lets admin and super_admin edit anyone's except cancelled", () => {
    for (const role of ["admin", "super_admin"] as const) {
      expect(canWriteEvent(actor(role), ev("suspended", "other"), "edit")).toBe(true)
      expect(canWriteEvent(actor(role), ev("draft", "other"), "edit")).toBe(true)
      expect(canWriteEvent(actor(role), ev("cancelled", "other"), "edit")).toBe(false)
    }
  })

  it("allows delete only on draft", () => {
    expect(canWriteEvent(actor("organizer"), ev("draft"), "delete")).toBe(true)
    expect(canWriteEvent(actor("organizer"), ev("published"), "delete")).toBe(false)
    expect(canWriteEvent(actor("admin"), ev("draft", "other"), "delete")).toBe(true)
  })

  it("denies null, customer, suspended and deleted actors", () => {
    expect(canWriteEvent(null, ev("draft"), "edit")).toBe(false)
    expect(canWriteEvent(actor("customer"), ev("draft"), "edit")).toBe(false)
    expect(canWriteEvent(actor("organizer", { isSuspended: true }), ev("draft"), "edit")).toBe(false)
    expect(canWriteEvent(actor("admin", { deletedAt: new Date() }), ev("draft"), "delete")).toBe(false)
    expect(nextStatuses(actor("admin", { isSuspended: true }), ev("draft"))).toEqual([])
  })
})

describe("nextStatuses", () => {
  it("organizer: publish/cancel, never suspend or revert", () => {
    expect(nextStatuses(actor("organizer"), ev("draft"))).toEqual(["published", "cancelled"])
    expect(nextStatuses(actor("organizer"), ev("published"))).toEqual(["cancelled"])
    expect(nextStatuses(actor("organizer"), ev("suspended"))).toEqual([])
    expect(nextStatuses(actor("organizer"), ev("cancelled"))).toEqual([])
    expect(nextStatuses(actor("organizer"), ev("draft", "other"))).toEqual([])
  })

  it("admin can suspend and lift suspension; cancelled is terminal", () => {
    expect(nextStatuses(actor("admin"), ev("published", "other"))).toEqual(["cancelled", "suspended"])
    expect(nextStatuses(actor("super_admin"), ev("suspended", "other"))).toEqual(["published", "cancelled"])
    expect(nextStatuses(actor("admin"), ev("cancelled", "other"))).toEqual([])
  })
})
