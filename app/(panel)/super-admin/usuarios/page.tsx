import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { InviteUserDialog } from "@/modules/users/components/InviteUserDialog";
import { UsersFilters } from "@/modules/users/components/UsersFilters";
import { UsersPagination } from "@/modules/users/components/UsersPagination";
import { UsersTable } from "@/modules/users/components/UsersTable";
import { UsersTabs } from "@/modules/users/components/UsersTabs";
import {
  buildUserListHref,
  parseUserListParams,
  USERS_BASE_PATH,
} from "@/modules/users/schemas/user-list-params.schema";
import { requireRole } from "@/modules/users/services/current-user.service";
import { countUsersByTab, listUsers } from "@/modules/users/services/user-admin.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminUsersPage({ searchParams }: Props) {
  await requireRole(["super_admin"]);
  const params = parseUserListParams(await searchParams);
  const db = await getDb();
  const [list, counts] = await Promise.all([listUsers(db, params), countUsersByTab(db, params)]);

  // Only what the table renders crosses to the client (no Clerk or Stripe ids).
  const rows = list.rows.map(({ id, fullName, email, role, isSuspended, createdAt }) => ({
    id,
    fullName,
    email,
    role,
    isSuspended,
    createdAt,
  }));

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Usuarios</h1>
          <p className="text-sm text-muted-foreground">
            Invita personas, edita sus datos, cambia roles y suspende o elimina cuentas.
          </p>
        </div>
        <InviteUserDialog />
      </header>

      <UsersTabs params={params} counts={counts} />

      <section className="flex flex-col gap-4 rounded-xl border p-4">
        <UsersFilters params={params} />
        {list.total === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-medium">No hay usuarios que coincidan</p>
            <p className="text-sm text-muted-foreground">Prueba con otra búsqueda o quita los filtros.</p>
            <Link
              href={USERS_BASE_PATH}
              className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm underline underline-offset-4 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              Limpiar filtros
            </Link>
          </div>
        ) : (
          <>
            <div className="-mx-4 border-y">
              <UsersTable key={buildUserListHref(params, { page: list.page })} rows={rows} />
            </div>
            <UsersPagination
              params={params}
              page={list.page}
              pageSize={list.pageSize}
              total={list.total}
              totalPages={list.totalPages}
            />
          </>
        )}
      </section>
    </div>
  );
}
