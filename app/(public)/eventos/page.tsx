import { EventsCatalog } from "@/modules/events/components/EventsCatalog"
import { getDb } from "@/lib/db/client"
import { listPublicCategories } from "@/modules/events/services/list-public-categories.service"
import { listPublicEvents } from "@/modules/events/services/list-public-events.service"
import { connection } from "next/server"

export default async function EventosPage() {
  await connection()
  const db = await getDb()
  const [events, categories] = await Promise.all([
    listPublicEvents(db),
    listPublicCategories(db),
  ])
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Eventos
        </h1>
        <p className="text-muted-foreground">
          Busca y filtra entre todos los eventos disponibles.
        </p>
      </div>

      <EventsCatalog events={events} categories={categories} />
    </section>
  )
}
