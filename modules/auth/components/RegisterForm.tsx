import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/modules/auth/components/PasswordInput"
import type { RegisterFormFields } from "@/modules/auth/types/auth.types"

interface RegisterFormProps {
  fields: RegisterFormFields
  termsAccepted: boolean
  errors: Partial<Record<string, string>>
  isSubmitting: boolean
  onFieldChange: (field: keyof RegisterFormFields, value: string) => void
  onTermsChange: (accepted: boolean) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSwitchToLogin: () => void
}

export function RegisterForm({
  fields,
  termsAccepted,
  errors,
  isSubmitting,
  onFieldChange,
  onTermsChange,
  onSubmit,
  onSwitchToLogin,
}: RegisterFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-semibold text-foreground">Crea tu cuenta</h2>
        <p className="text-sm text-muted-foreground">
          Regístrate para comprar tus entradas en minutos.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="register-full-name" className="text-sm font-medium text-foreground">
            Nombre completo
          </label>
          <Input
            id="register-full-name"
            value={fields.fullName}
            onChange={(event) => onFieldChange("fullName", event.target.value)}
            placeholder="Nombre y apellidos"
          />
          {errors.fullName && <p className="text-sm text-destructive">{errors.fullName}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="register-email" className="text-sm font-medium text-foreground">
            Correo electrónico
          </label>
          <Input
            id="register-email"
            type="email"
            value={fields.email}
            onChange={(event) => onFieldChange("email", event.target.value)}
            placeholder="correo@ejemplo.com"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="register-password" className="text-sm font-medium text-foreground">
            Contraseña
          </label>
          <PasswordInput
            id="register-password"
            value={fields.password}
            onChange={(value) => onFieldChange("password", value)}
            placeholder="Mínimo 8 caracteres"
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="register-confirm-password"
            className="text-sm font-medium text-foreground"
          >
            Confirmar contraseña
          </label>
          <PasswordInput
            id="register-confirm-password"
            value={fields.confirmPassword}
            onChange={(value) => onFieldChange("confirmPassword", value)}
            placeholder="Repite tu contraseña"
          />
          {errors.confirmPassword && (
            <p className="text-sm text-destructive">{errors.confirmPassword}</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Checkbox
              id="register-terms-accepted"
              checked={termsAccepted}
              onCheckedChange={onTermsChange}
            />
            <label htmlFor="register-terms-accepted" className="text-sm text-foreground">
              Acepto los términos y condiciones
            </label>
          </div>
          {errors.termsAccepted && (
            <p className="text-sm text-destructive">{errors.termsAccepted}</p>
          )}
        </div>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          Crear cuenta
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{" "}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="font-medium text-primary hover:underline"
        >
          Inicia sesión
        </button>
      </p>
    </div>
  )
}
