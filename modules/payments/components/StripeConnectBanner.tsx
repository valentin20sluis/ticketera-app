import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import type { ConnectState } from "@/modules/payments/utils/connect-status"

interface StripeConnectBannerProps {
  state: ConnectState
}

export function StripeConnectBanner({ state }: StripeConnectBannerProps) {
  if (state === "active") return null

  const pending = state === "pending"

  return (
    <Alert variant="destructive">
      <AlertTitle>
        {pending ? "Termina de configurar tus cobros" : "Configura tus cobros"}
      </AlertTitle>
      <AlertDescription>
        <p>
          {pending
            ? "Tu cuenta de Stripe aún no está lista para recibir pagos."
            : "Aún no puedes publicar eventos ni recibir pagos."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          nativeButton={false}
          render={<Link href="/organizador/configuracion" />}
        >
          Ir a configuración
        </Button>
      </AlertDescription>
    </Alert>
  )
}
