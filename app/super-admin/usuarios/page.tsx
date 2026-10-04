import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getDb } from "@/lib/db/client";
import { ROLE_LABELS } from "@/modules/users/constants";
import {
  changeRoleAction,
  setSuspendedAction,
} from "@/modules/users/actions/user-admin.actions";
import { InviteUserForm } from "@/modules/users/components/InviteUserForm";
import { requireRole } from "@/modules/users/services/current-user.service";
import { listUsers } from "@/modules/users/services/user-admin.service";
import { ASSIGNABLE_ROLES } from "@/modules/users/utils/permissions";

export default async function SuperAdminUsersPage() {
  await requireRole(["super_admin"]);
  const rows = await listUsers(await getDb());

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Usuarios y roles</h1>
        <p className="text-sm text-muted-foreground">
          Invita administradores y organizadores, cambia roles y suspende cuentas.
        </p>
      </header>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 font-medium">Invitar usuario</h2>
        <InviteUserForm />
      </section>

      <section className="flex flex-col divide-y rounded-xl border">
        {rows.map((user) => {
          const isRoot = user.role === "super_admin";
          return (
            <div
              key={user.id}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{user.fullName}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {user.isSuspended && <Badge variant="destructive">Suspendido</Badge>}
                {isRoot ? (
                  <Badge>{ROLE_LABELS.super_admin} · cuenta raíz</Badge>
                ) : (
                  <>
                    <form action={changeRoleAction} className="flex items-center gap-2">
                      <input type="hidden" name="userId" value={user.id} />
                      <select
                        name="role"
                        defaultValue={user.role}
                        className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm dark:bg-input/30"
                      >
                        {ASSIGNABLE_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" variant="outline" size="sm">
                        Guardar rol
                      </Button>
                    </form>
                    <form action={setSuspendedAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input
                        type="hidden"
                        name="suspended"
                        value={user.isSuspended ? "false" : "true"}
                      />
                      <Button type="submit" variant="ghost" size="sm">
                        {user.isSuspended ? "Reactivar" : "Suspender"}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
