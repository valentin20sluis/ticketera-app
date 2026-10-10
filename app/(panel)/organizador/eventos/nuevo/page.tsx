import type { Metadata } from "next"

import { CreateEventWizard } from "@/modules/organizer/components/CreateEventWizard"
import { SEED_ORGANIZER_CATALOG } from "@/modules/organizer/data/organizer-catalog.mock"

export const metadata: Metadata = {
  title: "Crear evento | Ticketera",
}

export default function CrearEventoPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Crear evento
        </h1>
        <p className="text-muted-foreground">
          Completa los datos del evento, el venue y la función con sus zonas.
        </p>
      </div>

      <CreateEventWizard seedCatalog={SEED_ORGANIZER_CATALOG} />
    </section>
  )
}
