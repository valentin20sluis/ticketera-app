import { CheckIcon } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ConnectStripeButton } from "@/modules/payments/components/ConnectStripeButton"
import type { ConnectState } from "@/modules/payments/utils/connect-status"

const COPY: Record<ConnectState, { description: string; button?: string }> = {
  not_connected: {
    description: "Aún no has conectado tu cuenta de Stripe para recibir pagos.",
    button: "Configurar pago",
  },
  pending: {
    description: "Tu cuenta de Stripe aún no está lista para recibir pagos.",
    button: "Continuar configuración",
  },
  active: { description: "Tu cuenta de pagos está lista para recibir el dinero de tus ventas." },
}

export function PaymentsSettingsSection({ state }: { state: ConnectState }) {
  const { description, button } = COPY[state]

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Pagos</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {button ? (
        <CardContent>
          <ConnectStripeButton label={button} />
        </CardContent>
      ) : null}
    </Card>
  )
}
