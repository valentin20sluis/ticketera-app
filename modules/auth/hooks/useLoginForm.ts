"use client"

import { useCallback, useState } from "react"

import { loginFormSchema } from "@/modules/auth/schemas/auth.schema"
import type { LoginFormValues } from "@/modules/auth/types/auth.types"

function buildInitialValues(): LoginFormValues {
  return {
    email: "",
    password: "",
  }
}

export interface UseLoginFormResult {
  values: LoginFormValues
  errors: Partial<Record<string, string>>
  updateField: (field: keyof LoginFormValues, value: string) => void
  validate: () => boolean
  reset: () => void
}

export function useLoginForm(): UseLoginFormResult {
  const [values, setValues] = useState<LoginFormValues>(buildInitialValues)
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({})

  const updateField = useCallback((field: keyof LoginFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
  }, [])

  const validate = useCallback((): boolean => {
    const result = loginFormSchema.safeParse(values)

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
  }, [values])

  const reset = useCallback(() => {
    setValues(buildInitialValues())
    setErrors({})
  }, [])

  return {
    values,
    errors,
    updateField,
    validate,
    reset,
  }
}
