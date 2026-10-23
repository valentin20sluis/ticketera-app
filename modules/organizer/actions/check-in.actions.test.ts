import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireRole, checkInTicket, CheckInError } = vi.hoisted(() => ({
  CheckInError: class CheckInError extends Error {},
  requireRole: vi.fn(),
  checkInTicket: vi.fn(),
}))

vi.mock("@/lib/db/client", () => ({ getDb: vi.fn(async () => "db") }))
vi.mock("@/modules/users/services/current-user.service", () => ({ requireRole }))
vi.mock("@/modules/organizer/services/check-in.service", () => ({ checkInTicket, CheckInError }))

import { checkInTicketAction } from "./check-in.actions"

const actor = { id: "actor", role: "organizer" }
const eventId = "7b0c2f3e-5a1d-4c8e-9f21-0a1b2c3d4e5f"
const code = "3f2b8c1e-5a1d-4c8e-9f21-0a1b2c3d4e5f"

beforeEach(() => {
  vi.clearAllMocks()
  requireRole.mockResolvedValue(actor)
})

describe("checkInTicketAction", () => {
  it("guards with requireRole and never calls the service when it throws", async () => {
    requireRole.mockRejectedValue(new Error("redirect"))
    await expect(checkInTicketAction({ eventId, code })).rejects.toThrow("redirect")
    expect(checkInTicket).not.toHaveBeenCalled()
    requireRole.mockResolvedValue(actor)
    await checkInTicketAction({ eventId, code })
    expect(requireRole).toHaveBeenLastCalledWith(["organizer", "admin", "super_admin"])
  })

  it("rejects invalid input without calling the service", async () => {
    const bad = { ok: false, error: "Datos no válidos" }
    expect(await checkInTicketAction({ eventId: "nope", code })).toEqual(bad)
    expect(await checkInTicketAction({ eventId, code: "x".repeat(201) })).toEqual(bad)
    expect(await checkInTicketAction({ eventId })).toEqual(bad)
    expect(await checkInTicketAction(null)).toEqual(bad)
    expect(checkInTicket).not.toHaveBeenCalled()
  })

  it("uses the server actor, ignoring any actor sent by the client", async () => {
    const outcome = { result: { status: "not_found" }, stats: { sold: 2, entered: 1 } }
    checkInTicket.mockResolvedValue(outcome)
    const result = await checkInTicketAction({ eventId, code, actor: { id: "evil", role: "super_admin" } })
    expect(checkInTicket).toHaveBeenCalledWith("db", actor, { eventId, code })
    expect(result).toEqual({ ok: true, outcome })
  })

  it("returns CheckInError messages and hides unexpected errors", async () => {
    checkInTicket.mockRejectedValueOnce(new CheckInError("Evento no encontrado"))
    expect(await checkInTicketAction({ eventId, code })).toEqual({ ok: false, error: "Evento no encontrado" })
    checkInTicket.mockRejectedValueOnce(new Error("relation tickets does not exist"))
    expect(await checkInTicketAction({ eventId, code })).toEqual({
      ok: false,
      error: "No se pudo validar la entrada. Inténtalo de nuevo",
    })
  })
})
