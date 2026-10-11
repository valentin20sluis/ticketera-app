"use client";

import { useState, useTransition } from "react";
import { SelectField } from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import {
  bulkUsersAction,
  type AdminActionState,
} from "@/modules/users/actions/user-admin.actions";
import { DeleteUserDialog } from "@/modules/users/components/DeleteUserDialog";
import { ROLE_LABELS } from "@/modules/users/constants";
import { ASSIGNABLE_ROLES, isAssignableRole, type AssignableRole } from "@/modules/users/utils/permissions";

type Props = {
  userIds: string[];
  // Called once an action finished; the table clears its selection and shows the message.
  onDone: (message: string) => void;
};

function summarize({ result }: AdminActionState, doneWord: [string, string]) {
  const done = result?.done ?? 0;
  const skipped = result?.failed.length ?? 0;
  const parts = [`${done} ${done === 1 ? doneWord[0] : doneWord[1]}`];
  if (skipped > 0) parts.push(`${skipped} ${skipped === 1 ? "omitido" : "omitidos"}`);
  return parts.join(", ");
}

export function BulkActionsBar({ userIds, onDone }: Props) {
  const [role, setRole] = useState<AssignableRole | "">("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function run(input: Record<string, unknown>, doneWord: [string, string]) {
    setError(undefined);
    startTransition(async () => {
      const state = await bulkUsersAction({ ...input, userIds });
      if (state.error) setError(state.error);
      else onDone(summarize(state, doneWord));
    });
  }

  return (
    <div
      role="region"
      aria-label="Acciones en lote"
      className="flex flex-wrap items-center gap-3 border-b bg-muted/50 px-4 py-3 text-sm"
    >
      <span className="font-medium">
        {userIds.length} {userIds.length === 1 ? "seleccionado" : "seleccionados"}
      </span>

      <div className="flex items-center gap-2">
        <SelectField
          aria-label="Nuevo rol"
          className="w-44"
          placeholder="Elegir rol…"
          options={ASSIGNABLE_ROLES.map((value) => ({ value, label: ROLE_LABELS[value] }))}
          value={role}
          onValueChange={(value) => setRole(isAssignableRole(value) ? value : "")}
        />
        <Button
          type="button"
          variant="outline"
          disabled={!role || pending}
          onClick={() => run({ type: "role", role }, ["actualizado", "actualizados"])}
          className="h-10"
        >
          Cambiar rol
        </Button>
      </div>

      <Button
        type="button"
        variant="outline"
        disabled={pending}
        onClick={() => run({ type: "suspend", suspended: true }, ["actualizado", "actualizados"])}
        className="h-10"
      >
        Suspender
      </Button>
      <Button
        type="button"
        variant="destructive"
        disabled={pending}
        onClick={() => setDeleting(true)}
        className="h-10"
      >
        Eliminar
      </Button>

      <div aria-live="polite" className="w-full">
        {error && <p className="text-destructive">{error}</p>}
      </div>

      {deleting && (
        <DeleteUserDialog
          title={`¿Eliminar ${userIds.length} ${userIds.length === 1 ? "usuario" : "usuarios"}?`}
          description="Esta acción es irreversible: las cuentas dejan de existir en el inicio de sesión y en el panel. Si solo quieres bloquear el acceso, suspéndelas."
          confirmText="ELIMINAR"
          onConfirm={async () => bulkUsersAction({ type: "delete", userIds })}
          onDone={(state) => onDone(summarize(state, ["eliminado", "eliminados"]))}
          onClose={() => setDeleting(false)}
        />
      )}
    </div>
  );
}
