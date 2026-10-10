"use client";

import { useState, useTransition } from "react";
import { Ban, CircleCheck, Lock, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  deleteUserAction,
  setSuspendedAction,
} from "@/modules/users/actions/user-admin.actions";
import { BulkActionsBar } from "@/modules/users/components/BulkActionsBar";
import { DeleteUserDialog } from "@/modules/users/components/DeleteUserDialog";
import { EditUserSheet } from "@/modules/users/components/EditUserSheet";
import { ROLE_LABELS } from "@/modules/users/constants";
import type { UserRole } from "@/modules/users/types/user.types";
import { formatShortDate } from "@/modules/users/utils/format-date";

export type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  isSuspended: boolean;
  createdAt: Date;
};

const ROLE_STYLES: Record<UserRole, string> = {
  super_admin: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300",
  admin: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
  organizer: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300",
  customer: "bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300",
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join("");
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium"
    >
      {initials(name)}
    </span>
  );
}

function RoleBadge({ role }: { role: UserRole }) {
  return <Badge className={ROLE_STYLES[role]}>{ROLE_LABELS[role]}</Badge>;
}

function StatusBadge({ suspended }: { suspended: boolean }) {
  return (
    <Badge
      className={
        suspended
          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300"
          : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300"
      }
    >
      <span
        aria-hidden
        className={cn("size-1.5 rounded-full", suspended ? "bg-red-500" : "bg-green-500")}
      />
      {suspended ? "Suspendido" : "Activo"}
    </Badge>
  );
}

function UserSummary({ user }: { user: UserRow }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar name={user.fullName} />
      <div className="min-w-0">
        <p className="truncate font-medium">{user.fullName}</p>
        <p className="text-xs text-muted-foreground">
          Registrado el {formatShortDate(user.createdAt)}
        </p>
        <div className="mt-1 flex gap-1.5">
          <RoleBadge role={user.role} />
          <StatusBadge suspended={user.isSuspended} />
        </div>
      </div>
    </div>
  );
}

const iconButton = "size-10";

export function UsersTable({ rows }: { rows: UserRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [deleting, setDeleting] = useState<UserRow | null>(null);
  const [notice, setNotice] = useState<string>();
  const [pending, startTransition] = useTransition();

  const selectable = rows.filter((user) => user.role !== "super_admin");
  const allSelected = selectable.length > 0 && selected.size === selectable.length;

  function toggle(id: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    setSelected(next);
  }

  function toggleAll(checked: boolean) {
    setSelected(new Set(checked ? selectable.map((user) => user.id) : []));
  }

  function toggleSuspended(user: UserRow) {
    setNotice(undefined);
    startTransition(async () => {
      const state = await setSuspendedAction({ userId: user.id, suspended: !user.isSuspended });
      if (state.error) setNotice(state.error);
    });
  }

  return (
    <div>
      {selected.size > 0 && (
        <BulkActionsBar
          userIds={[...selected]}
          onDone={(message) => {
            setSelected(new Set());
            setNotice(message);
          }}
        />
      )}
      <div aria-live="polite">
        {notice && <p className="border-b px-4 py-2 text-sm text-muted-foreground">{notice}</p>}
      </div>

      <Table className="min-w-[48rem]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 pl-4">
              <Checkbox
                aria-label="Seleccionar todos los usuarios de la página"
                checked={allSelected}
                indeterminate={selected.size > 0 && !allSelected}
                disabled={selectable.length === 0}
                onCheckedChange={toggleAll}
                className="relative after:absolute after:-inset-3"
              />
            </TableHead>
            <TableHead>Usuario</TableHead>
            <TableHead>Rol</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Registro</TableHead>
            <TableHead className="pr-4 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((user) => {
            const isRoot = user.role === "super_admin";
            return (
              <TableRow key={user.id} data-state={selected.has(user.id) ? "selected" : undefined}>
                <TableCell className="pl-4">
                  <Checkbox
                    aria-label={`Seleccionar a ${user.fullName}`}
                    checked={selected.has(user.id)}
                    disabled={isRoot}
                    onCheckedChange={(checked) => toggle(user.id, checked)}
                    className="relative after:absolute after:-inset-3"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar name={user.fullName} />
                    <div className="min-w-0">
                      <p className="max-w-56 truncate font-medium">{user.fullName}</p>
                      <p className="max-w-56 truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <RoleBadge role={user.role} />
                </TableCell>
                <TableCell>
                  <StatusBadge suspended={user.isSuspended} />
                </TableCell>
                <TableCell>{formatShortDate(user.createdAt)}</TableCell>
                <TableCell className="pr-4">
                  {isRoot ? (
                    <span className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
                      <Lock aria-hidden className="size-3.5" />
                      Cuenta raíz
                    </span>
                  ) : (
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        className={iconButton}
                        aria-label={`Editar a ${user.fullName}`}
                        onClick={() => setEditing(user)}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={iconButton}
                        disabled={pending}
                        aria-label={`${user.isSuspended ? "Reactivar" : "Suspender"} a ${user.fullName}`}
                        onClick={() => toggleSuspended(user)}
                      >
                        {user.isSuspended ? <CircleCheck /> : <Ban />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={cn(iconButton, "text-destructive")}
                        aria-label={`Eliminar a ${user.fullName}`}
                        onClick={() => setDeleting(user)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {editing && (
        <EditUserSheet
          key={editing.id}
          user={editing}
          summary={<UserSummary user={editing} />}
          onClose={() => setEditing(null)}
          onDelete={() => {
            setDeleting(editing);
            setEditing(null);
          }}
        />
      )}
      {deleting && (
        <DeleteUserDialog
          title={`¿Eliminar a ${deleting.fullName}?`}
          description="Esta acción es irreversible: la cuenta deja de existir en el inicio de sesión y en el panel. Si solo quieres bloquear el acceso, suspéndela."
          confirmText={deleting.email}
          onConfirm={(typed) => deleteUserAction({ userId: deleting.id, confirmEmail: typed })}
          onDone={() => {
            setSelected((current) => new Set([...current].filter((id) => id !== deleting.id)));
            setDeleting(null);
          }}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
