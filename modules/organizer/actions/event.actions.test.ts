import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireRole, revalidatePath, svc, EventActionError } = vi.hoisted(() => ({
  EventActionError: class EventActionError extends Error {},
  requireRole: vi.fn(),
  revalidatePath: vi.fn(),
  svc: { createEvent: vi.fn(), updateEvent: vi.fn(), setEventStatus: vi.fn(), deleteEvent: vi.fn() },
}))

vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn(async () => "db") }))
vi.mock("@/modules/users/services/current-user.service", () => ({ requireRole }))
vi.mock("@/modules/organizer/services/event-write.service", () => ({ ...svc, EventActionError }))

import {
  createEventAction,
  deleteEventAction,
  setEventStatusAction,
  updateEventAction,
} from "./event.actions"

const actor = { id: "actor", role: "organizer" }
const id = "7b0c2f3e-5a1d-4c8e-9f21-0a1b2c3d4e5f"

beforeEach(() => {
  vi.clearAllMocks()
  requireRole.mockResolvedValue(actor)
})

describe("requireRole first", () => {
  it("calls no service when requireRole throws", async () => {
    requireRole.mockRejectedValue(new Error("redirect"))
    await expect(createEventAction({})).rejects.toThrow("redirect")
    await expect(deleteEventAction({ eventId: id })).rejects.toThrow("redirect")
    expect(Object.values(svc).every((fn) => fn.mock.calls.length === 0)).toBe(true)
  })

  it("only admits organizer, admin and super_admin", async () => {
    await createEventAction({})
    expect(requireRole).toHaveBeenCalledWith(["organizer", "admin", "super_admin"])
  })
})

describe("createEventAction", () => {
  it("forwards the actor and payload but never an owner from the client", async () => {
    svc.createEvent.mockResolvedValue({ id })
    const result = await createEventAction({ organizerId: "someone-else" })
    expect(svc.createEvent).toHaveBeenCalledWith("db", actor, { organizerId: "someone-else" })
    expect(result).toEqual({ success: true, eventId: id })
    expect(revalidatePath).toHaveBeenCalledWith("/organizador")
  })
})

describe("input validation", () => {
  it("rejects non-uuid ids and unknown statuses without calling the service", async () => {
    expect(await updateEventAction("nope", {})).toEqual({ error: "Datos no válidos" })
    expect(await deleteEventAction({ eventId: "nope" })).toEqual({ error: "Datos no válidos" })
    expect(await setEventStatusAction({ eventId: id, status: "draft" })).toEqual({ error: "Datos no válidos" })
    expect(await setEventStatusAction({ eventId: id })).toEqual({ error: "Datos no válidos" })
    expect(Object.values(svc).every((fn) => fn.mock.calls.length === 0)).toBe(true)
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("passes valid ids and statuses to the service", async () => {
    await setEventStatusAction({ eventId: id, status: "published" })
    expect(svc.setEventStatus).toHaveBeenCalledWith("db", actor, id, "published")
    await updateEventAction(id, { a: 1 })
    expect(svc.updateEvent).toHaveBeenCalledWith("db", actor, id, { a: 1 })
    await deleteEventAction({ eventId: id })
    expect(svc.deleteEvent).toHaveBeenCalledWith("db", actor, id)
  })
})

describe("errors", () => {
  it("shows EventActionError messages and hides everything else", async () => {
    svc.deleteEvent.mockRejectedValueOnce(new EventActionError("El evento ya tiene pedidos"))
    expect(await deleteEventAction({ eventId: id })).toEqual({ error: "El evento ya tiene pedidos" })
    svc.deleteEvent.mockRejectedValueOnce(new Error("relation events violates foreign key"))
    expect(await deleteEventAction({ eventId: id })).toEqual({ error: "No se pudo completar la acción" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
