import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { getDb } from "@/lib/db/client"
import { MyTicketsView } from "@/modules/my-tickets/components/MyTicketsView"
import { getPaidOrdersForUser } from "@/modules/my-tickets/services/get-user-orders.service"
import { getCurrentUser } from "@/modules/users/services/current-user.service"

export const metadata: Metadata = {
  title: "Mis entradas | Ticketera",
}

export default async function MisEntradasPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/ingresar")

  const orders = await getPaidOrdersForUser(await getDb(), user.id)

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <MyTicketsView orders={orders} />
    </section>
  )
}
