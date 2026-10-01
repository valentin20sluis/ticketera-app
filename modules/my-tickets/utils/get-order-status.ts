export type OrderStatus = "upcoming" | "past"

export function getOrderStatus(
  startDate: string,
  referenceDate: Date = new Date(),
): OrderStatus {
  return new Date(startDate).getTime() < referenceDate.getTime() ? "past" : "upcoming"
}
