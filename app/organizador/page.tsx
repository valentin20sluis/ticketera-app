import type { Metadata } from "next"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { OrganizerDashboardView } from "@/modules/organizer/components/OrganizerDashboardView"
import { CURRENT_ORGANIZER } from "@/modules/organizer/data/current-organizer.mock"
import { SEED_ORGANIZER_CATALOG } from "@/modules/organizer/data/organizer-catalog.mock"

export const metadata: Metadata = {
  title: "Panel de organizador | Ticketera",
}

export default function OrganizadorPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
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

      <OrganizerDashboardView
        seedCatalog={SEED_ORGANIZER_CATALOG}
        organizerId={CURRENT_ORGANIZER.id}
      />
    </section>
  )
}
