const ORDER_NUMBER_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const ORDER_NUMBER_LENGTH = 6

export function generateOrderNumber(): string {
  let suffix = ""
  for (let i = 0; i < ORDER_NUMBER_LENGTH; i++) {
    suffix += ORDER_NUMBER_CHARS[Math.floor(Math.random() * ORDER_NUMBER_CHARS.length)]
  }

  return `TKT-${suffix}`
}
