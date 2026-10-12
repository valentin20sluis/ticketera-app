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
import { becomeOrganizerAction } from "@/modules/users/actions/become-organizer.actions";

function BecomeOrganizerBody() {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function confirm() {
    setError(undefined);
    startTransition(async () => {
      // On success the action redirects and the navigation unmounts this dialog; it only returns on error.
      const state = await becomeOrganizerAction();
      if (state.error) setError(state.error);
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Vender entradas</DialogTitle>
        <DialogDescription>
          Tu cuenta pasará a organizador: podrás crear eventos y seguirás pudiendo comprar
          entradas. No necesitas aprobación.
        </DialogDescription>
      </DialogHeader>
      <div aria-live="polite">{error && <p className="text-sm text-destructive">{error}</p>}</div>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" className="h-10" />}>Cancelar</DialogClose>
        <Button type="button" disabled={pending} onClick={confirm} className="h-10">
          {pending ? "Procesando…" : "Sí, quiero vender entradas"}
        </Button>
      </DialogFooter>
    </>
  );
}

// The body unmounts on close, so a previous error never survives a reopen.
export function BecomeOrganizerDialog({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <BecomeOrganizerBody />
      </DialogContent>
    </Dialog>
  );
}
