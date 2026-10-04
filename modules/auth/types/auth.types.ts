export interface LoginFormValues {
  email: string
  password: string
}

export interface RegisterFormFields {
  fullName: string
  email: string
  password: string
  confirmPassword: string
}

export type RegisterFormValues = RegisterFormFields & {
  termsAccepted: boolean
}

export interface AuthSession {
  email: string
  fullName: string | null
}
