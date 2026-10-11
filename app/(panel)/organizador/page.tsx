import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { getDb } from "@/lib/db/client"
import { OrganizerEventsTable } from "@/modules/organizer/components/OrganizerEventsTable"
import { OrganizerSummaryStats } from "@/modules/organizer/components/OrganizerSummaryStats"
import { getOrganizerSummary } from "@/modules/organizer/services/get-organizer-summary.service"
import { requireRole } from "@/modules/users/services/current-user.service"

export const metadata: Metadata = {
  title: "Panel de organizador | Ticketera",
}

export default async function OrganizadorPage() {
  const user = await requireRole(["organizer", "admin", "super_admin"])
  const db = await getDb()
  const summary = await getOrganizerSummary(db, user)

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Mis eventos
          </h1>
          <p className="text-muted-foreground">
            Gestiona los eventos que has creado como organizador.
          </p>
        </div>

        <Button nativeButton={false} render={<Link href="/organizador/eventos/nuevo" />}>
          Crear evento
        </Button>
      </div>

      <OrganizerSummaryStats
        totalTicketsSold={summary.totalTicketsSold}
        totalRevenue={summary.totalRevenue}
        publishedEventsCount={summary.publishedEventsCount}
      />

      <OrganizerEventsTable
        events={summary.events}
        actor={user}
        emptyState={
          <div className="flex flex-col items-center gap-3 py-8">
            <p>Todavía no tienes eventos</p>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/organizador/eventos/nuevo" />}
            >
              Crear evento
            </Button>
          </div>
        }
      />
    </section>
  )
}
