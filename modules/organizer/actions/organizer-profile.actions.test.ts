import { beforeEach, describe, expect, it, vi } from "vitest"

const { requireRole, saveOrganizerProfile, revalidatePath, OrganizerProfileError } = vi.hoisted(() => ({
  OrganizerProfileError: class OrganizerProfileError extends Error {},
  requireRole: vi.fn(),
  saveOrganizerProfile: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/lib/db/client", () => ({ getDb: vi.fn(async () => "db") }))
vi.mock("@/modules/users/services/current-user.service", () => ({ requireRole }))
vi.mock("@/modules/organizer/services/organizer-profile.service", () => ({
  saveOrganizerProfile,
  OrganizerProfileError,
}))

import { saveOrganizerProfileAction } from "./organizer-profile.actions"

const actor = { id: "actor", role: "organizer" }
const form = (ruc: string) => {
  const fd = new FormData()
  fd.set("ruc", ruc)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  requireRole.mockResolvedValue(actor)
})

describe("saveOrganizerProfileAction", () => {
  it("rejects when requireRole rejects (no session, wrong role or suspended) and never calls the service", async () => {
    requireRole.mockRejectedValue(new Error("NEXT_REDIRECT"))
    await expect(saveOrganizerProfileAction({ error: "" }, form("20123456789"))).rejects.toThrow()
    expect(saveOrganizerProfile).not.toHaveBeenCalled()
  })

  it("saves with the server actor and revalidates", async () => {
    saveOrganizerProfile.mockResolvedValue("20123456789")
    const result = await saveOrganizerProfileAction({ error: "" }, form("20123456789"))
    expect(saveOrganizerProfile).toHaveBeenCalledWith("db", actor, { ruc: "20123456789" })
    expect(revalidatePath).toHaveBeenCalledWith("/organizador/configuracion")
    expect(result).toEqual({ error: "", ok: true })
  })

  it("shows OrganizerProfileError messages", async () => {
    saveOrganizerProfile.mockRejectedValue(new OrganizerProfileError("RUC no válido"))
    expect(await saveOrganizerProfileAction({ error: "" }, form("x"))).toEqual({ error: "RUC no válido" })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("hides unexpected errors behind a generic message", async () => {
    saveOrganizerProfile.mockRejectedValue(new Error("db password leaked"))
    const result = await saveOrganizerProfileAction({ error: "" }, form("20123456789"))
    expect(result.error).not.toContain("leaked")
    expect(result.error).not.toBe("")
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
