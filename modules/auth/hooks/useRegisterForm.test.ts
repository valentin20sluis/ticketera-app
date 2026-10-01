import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useRegisterForm } from "./useRegisterForm"

function fillValidFields(result: { current: ReturnType<typeof useRegisterForm> }) {
  act(() => {
    result.current.updateField("fullName", "Juan Perez")
    result.current.updateField("email", "juan@example.com")
    result.current.updateField("password", "password123")
    result.current.updateField("confirmPassword", "password123")
  })
}

describe("useRegisterForm", () => {
  it("returns the expected initial state", () => {
    const { result } = renderHook(() => useRegisterForm())

    expect(result.current.fields).toEqual({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
    expect(result.current.termsAccepted).toBe(false)
    expect(result.current.errors).toEqual({})
  })

  it("updateField updates only the targeted field", () => {
    const { result } = renderHook(() => useRegisterForm())

    act(() => {
      result.current.updateField("fullName", "Juan Perez")
    })

    expect(result.current.fields).toEqual({
      fullName: "Juan Perez",
      email: "",
      password: "",
      confirmPassword: "",
    })
    expect(result.current.termsAccepted).toBe(false)
  })

  it("setTermsAccepted updates termsAccepted without touching fields", () => {
    const { result } = renderHook(() => useRegisterForm())

    fillValidFields(result)

    act(() => {
      result.current.setTermsAccepted(true)
    })

    expect(result.current.termsAccepted).toBe(true)
    expect(result.current.fields).toEqual({
      fullName: "Juan Perez",
      email: "juan@example.com",
      password: "password123",
      confirmPassword: "password123",
    })
  })

  it("validate returns true when all fields are valid", () => {
    const { result } = renderHook(() => useRegisterForm())

    fillValidFields(result)
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

  it("validate returns false and reports confirmPassword when it does not match", () => {
    const { result } = renderHook(() => useRegisterForm())

    fillValidFields(result)
    act(() => {
      result.current.updateField("confirmPassword", "differentPassword")
      result.current.setTermsAccepted(true)
    })

    let isValid = true
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(false)
    expect(result.current.errors.confirmPassword).toBeDefined()
  })

  it("validate returns false and reports termsAccepted when it is false", () => {
    const { result } = renderHook(() => useRegisterForm())

    fillValidFields(result)

    let isValid = true
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(false)
    expect(result.current.errors.termsAccepted).toBeDefined()
  })

  it("reset restores the initial state after data was entered", () => {
    const { result } = renderHook(() => useRegisterForm())

    fillValidFields(result)
    act(() => {
      result.current.setTermsAccepted(true)
    })

    act(() => {
      result.current.reset()
    })

    expect(result.current.fields).toEqual({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
    expect(result.current.termsAccepted).toBe(false)
    expect(result.current.errors).toEqual({})
  })
})
