"use client"

import { useState, useTransition } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  deleteEventAction,
  setEventStatusAction,
} from "@/modules/organizer/actions/event.actions"
import { ConfirmEventActionDialog } from "@/modules/organizer/components/ConfirmEventActionDialog"

interface EventRowActionsProps {
  eventId: string
  title: string
  // Decided on the server from the permission matrix; the buttons only reflect it.
  canEdit: boolean
  canPublish: boolean
  canCancel: boolean
  canDelete: boolean
}

type Pending = "cancel" | "delete" | null

export function EventRowActions({
  eventId,
  title,
  canEdit,
  canPublish,
  canCancel,
  canDelete,
}: EventRowActionsProps) {
  const [confirming, setConfirming] = useState<Pending>(null)
  const [error, setError] = useState<string>()
  const [publishing, startPublish] = useTransition()

  if (!canEdit && !canPublish && !canCancel && !canDelete) return null

  function publish() {
    setError(undefined)
    startPublish(async () => {
      const state = await setEventStatusAction({ eventId, status: "published" })
      if (state.error) setError(state.error)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href={`/organizador/eventos/${eventId}/editar`} />}
          >
            Editar
          </Button>
        )}
        {canPublish && (
          <Button size="sm" onClick={publish} disabled={publishing}>
            {publishing ? "Publicando…" : "Publicar"}
          </Button>
        )}
        {canCancel && (
          <Button variant="outline" size="sm" onClick={() => setConfirming("cancel")}>
            Cancelar
          </Button>
        )}
        {canDelete && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive"
            onClick={() => setConfirming("delete")}
          >
            Eliminar
          </Button>
        )}
      </div>

      <div aria-live="polite">{error && <p className="max-w-48 text-right text-xs text-destructive">{error}</p>}</div>

      {confirming === "cancel" && (
        <ConfirmEventActionDialog
          title={`Cancelar "${title}"`}
          description="El evento dejará de estar a la venta y no podrá reactivarse. Si ya tiene entradas vendidas, este cambio no genera reembolsos automáticos."
          confirmLabel="Cancelar evento"
          onConfirm={() => setEventStatusAction({ eventId, status: "cancelled" })}
          onClose={() => setConfirming(null)}
        />
      )}
      {confirming === "delete" && (
        <ConfirmEventActionDialog
          title={`Eliminar "${title}"`}
          description="Se borrará el borrador de forma permanente. Esta acción no se puede deshacer."
          confirmLabel="Eliminar"
          onConfirm={() => deleteEventAction({ eventId })}
          onClose={() => setConfirming(null)}
        />
      )}
    </div>
  )
}
