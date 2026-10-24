import type { Metadata } from "next"

import { OrganizerProfileForm } from "@/modules/organizer/components/OrganizerProfileForm"
import { PaymentsSettingsSection } from "@/modules/payments/components/PaymentsSettingsSection"
import { deriveConnectState } from "@/modules/payments/utils/connect-status"
import { requireRole } from "@/modules/users/services/current-user.service"

export const metadata: Metadata = {
  title: "Configuración | Ticketera",
}

export default async function OrganizerSettingsPage() {
  const user = await requireRole(["organizer"])

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-3xl font-bold text-foreground">Configuración</h1>
      <OrganizerProfileForm fullName={user.fullName} email={user.email} ruc={user.ruc} />
      <PaymentsSettingsSection state={deriveConnectState(user)} />
    </section>
  )
}
