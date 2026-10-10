import { notFound } from "next/navigation"
import { connection } from "next/server"

import { getDb } from "@/lib/db/client"
import { CheckoutFlow } from "@/modules/checkout/components/CheckoutFlow"
import { getCheckoutEventBySlug } from "@/modules/ticketing/services/get-event-checkout.service"

interface TicketSelectionPageProps {
  params: Promise<{ slug: string }>
}

export default async function TicketSelectionPage({ params }: TicketSelectionPageProps) {
  const { slug } = await params
  await connection()

  const checkout = await getCheckoutEventBySlug(await getDb(), slug)

  if (!checkout) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <CheckoutFlow event={checkout.event} zones={checkout.zones} />
    </div>
  )
}
