import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useCheckoutForm } from "./useCheckoutForm"

const validBuyerFields: Array<[string, string]> = [
  ["fullName", "Juan Perez"],
  ["email", "juan@example.com"],
  ["documentNumber", "12345678"],
  ["phone", "987654321"],
]

const validCardFields: Array<[string, string]> = [
  ["cardNumber", "4111111111111111"],
  ["expiry", "12/28"],
  ["cvv", "123"],
  ["cardholderName", "Juan Perez"],
]

function fillValidBuyer(result: { current: ReturnType<typeof useCheckoutForm> }) {
  act(() => {
    for (const [field, value] of validBuyerFields) {
      result.current.updateBuyerField(field as keyof typeof result.current.buyer, value)
    }
  })
}

function fillValidCard(result: { current: ReturnType<typeof useCheckoutForm> }) {
  act(() => {
    for (const [field, value] of validCardFields) {
      result.current.updateCardField(field as keyof typeof result.current.card, value)
    }
  })
}

describe("useCheckoutForm", () => {
  it("returns the expected initial state", () => {
    const { result } = renderHook(() => useCheckoutForm())

    expect(result.current.buyer).toEqual({
      fullName: "",
      email: "",
      documentType: "dni",
      documentNumber: "",
      phone: "",
    })
    expect(result.current.card).toEqual({
      cardNumber: "",
      expiry: "",
      cvv: "",
      cardholderName: "",
    })
    expect(result.current.paymentMethod).toBe("card")
    expect(result.current.termsAccepted).toBe(false)
    expect(result.current.errors).toEqual({})
  })

  it("updateBuyerField updates only the targeted field", () => {
    const { result } = renderHook(() => useCheckoutForm())

    act(() => {
      result.current.updateBuyerField("fullName", "Juan Perez")
    })

    expect(result.current.buyer).toEqual({
      fullName: "Juan Perez",
      email: "",
      documentType: "dni",
      documentNumber: "",
      phone: "",
    })
    expect(result.current.paymentMethod).toBe("card")
    expect(result.current.termsAccepted).toBe(false)
  })

  it("updateCardField updates only the targeted field", () => {
    const { result } = renderHook(() => useCheckoutForm())

    act(() => {
      result.current.updateCardField("cvv", "123")
    })

    expect(result.current.card).toEqual({
      cardNumber: "",
      expiry: "",
      cvv: "123",
      cardholderName: "",
    })
    expect(result.current.paymentMethod).toBe("card")
    expect(result.current.termsAccepted).toBe(false)
  })

  it("setPaymentMethod changes the method without clearing card values", () => {
    const { result } = renderHook(() => useCheckoutForm())

    fillValidCard(result)

    act(() => {
      result.current.setPaymentMethod("yape")
    })

    expect(result.current.paymentMethod).toBe("yape")
    expect(result.current.card).toEqual({
      cardNumber: "4111111111111111",
      expiry: "12/28",
      cvv: "123",
      cardholderName: "Juan Perez",
    })
  })

  it("setTermsAccepted updates termsAccepted", () => {
    const { result } = renderHook(() => useCheckoutForm())

    act(() => {
      result.current.setTermsAccepted(true)
    })

    expect(result.current.termsAccepted).toBe(true)
  })

  it("validate returns true when all fields are valid and method is card", () => {
    const { result } = renderHook(() => useCheckoutForm())

    fillValidBuyer(result)
    fillValidCard(result)
    act(() => {
      result.current.setTermsAccepted(true)
    })

    let isValid = false
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it("validate returns true for method yape without touching card fields", () => {
    const { result } = renderHook(() => useCheckoutForm())

    fillValidBuyer(result)
    act(() => {
      result.current.setPaymentMethod("yape")
      result.current.setTermsAccepted(true)
    })

    let isValid = false
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it("validate returns false and reports buyer.email when the email is invalid", () => {
    const { result } = renderHook(() => useCheckoutForm())

    fillValidBuyer(result)
    act(() => {
      result.current.updateBuyerField("email", "not-an-email")
      result.current.setPaymentMethod("yape")
      result.current.setTermsAccepted(true)
    })

    let isValid = true
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(false)
    expect(result.current.errors["buyer.email"]).toBeDefined()
  })

  it("validate returns false and reports termsAccepted when it is false", () => {
    const { result } = renderHook(() => useCheckoutForm())

    fillValidBuyer(result)
    act(() => {
      result.current.setPaymentMethod("yape")
    })

    let isValid = true
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(false)
    expect(result.current.errors.termsAccepted).toBeDefined()
  })
})
