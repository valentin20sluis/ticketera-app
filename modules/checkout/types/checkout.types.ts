import type { TicketSelectionLine } from "@/modules/events/hooks/useTicketSelection"

export type CheckoutStep = "tickets" | "payment"

export interface OrderTicket {
  qrCode: string
  status: "valid" | "used"
  checkedInAt: string | null // ISO UTC; null si status = "valid"
}

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
  tickets?: OrderTicket[] // tickets[n-1] <-> stub n de buildTicketStubs
}
