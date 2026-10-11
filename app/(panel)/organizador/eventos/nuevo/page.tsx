import type { Metadata } from "next"

import { getDb } from "@/lib/db/client"
import { CreateEventWizard } from "@/modules/organizer/components/CreateEventWizard"
import {
  listActiveOrganizers,
  listCategories,
  listVenuesForOrganizer,
  listVenuesWithOwner,
} from "@/modules/organizer/services/event-read.service"
import { isEventAdmin } from "@/modules/organizer/utils/event-permissions"
import { requireRole } from "@/modules/users/services/current-user.service"

export const metadata: Metadata = {
  title: "Crear evento | Ticketera",
}

export default async function CrearEventoPage() {
  const user = await requireRole(["organizer", "admin", "super_admin"])
  const db = await getDb()
  const asAdmin = isEventAdmin(user)
  const [categories, venues, owners] = await Promise.all([
    listCategories(db),
    asAdmin ? listVenuesWithOwner(db) : listVenuesForOrganizer(db, user.id),
    asAdmin ? listActiveOrganizers(db) : undefined,
  ])

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Crear evento
        </h1>
        <p className="text-muted-foreground">
          {asAdmin
            ? "Elige el organizador dueño y completa los datos. Se guarda como borrador para que el organizador lo publique."
            : "Completa los datos del evento, el venue y la función con sus zonas."}
        </p>
      </div>

      <CreateEventWizard categories={categories} venues={venues} owners={owners} />
    </section>
  )
}
