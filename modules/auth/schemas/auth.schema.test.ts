import { describe, expect, it } from "vitest"

import { loginFormSchema, registerFormSchema } from "./auth.schema"

const validLogin = {
  email: "juan@example.com",
  password: "password123",
}

const validRegister = {
  fullName: "Juan Perez",
  email: "juan@example.com",
  password: "password123",
  confirmPassword: "password123",
  termsAccepted: true,
}

describe("loginFormSchema", () => {
  it("accepts a valid login", () => {
    const result = loginFormSchema.safeParse(validLogin)

    expect(result.success).toBe(true)
  })

  it("rejects an invalid email", () => {
    const result = loginFormSchema.safeParse({
      ...validLogin,
      email: "not-an-email",
    })

    expect(result.success).toBe(false)
  })

  it("rejects a password shorter than 8 characters", () => {
    const result = loginFormSchema.safeParse({
      ...validLogin,
      password: "1234567",
    })

    expect(result.success).toBe(false)
  })
})

describe("registerFormSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerFormSchema.safeParse(validRegister)

    expect(result.success).toBe(true)
  })

  it("rejects confirmPassword different from password, with the error on confirmPassword", () => {
    const result = registerFormSchema.safeParse({
      ...validRegister,
      confirmPassword: "otherpassword",
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["confirmPassword"])
    }
  })

  it("rejects termsAccepted false", () => {
    const result = registerFormSchema.safeParse({
      ...validRegister,
      termsAccepted: false,
    })

    expect(result.success).toBe(false)
  })
})
