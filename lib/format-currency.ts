export function formatPrice(amount: number): string {
  const formatted = Number.isInteger(amount) ? amount.toString() : amount.toFixed(2)

  return `S/ ${formatted}`
}
