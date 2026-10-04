export function getTicketCode(orderNumber: string, ticketNumber: number): string {
  const orderCode = orderNumber.replace(/^TKT-/, "")
  return `TK-${orderCode}-${String(ticketNumber).padStart(2, "0")}`
}
