import { getDb } from "@/lib/db/client";
import { OrganizersSearch, ORGANIZERS_BASE_PATH } from "@/modules/users/components/OrganizersSearch";
import { OrganizersTable } from "@/modules/users/components/OrganizersTable";
import { UsersPagination } from "@/modules/users/components/UsersPagination";
import { parseUserListParams } from "@/modules/users/schemas/user-list-params.schema";
import { requireRole } from "@/modules/users/services/current-user.service";
import { listOrganizers } from "@/modules/users/services/organizer-list.service";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function SuperAdminOrganizersPage({ searchParams }: Props) {
  await requireRole(["super_admin"]);
  // Same q / page / porPagina parsing and limits as the users list.
  const { q, page: requestedPage, porPagina } = parseUserListParams(await searchParams);
  const list = await listOrganizers(await getDb(), { q, page: requestedPage, porPagina });

  function hrefFor({ page = 1, porPagina: size = porPagina }: { page?: number; porPagina?: number }) {
    const search = new URLSearchParams();
    if (q) search.set("q", q);
    if (size !== 10) search.set("porPagina", String(size));
    if (page !== 1) search.set("page", String(page));
    const query = search.toString();
    return query ? `${ORGANIZERS_BASE_PATH}?${query}` : ORGANIZERS_BASE_PATH;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Organizadores</h1>
        <p className="text-sm text-muted-foreground">
          Cuentas de organizador, su estado y cuántos eventos tienen.
        </p>
      </header>
      <OrganizersSearch q={q} porPagina={porPagina} />
      <OrganizersTable rows={list.rows} />
      {list.total > 0 && (
        <UsersPagination
          hrefFor={hrefFor}
          porPagina={porPagina}
          noun="organizadores"
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          totalPages={list.totalPages}
        />
      )}
    </div>
  );
}
