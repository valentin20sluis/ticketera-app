import { notFound } from "next/navigation"
import { connection } from "next/server"

import { getDb } from "@/lib/db/client"
import { CheckoutFlow } from "@/modules/checkout/components/CheckoutFlow"
import { getCheckoutEventBySlug } from "@/modules/ticketing/services/get-event-checkout.service"

interface TicketSelectionPageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ funcion?: string | string[] }>
}

export default async function TicketSelectionPage({ params, searchParams }: TicketSelectionPageProps) {
  const { slug } = await params
  const { funcion } = await searchParams
  await connection()

  const functionId = typeof funcion === "string" ? funcion : undefined
  const checkout = await getCheckoutEventBySlug(await getDb(), slug, functionId)

  if (!checkout) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <CheckoutFlow
        key={checkout.selectedFunctionId}
        event={checkout.event}
        zones={checkout.zones}
        functions={checkout.functions}
        selectedFunctionId={checkout.selectedFunctionId}
      />
    </div>
  )
}
