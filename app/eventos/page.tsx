import { EventsCatalog } from "@/modules/events/components/EventsCatalog"
import { MOCK_CATEGORIES, MOCK_EVENTS } from "@/modules/events/data/events.mock"

export default function EventosPage() {
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
        events={MOCK_EVENTS}
        categories={MOCK_CATEGORIES.map(({ id, name }) => ({ id, name }))}
      />
    </section>
  )
}
