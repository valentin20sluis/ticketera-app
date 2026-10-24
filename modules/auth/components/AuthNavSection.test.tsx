import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AuthNavSection } from "@/modules/auth/components/AuthNavSection"
import type { UserRole } from "@/modules/users/types/user.types"

const useAuthSession = vi.hoisted(() => vi.fn())

vi.mock("@/modules/auth/hooks/useAuthSession", () => ({ useAuthSession }))
vi.mock("@/modules/users/components/BecomeOrganizerDialog", () => ({
  BecomeOrganizerDialog: () => null,
}))

afterEach(cleanup)

const session = { fullName: "Ana Perez", email: "ana@example.com" }

function renderMobile(role: UserRole | null, withSession = true) {
  useAuthSession.mockReturnValue({ session: withSession ? session : null, logout: vi.fn() })
  render(<AuthNavSection variant="mobile" role={role} />)
}

describe("AuthNavSection (mobile)", () => {
  it("shows the become-organizer CTA and no /organizador link for customer", () => {
    renderMobile("customer")
    expect(screen.getByRole("button", { name: "Quiero vender entradas" })).toBeInTheDocument()
    expect(screen.queryByText("Vender entradas")).not.toBeInTheDocument()
  })

  it.each<UserRole | null>(["organizer", "admin", "super_admin", null])(
    "keeps the /organizador link and no CTA for role %s",
    (role) => {
      renderMobile(role)
      expect(screen.getByText("Vender entradas").closest("a")).toHaveAttribute(
        "href",
        "/organizador",
      )
      expect(screen.queryByText("Quiero vender entradas")).not.toBeInTheDocument()
    },
  )

  it("keeps the current behavior without a session", () => {
    renderMobile(null, false)
    expect(screen.getByText("Vender entradas").closest("a")).toHaveAttribute(
      "href",
      "/organizador",
    )
    expect(screen.getByText("Iniciar sesión").closest("a")).toBeInTheDocument()
    expect(screen.queryByText("Quiero vender entradas")).not.toBeInTheDocument()
  })
})
