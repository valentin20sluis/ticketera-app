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
      <CardContent>
        {button ? (
          <ConnectStripeButton label={button} />
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-medium text-blue-600">
            <span className="flex size-6 items-center justify-center rounded-full bg-blue-600 text-white">
              <CheckIcon className="size-4" aria-hidden="true" />
            </span>
            Pago configurado
          </span>
        )}
      </CardContent>
    </Card>
  )
}
