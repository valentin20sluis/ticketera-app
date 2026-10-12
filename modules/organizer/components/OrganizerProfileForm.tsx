"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  type OrganizerProfileState,
  saveOrganizerProfileAction,
} from "@/modules/organizer/actions/organizer-profile.actions"

interface OrganizerProfileFormProps {
  fullName: string
  email: string
  ruc: string | null
}

export function OrganizerProfileForm({ fullName, email, ruc }: OrganizerProfileFormProps) {
  const [state, submit, isPending] = useActionState<OrganizerProfileState, FormData>(
    saveOrganizerProfileAction,
    { error: "" },
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Perfil</CardTitle>
        <CardDescription>Nombre y correo se administran desde tu cuenta.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={submit} className="flex max-w-md flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="fullName" className="text-sm font-medium">Nombre del organizador</label>
            <Input id="fullName" value={fullName} readOnly />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-sm font-medium">Correo</label>
            <Input id="email" value={email} readOnly />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="ruc" className="text-sm font-medium">RUC</label>
            <Input key={ruc ?? ""} id="ruc" name="ruc" defaultValue={ruc ?? ""} inputMode="numeric" maxLength={11} />
          </div>
          <div aria-live="polite" className="text-sm">
            {state.error ? <p role="alert" className="text-destructive">{state.error}</p> : null}
            {state.ok ? <p role="status">Perfil guardado</p> : null}
          </div>
          <Button type="submit" disabled={isPending} className="self-start">
            {isPending ? "Guardando..." : "Guardar perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
