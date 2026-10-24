"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type ConnectActionState, connectStripeAction } from "@/modules/payments/actions/connect.actions"
import type { ConnectState } from "@/modules/payments/utils/connect-status"

interface StripeConnectBannerProps {
  state: ConnectState
}

export function StripeConnectBanner({ state }: StripeConnectBannerProps) {
  const [result, submit, isPending] = useActionState<ConnectActionState>(
    () => connectStripeAction(),
    {},
  )

  if (state === "active") return null

  const pending = state === "pending"

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {pending ? "Termina de configurar tus cobros" : "Conecta tu cuenta de cobro"}
        </CardTitle>
        <CardDescription>
          {pending
            ? "Tu cuenta de Stripe aún no está lista para recibir pagos. Continúa la configuración para empezar a vender."
            : "Conecta tu cuenta con Stripe para recibir los pagos de tus eventos."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="flex flex-col items-start gap-3">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Redirigiendo..." : pending ? "Continuar configuración" : "Conectar con Stripe"}
          </Button>
          {result.error ? (
            <p role="alert" className="text-sm text-destructive">
              {result.error}
            </p>
          ) : null}
        </form>
      </CardContent>
    </Card>
  )
}
