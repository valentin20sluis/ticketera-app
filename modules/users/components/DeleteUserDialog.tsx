"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { AdminActionState } from "@/modules/users/actions/user-admin.actions";

type Props = {
  title: string;
  description: string;
  // What must be typed to enable the button: the user's email or "ELIMINAR".
  confirmText: string;
  // Receives what was typed so the caller can forward it to the server (which revalidates it).
  onConfirm: (typed: string) => Promise<AdminActionState>;
  onDone: (state: AdminActionState) => void;
  onClose: () => void;
};

function DeleteBody({ title, description, confirmText, onConfirm, onDone }: Omit<Props, "onClose">) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();
  const matches = typed.toLowerCase() === confirmText.toLowerCase();

  function confirm() {
    startTransition(async () => {
      const state = await onConfirm(typed);
      if (state.error) setError(state.error);
      else onDone(state);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1 text-sm">
        <label htmlFor="delete-confirm">
          Escribe <strong className="break-all">{confirmText}</strong> para confirmar
        </label>
        <Input
          id="delete-confirm"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          className="h-10"
        />
      </div>
      <div aria-live="polite">{error && <p className="text-sm text-destructive">{error}</p>}</div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" className="h-10" />}>Cancelar</DialogClose>
        <Button
          type="button"
          disabled={!matches || pending}
          onClick={confirm}
          className="h-10 bg-destructive text-white hover:bg-destructive/90"
        >
          {pending ? "Eliminando…" : "Eliminar"}
        </Button>
      </DialogFooter>
    </>
  );
}

// The body unmounts on close, so the typed text never survives a reopen.
export function DeleteUserDialog({ onClose, ...body }: Props) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DeleteBody {...body} />
      </DialogContent>
    </Dialog>
  );
}
