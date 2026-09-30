import { describe, expect, it } from "vitest"

import { checkoutFormSchema } from "./checkout.schema"

const validBuyer = {
  fullName: "Juan Perez",
  email: "juan@example.com",
  documentType: "dni" as const,
  documentNumber: "12345678",
  phone: "987654321",
}

const validCard = {
  cardNumber: "4111111111111111",
  expiry: "12/28",
  cvv: "123",
  cardholderName: "Juan Perez",
}

describe("checkoutFormSchema", () => {
  it("accepts a valid buyer with card details and paymentMethod card", () => {
    const result = checkoutFormSchema.safeParse({
      paymentMethod: "card",
      buyer: validBuyer,
      card: validCard,
      termsAccepted: true,
    })

    expect(result.success).toBe(true)
  })

  it("accepts a valid buyer without card when paymentMethod is yape", () => {
    const result = checkoutFormSchema.safeParse({
      paymentMethod: "yape",
      buyer: validBuyer,
      termsAccepted: true,
    })

    expect(result.success).toBe(true)
  })

  it("rejects an invalid email", () => {
    const result = checkoutFormSchema.safeParse({
      paymentMethod: "yape",
      buyer: { ...validBuyer, email: "not-an-email" },
      termsAccepted: true,
    })

    expect(result.success).toBe(false)
  })

  it("rejects termsAccepted false", () => {
    const result = checkoutFormSchema.safeParse({
      paymentMethod: "yape",
      buyer: validBuyer,
      termsAccepted: false,
    })

    expect(result.success).toBe(false)
  })

  it("rejects an invalid cardNumber when paymentMethod is card", () => {
    const result = checkoutFormSchema.safeParse({
      paymentMethod: "card",
      buyer: validBuyer,
      card: { ...validCard, cardNumber: "1234" },
      termsAccepted: true,
    })

    expect(result.success).toBe(false)
  })
})
