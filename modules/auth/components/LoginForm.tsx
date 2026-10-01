import type { FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/modules/auth/components/PasswordInput"
import type { LoginFormValues } from "@/modules/auth/types/auth.types"

interface LoginFormProps {
  values: LoginFormValues
  errors: Partial<Record<string, string>>
  isSubmitting: boolean
  onChange: (field: keyof LoginFormValues, value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onSwitchToRegister: () => void
}

export function LoginForm({
  values,
  errors,
  isSubmitting,
  onChange,
  onSubmit,
  onSwitchToRegister,
}: LoginFormProps) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-2xl font-semibold text-foreground">Hola de nuevo</h2>
        <p className="text-sm text-muted-foreground">
          Ingresa con tu correo y contraseña para seguir comprando.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-sm font-medium text-foreground">
            Correo electrónico
          </label>
          <Input
            id="login-email"
            type="email"
            value={values.email}
            onChange={(event) => onChange("email", event.target.value)}
            placeholder="correo@ejemplo.com"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-password" className="text-sm font-medium text-foreground">
            Contraseña
          </label>
          <PasswordInput
            id="login-password"
            value={values.password}
            onChange={(value) => onChange("password", value)}
            placeholder="Tu contraseña"
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>

        <button
          type="button"
          className="self-end text-sm font-medium text-primary hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </button>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          Iniciar sesión
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{" "}
        <button
          type="button"
          onClick={onSwitchToRegister}
          className="font-medium text-primary hover:underline"
        >
          Crea una gratis
        </button>
      </p>
    </div>
  )
}
