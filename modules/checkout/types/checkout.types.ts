import type { TicketSelectionLine } from "@/modules/events/hooks/useTicketSelection"

export type CheckoutStep = "tickets" | "payment"

export interface ConfirmedOrder {
  orderNumber: string
  eventTitle: string
  eventImageUrl: string
  venueName: string
  city: string
  startDate: string
  lines: TicketSelectionLine[]
  totalQuantity: number
  totalAmount: number
  invoiceUrl?: string
  ticketQrCodes?: string[]
}
