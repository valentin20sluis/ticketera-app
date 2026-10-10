"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  inviteUserAction,
  type InviteUserState,
} from "@/modules/users/actions/user-admin.actions";
import { ROLE_LABELS } from "@/modules/users/constants";
import { ASSIGNABLE_ROLES } from "@/modules/users/utils/permissions";

const initialState: InviteUserState = {};

export function InviteUserDialog() {
  const [state, formAction, pending] = useActionState(inviteUserAction, initialState);

  return (
    <Dialog>
      <DialogTrigger render={<Button className="h-10" />}>Invitar usuario</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invitar usuario</DialogTitle>
          <DialogDescription>
            Enviaremos una invitación al correo con el rol elegido.
          </DialogDescription>
        </DialogHeader>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <label htmlFor="invite-email">Correo</label>
            <Input id="invite-email" name="email" type="email" required className="h-10" />
          </div>
          <RadioGroup
            name="role"
            defaultValue="organizer"
            aria-label="Rol"
            className="grid-cols-1 sm:grid-cols-3"
          >
            {ASSIGNABLE_ROLES.map((role) => (
              <label
                key={role}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm has-focus-visible:ring-[3px] has-focus-visible:ring-ring/50 has-data-checked:border-brand has-data-checked:bg-muted"
              >
                <RadioGroupItem value={role} />
                {ROLE_LABELS[role]}
              </label>
            ))}
          </RadioGroup>
          <div aria-live="polite">
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            {state.success && <p className="text-sm text-muted-foreground">Invitación enviada.</p>}
          </div>
          <Button type="submit" disabled={pending} className="h-10">
            {pending ? "Enviando…" : "Enviar invitación"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
