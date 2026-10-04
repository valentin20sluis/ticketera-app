import type { Metadata } from "next"

import { MyTicketsView } from "@/modules/my-tickets/components/MyTicketsView"
import { MOCK_TICKET_ORDERS } from "@/modules/my-tickets/data/my-tickets.mock"

export const metadata: Metadata = {
  title: "Mis entradas | Ticketera",
}

export default function MisEntradasPage() {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <MyTicketsView orders={MOCK_TICKET_ORDERS} />
    </section>
  )
}
