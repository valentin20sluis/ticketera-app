import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { z } from "zod"

import { getDb } from "@/lib/db/client"
import { CreateEventWizard } from "@/modules/organizer/components/CreateEventWizard"
import {
  getEventForEdit,
  listCategories,
  listVenuesForOrganizer,
} from "@/modules/organizer/services/event-read.service"
import { requireRole } from "@/modules/users/services/current-user.service"

export const metadata: Metadata = {
  title: "Editar evento | Ticketera",
}

export default async function EditarEventoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["organizer", "admin", "super_admin"])
  const { id } = await params
  if (!z.uuid().safeParse(id).success) notFound()

  const db = await getDb()
  const event = await getEventForEdit(db, user, id)
  if (!event) notFound()

  // Venues of the event's owner: an admin must not be offered someone else's venues.
  const [categories, venues] = await Promise.all([
    listCategories(db),
    listVenuesForOrganizer(db, event.organizerId),
  ])

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">Editar evento</h1>
        <p className="text-muted-foreground">Actualiza los datos de {event.values.details.title}.</p>
      </div>

      <CreateEventWizard
        categories={categories}
        venues={venues}
        edit={{ eventId: event.id, values: event.values, structureLocked: event.structureLocked }}
      />
    </section>
  )
}
