import { EventsCatalog } from "@/modules/events/components/EventsCatalog"
import { getDb } from "@/lib/db/client"
import { MOCK_CATEGORIES } from "@/modules/events/data/events.mock"
import { listPublicEvents } from "@/modules/events/services/list-public-events.service"
import { connection } from "next/server"

export default async function EventosPage() {
  await connection()
  const events = await listPublicEvents(await getDb())
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

      <EventsCatalog
        events={events}
        categories={MOCK_CATEGORIES.map(({ id, name }) => ({ id, name }))}
      />
    </section>
  )
}
