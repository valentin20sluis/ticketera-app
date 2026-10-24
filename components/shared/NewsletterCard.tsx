"use client"

import { useActionState } from "react"
import { CheckCircle2Icon, MailIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  subscribeAction,
  type NewsletterState,
} from "@/modules/newsletter/actions/newsletter.actions"

export function NewsletterCard() {
  const [state, formAction, isPending] = useActionState<
    NewsletterState,
    FormData
  >(subscribeAction, {})

  return (
    <Card className="mx-auto max-w-2xl bg-brand text-brand-foreground">
      <CardHeader className="text-center">
        <CardTitle className="font-heading text-2xl">
          No te pierdas ningún evento
        </CardTitle>
        <CardDescription className="text-brand-foreground/80">
          Suscríbete y recibe las novedades y preventas antes que nadie.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          action={formAction}
          className="flex flex-col gap-3 sm:flex-row"
          noValidate
        >
          <div className="relative flex-1">
            <MailIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              // key resets the uncontrolled input after a successful subscription
              key={state.success ? "done" : "form"}
              type="email"
              name="email"
              placeholder="tu@email.com"
              aria-label="Correo electrónico"
              aria-invalid={state.error ? true : undefined}
              className="bg-background pl-8 text-foreground"
            />
          </div>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-cta text-cta-foreground hover:bg-cta/90"
          >
            {isPending ? "Enviando..." : "Suscribirme"}
          </Button>
        </form>
        {state.success && (
          <p
            role="status"
            className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium"
          >
            <CheckCircle2Icon className="size-4" />
            ¡Gracias! Te avisaremos de las novedades y preventas.
          </p>
        )}
        {state.error && (
          <p role="alert" className="mt-3 text-center text-sm font-medium">
            {state.error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
