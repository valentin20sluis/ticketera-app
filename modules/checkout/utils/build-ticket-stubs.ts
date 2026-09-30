import type { TicketSelectionLine } from "@/modules/events/hooks/useTicketSelection"

export interface TicketStub {
  zoneName: string
  price: number
  ticketNumber: number
  totalTickets: number
}

export function buildTicketStubs(lines: TicketSelectionLine[]): TicketStub[] {
  const totalTickets = lines.reduce((sum, line) => sum + line.quantity, 0)

  const stubs: TicketStub[] = []
  let ticketNumber = 1

  for (const line of lines) {
    for (let i = 0; i < line.quantity; i++) {
      stubs.push({
        zoneName: line.zoneName,
        price: line.price,
        ticketNumber,
        totalTickets,
      })
      ticketNumber++
    }
  }

  return stubs
}
