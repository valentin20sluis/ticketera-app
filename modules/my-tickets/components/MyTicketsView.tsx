"use client"

import { useEffect, useState } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TicketDetailPanel } from "@/modules/my-tickets/components/TicketDetailPanel"
import { TicketOrderListItem } from "@/modules/my-tickets/components/TicketOrderListItem"
import { getOrderStatus } from "@/modules/my-tickets/utils/get-order-status"
import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"

type OrdersTab = "upcoming" | "past"

interface MyTicketsViewProps {
  orders: ConfirmedOrder[]
}

export function MyTicketsView({ orders }: MyTicketsViewProps) {
  const [activeTab, setActiveTab] = useState<OrdersTab>("upcoming")
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string | null>(null)
  const [selectedTicketNumber, setSelectedTicketNumber] = useState(1)

  const upcomingCount = orders.filter(
    (order) => getOrderStatus(order.startDate) === "upcoming",
  ).length
  const pastCount = orders.filter(
    (order) => getOrderStatus(order.startDate) === "past",
  ).length

  const filteredOrders = orders.filter(
    (order) => getOrderStatus(order.startDate) === activeTab,
  )

  useEffect(() => {
    const isSelectionStillValid = filteredOrders.some(
      (order) => order.orderNumber === selectedOrderNumber,
    )

    if (!isSelectionStillValid) {
      // Intentional: resetting the selection when it falls out of the
      // filtered list (tab change or orders change) is exactly the
      // synchronization this effect exists for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedOrderNumber(filteredOrders[0]?.orderNumber ?? null)
      setSelectedTicketNumber(1)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, orders])

  const selectedOrder = filteredOrders.find(
    (order) => order.orderNumber === selectedOrderNumber,
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-bold text-foreground">
            Mis entradas
          </h1>
          <p className="text-muted-foreground">
            Revisa el historial de tus compras y accede a tus entradas.
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as OrdersTab)}
        >
          <TabsList>
            <TabsTrigger value="upcoming">Próximas ({upcomingCount})</TabsTrigger>
            <TabsTrigger value="past">Pasadas ({pastCount})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {filteredOrders.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="flex flex-col gap-3">
            {filteredOrders.map((order) => (
              <TicketOrderListItem
                key={order.orderNumber}
                order={order}
                isSelected={order.orderNumber === selectedOrderNumber}
                onSelect={() => {
                  setSelectedOrderNumber(order.orderNumber)
                  setSelectedTicketNumber(1)
                }}
              />
            ))}
          </div>

          {selectedOrder ? (
            <TicketDetailPanel
              order={selectedOrder}
              ticketNumber={selectedTicketNumber}
              onTicketNumberChange={setSelectedTicketNumber}
            />
          ) : null}
        </div>
      ) : (
        <p className="text-muted-foreground">No tienes entradas en esta categoría.</p>
      )}
    </div>
  )
}
