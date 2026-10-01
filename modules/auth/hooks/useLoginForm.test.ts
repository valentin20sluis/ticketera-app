import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { useLoginForm } from "./useLoginForm"

describe("useLoginForm", () => {
  it("returns the expected initial state", () => {
    const { result } = renderHook(() => useLoginForm())

    expect(result.current.values).toEqual({
      email: "",
      password: "",
    })
    expect(result.current.errors).toEqual({})
  })

  it("updateField updates only the targeted field", () => {
    const { result } = renderHook(() => useLoginForm())

    act(() => {
      result.current.updateField("email", "juan@example.com")
    })

    expect(result.current.values).toEqual({
      email: "juan@example.com",
      password: "",
    })
  })

  it("validate returns true when all fields are valid", () => {
    const { result } = renderHook(() => useLoginForm())

    act(() => {
      result.current.updateField("email", "juan@example.com")
      result.current.updateField("password", "password123")
    })

    let isValid = false
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(true)
    expect(result.current.errors).toEqual({})
  })

  it("validate returns false and reports email when the email is invalid", () => {
    const { result } = renderHook(() => useLoginForm())

    act(() => {
      result.current.updateField("email", "not-an-email")
      result.current.updateField("password", "password123")
    })

    let isValid = true
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(false)
    expect(result.current.errors.email).toBeDefined()
  })

  it("validate returns false and reports password when it is too short", () => {
    const { result } = renderHook(() => useLoginForm())

    act(() => {
      result.current.updateField("email", "juan@example.com")
      result.current.updateField("password", "short")
    })

    let isValid = true
    act(() => {
      isValid = result.current.validate()
    })

    expect(isValid).toBe(false)
    expect(result.current.errors.password).toBeDefined()
  })

  it("reset restores the initial state after data was entered", () => {
    const { result } = renderHook(() => useLoginForm())

    act(() => {
      result.current.updateField("email", "not-an-email")
      result.current.updateField("password", "short")
    })
    act(() => {
      result.current.validate()
    })

    expect(result.current.errors).not.toEqual({})

    act(() => {
      result.current.reset()
    })

    expect(result.current.values).toEqual({
      email: "",
      password: "",
    })
    expect(result.current.errors).toEqual({})
  })
})
