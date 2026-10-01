"use client"

import { useState } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TicketOrderCard } from "@/modules/my-tickets/components/TicketOrderCard"
import { getOrderStatus } from "@/modules/my-tickets/utils/get-order-status"
import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"

type OrdersTab = "all" | "upcoming" | "past"

interface MyTicketsViewProps {
  orders: ConfirmedOrder[]
}

export function MyTicketsView({ orders }: MyTicketsViewProps) {
  const [activeTab, setActiveTab] = useState<OrdersTab>("all")

  const filteredOrders = orders.filter(
    (order) => activeTab === "all" || getOrderStatus(order.startDate) === activeTab,
  )

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as OrdersTab)}
      >
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="upcoming">Próximas</TabsTrigger>
          <TabsTrigger value="past">Pasadas</TabsTrigger>
        </TabsList>
      </Tabs>

      {filteredOrders.length > 0 ? (
        <div className="flex flex-col gap-4">
          {filteredOrders.map((order) => (
            <TicketOrderCard key={order.orderNumber} order={order} />
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground">No tienes entradas en esta categoría.</p>
      )}
    </div>
  )
}
