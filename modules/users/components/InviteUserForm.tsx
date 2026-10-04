"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/modules/users/constants";
import {
  inviteUserAction,
  type InviteUserState,
} from "@/modules/users/actions/user-admin.actions";
import { ASSIGNABLE_ROLES } from "@/modules/users/utils/permissions";

const initialState: InviteUserState = {};

export function InviteUserForm() {
  const [state, formAction, pending] = useActionState(inviteUserAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-1 text-sm">
        Email
        <Input name="email" type="email" required />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Rol
        <select
          name="role"
          defaultValue="organizer"
          className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
        >
          {ASSIGNABLE_ROLES.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </label>
      <Button type="submit" disabled={pending}>
        Invitar
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state.success && <p className="text-sm text-muted-foreground">Invitación enviada.</p>}
    </form>
  );
}
