"use client"

import { useCallback, useState } from "react"

import { registerFormSchema } from "@/modules/auth/schemas/auth.schema"
import type { RegisterFormFields } from "@/modules/auth/types/auth.types"

function buildInitialFields(): RegisterFormFields {
  return {
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  }
}

export interface UseRegisterFormResult {
  fields: RegisterFormFields
  termsAccepted: boolean
  errors: Partial<Record<string, string>>
  updateField: (field: keyof RegisterFormFields, value: string) => void
  setTermsAccepted: (accepted: boolean) => void
  validate: () => boolean
  reset: () => void
}

export function useRegisterForm(): UseRegisterFormResult {
  const [fields, setFields] = useState<RegisterFormFields>(buildInitialFields)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const updateField = useCallback((field: keyof RegisterFormFields, value: string) => {
    setFields((current) => ({ ...current, [field]: value }))
  }, [])

  const validate = useCallback((): boolean => {
    const payload = { ...fields, termsAccepted }
    const result = registerFormSchema.safeParse(payload)

    if (result.success) {
      setErrors({})
      return true
    }

    const nextErrors: Partial<Record<string, string>> = {}
    for (const issue of result.error.issues) {
      nextErrors[issue.path.join(".")] = issue.message
    }
    setErrors(nextErrors)
    return false
  }, [fields, termsAccepted])

  const reset = useCallback(() => {
    setFields(buildInitialFields())
    setTermsAccepted(false)
    setErrors({})
  }, [])

  return {
    fields,
    termsAccepted,
    errors,
    updateField,
    setTermsAccepted,
    validate,
    reset,
  }
}
