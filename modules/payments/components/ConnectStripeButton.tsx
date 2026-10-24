"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { type ConnectActionState, connectStripeAction } from "@/modules/payments/actions/connect.actions"

export function ConnectStripeButton({ label }: { label: string }) {
  const [result, submit, isPending] = useActionState<ConnectActionState>(
    () => connectStripeAction(),
    {},
  )

  return (
    <form action={submit} className="flex flex-col items-start gap-3">
      <Button type="submit" disabled={isPending}>
        {isPending ? "Redirigiendo..." : label}
      </Button>
      {result.error ? (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      ) : null}
    </form>
  )
}
