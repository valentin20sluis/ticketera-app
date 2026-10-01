import type { ConfirmedOrder } from "@/modules/checkout/types/checkout.types"

export const MOCK_TICKET_ORDERS: ConfirmedOrder[] = [
  {
    orderNumber: "TKT-8X3K2Q",
    eventTitle: "Festival de Verano Playa Asia",
    eventImageUrl: "https://picsum.photos/seed/festival-de-verano-playa-asia/800/500",
    venueName: "Playa Asia",
    city: "Lima",
    startDate: "2026-08-15T15:00:00-05:00",
    lines: [{ zoneId: "general", zoneName: "General", price: 50, quantity: 2, subtotal: 100 }],
    totalQuantity: 2,
    totalAmount: 100,
  },
  {
    orderNumber: "TKT-P7M1Z9",
    eventTitle: "Concierto Sinfónico de Año Nuevo",
    eventImageUrl: "https://picsum.photos/seed/concierto-sinfonico-ano-nuevo/800/500",
    venueName: "Gran Teatro Nacional",
    city: "Lima",
    startDate: "2026-01-10T20:00:00-05:00",
    lines: [
      { zoneId: "vip", zoneName: "Palco VIP", price: 120, quantity: 1, subtotal: 120 },
      { zoneId: "platea", zoneName: "Platea", price: 70, quantity: 2, subtotal: 140 },
    ],
    totalQuantity: 3,
    totalAmount: 260,
  },
  {
    orderNumber: "TKT-L4R6T2",
    eventTitle: "Cumbre de Innovación Digital",
    eventImageUrl: "https://picsum.photos/seed/cumbre-de-innovacion-digital/800/500",
    venueName: "Centro de Convenciones Lima",
    city: "Lima",
    startDate: "2026-12-05T09:00:00-05:00",
    lines: [
      { zoneId: "acreditacion", zoneName: "Acreditación", price: 180, quantity: 1, subtotal: 180 },
    ],
    totalQuantity: 1,
    totalAmount: 180,
  },
  {
    orderNumber: "TKT-Q9W3E7",
    eventTitle: "Noche de Comedia Stand Up",
    eventImageUrl: "https://picsum.photos/seed/noche-de-comedia-stand-up/800/500",
    venueName: "Teatro Canout",
    city: "Trujillo",
    startDate: "2027-01-20T20:30:00-05:00",
    lines: [
      { zoneId: "general", zoneName: "General en pie", price: 60, quantity: 4, subtotal: 240 },
    ],
    totalQuantity: 4,
    totalAmount: 240,
  },
  {
    orderNumber: "TKT-B2N5H8",
    eventTitle: "Gran Final de Vóley",
    eventImageUrl: "https://picsum.photos/seed/gran-final-de-voley/800/500",
    venueName: "Coliseo Dibós",
    city: "Arequipa",
    startDate: "2026-10-01T19:00:00-05:00",
    lines: [
      { zoneId: "numerado", zoneName: "Numerado", price: 90, quantity: 2, subtotal: 180 },
      { zoneId: "general", zoneName: "General", price: 55, quantity: 1, subtotal: 55 },
    ],
    totalQuantity: 3,
    totalAmount: 235,
  },
]
