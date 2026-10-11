"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { EventActionState } from "@/modules/organizer/actions/event.actions"

interface ConfirmEventActionDialogProps {
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => Promise<EventActionState>
  onClose: () => void
}

function Body({ title, description, confirmLabel, onConfirm, onClose }: ConfirmEventActionDialogProps) {
  const [error, setError] = useState<string>()
  const [pending, startTransition] = useTransition()

  function confirm() {
    startTransition(async () => {
      const state = await onConfirm()
      if (state.error) setError(state.error)
      else onClose()
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div aria-live="polite">{error && <p className="text-sm text-destructive">{error}</p>}</div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" className="h-10" />}>Volver</DialogClose>
        <Button
          type="button"
          disabled={pending}
          onClick={confirm}
          className="h-10 bg-destructive text-white hover:bg-destructive/90"
        >
          {pending ? "Procesando…" : confirmLabel}
        </Button>
      </DialogFooter>
    </>
  )
}

// The body unmounts on close, so a previous error never survives a reopen.
export function ConfirmEventActionDialog(props: ConfirmEventActionDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && props.onClose()}>
      <DialogContent>
        <Body {...props} />
      </DialogContent>
    </Dialog>
  )
}
