import type { TicketSelectionLine } from "@/modules/events/hooks/useTicketSelection"

export type CheckoutStep = "tickets" | "payment" | "confirmation"

export type DocumentType = "dni" | "other"

export type PaymentMethod = "card" | "yape" | "pagoefectivo"

export interface BuyerInfo {
  fullName: string
  email: string
  documentType: DocumentType
  documentNumber: string
  phone: string
}

export interface CardDetails {
  cardNumber: string
  expiry: string
  cvv: string
  cardholderName: string
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
}
