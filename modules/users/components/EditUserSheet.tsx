"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { updateUserAction } from "@/modules/users/actions/user-admin.actions";
import { ROLE_LABELS } from "@/modules/users/constants";
import { ASSIGNABLE_ROLES, isAssignableRole } from "@/modules/users/utils/permissions";

type Props = {
  user: { id: string; fullName: string; email: string; role: string; isSuspended: boolean };
  // Avatar, name, registration date and badges, rendered by the table that owns them.
  summary: ReactNode;
  onClose: () => void;
  onDelete: () => void;
};

export function EditUserSheet({ user, summary, onClose, onDelete }: Props) {
  const [fullName, setFullName] = useState(user.fullName);
  const [role, setRole] = useState(isAssignableRole(user.role) ? user.role : "customer");
  const [suspended, setSuspended] = useState(user.isSuspended);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function save(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    startTransition(async () => {
      const state = await updateUserAction({
        userId: user.id,
        fullName,
        role,
        isSuspended: suspended,
      });
      if (state.error) setError(state.error);
      else onClose();
    });
  }

  return (
    <Sheet open onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="data-[side=right]:w-full data-[side=right]:sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Editar usuario</SheetTitle>
          <SheetDescription className="sr-only">
            Cambia el nombre, el rol o el estado de la cuenta.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={save} className="flex flex-1 flex-col gap-5 overflow-y-auto px-4">
          {summary}

          <div className="flex flex-col gap-1">
            <label htmlFor="edit-name">Nombre</label>
            <Input
              id="edit-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              required
              maxLength={255}
              className="h-10"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="edit-email">Correo</label>
            <Input id="edit-email" value={user.email} disabled className="h-10" />
            <p className="text-xs text-muted-foreground">
              El correo lo gestiona el inicio de sesión y no se puede cambiar aquí.
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="edit-role">Rol</label>
            <select
              id="edit-role"
              value={role}
              onChange={(event) => isAssignableRole(event.target.value) && setRole(event.target.value)}
              className="h-10 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
            >
              {ASSIGNABLE_ROLES.map((value) => (
                <option key={value} value={value}>
                  {ROLE_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <label className="flex min-h-10 items-start justify-between gap-4">
            <span className="flex flex-col">
              Cuenta suspendida
              <span className="text-xs text-muted-foreground">
                Una cuenta suspendida no puede usar el panel; sus datos se conservan.
              </span>
            </span>
            <Switch checked={suspended} onCheckedChange={setSuspended} />
          </label>

          <section className="flex flex-col gap-2 rounded-lg border border-destructive/40 p-3">
            <h3 className="font-medium text-destructive">Zona de peligro</h3>
            <p className="text-xs text-muted-foreground">
              Eliminar la cuenta es irreversible. Si solo quieres bloquear el acceso, suspéndela.
            </p>
            <Button type="button" variant="destructive" onClick={onDelete} className="h-10 self-start">
              Eliminar usuario…
            </Button>
          </section>

          <div aria-live="polite">{error && <p className="text-destructive">{error}</p>}</div>

          <SheetFooter className="-mx-4 flex-row justify-end border-t">
            <Button type="button" variant="outline" onClick={onClose} className="h-10">
              Cancelar
            </Button>
            <Button type="submit" disabled={pending || !fullName.trim()} className="h-10">
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
