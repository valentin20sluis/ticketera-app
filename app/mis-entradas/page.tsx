import type { Metadata } from "next"

import { MyTicketsView } from "@/modules/my-tickets/components/MyTicketsView"
import { MOCK_TICKET_ORDERS } from "@/modules/my-tickets/data/my-tickets.mock"

export const metadata: Metadata = {
  title: "Mis entradas | Ticketera",
}

export default function MisEntradasPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold text-foreground">
          Mis entradas
        </h1>
        <p className="text-muted-foreground">
          Revisa el historial de tus compras y accede a tus entradas.
        </p>
      </div>

      <MyTicketsView orders={MOCK_TICKET_ORDERS} />
    </section>
  )
}
