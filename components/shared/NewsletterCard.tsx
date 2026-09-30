"use client"

import { useState, type FormEvent } from "react"
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

type SubscriptionStatus = "idle" | "success" | "error"

export function NewsletterCard() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<SubscriptionStatus>("idle")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!email.trim()) {
      setStatus("error")
      return
    }

    setStatus("success")
    setEmail("")
  }

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
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 sm:flex-row"
          noValidate
        >
          <div className="relative flex-1">
            <MailIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              placeholder="tu@email.com"
              aria-label="Correo electrónico"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="bg-background pl-8 text-foreground"
            />
          </div>
          <Button
            type="submit"
            className="bg-cta text-cta-foreground hover:bg-cta/90"
          >
            Suscribirme
          </Button>
        </form>
        {status === "success" && (
          <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-medium">
            <CheckCircle2Icon className="size-4" />
            ¡Listo! Revisa tu correo para confirmar la suscripción.
          </p>
        )}
        {status === "error" && (
          <p className="mt-3 text-center text-sm font-medium">
            Ingresa un correo válido.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
