import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  buildUserListHref,
  PAGE_SIZES,
  type UserListParams,
} from "@/modules/users/schemas/user-list-params.schema";
import { paginationWindow } from "@/modules/users/utils/pagination-window";

type Props = {
  params: UserListParams;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

const linkClass =
  "inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-border px-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/50";
const disabledClass = "pointer-events-none opacity-50";

export function UsersPagination({ params, page, pageSize, total, totalPages }: Props) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const href = (override: Partial<UserListParams>) => buildUserListHref(params, override);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        Mostrando {from}–{to} de {total} usuarios
      </p>

      <nav aria-label="Paginación" className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <Link href={href({ page: page - 1 })} rel="prev" className={linkClass}>
            Anterior
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(linkClass, disabledClass)}>
            Anterior
          </span>
        )}
        {paginationWindow(page, totalPages).map((number, index) =>
          number === null ? (
            <span key={`gap-${index}`} aria-hidden="true" className="px-1 text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={number}
              href={href({ page: number })}
              aria-current={number === page ? "page" : undefined}
              className={cn(
                linkClass,
                number === page && "border-brand bg-brand text-brand-foreground hover:bg-brand",
              )}
            >
              {number}
            </Link>
          ),
        )}
        {page < totalPages ? (
          <Link href={href({ page: page + 1 })} rel="next" className={linkClass}>
            Siguiente
          </Link>
        ) : (
          <span aria-disabled="true" className={cn(linkClass, disabledClass)}>
            Siguiente
          </span>
        )}
      </nav>

      <nav aria-label="Usuarios por página" className="flex items-center gap-2">
        <span className="text-muted-foreground">Por página:</span>
        {PAGE_SIZES.map((size) => (
          <Link
            key={size}
            href={href({ porPagina: size })}
            aria-current={size === params.porPagina ? "page" : undefined}
            className={cn(
              linkClass,
              size === params.porPagina && "border-brand bg-brand text-brand-foreground hover:bg-brand",
            )}
          >
            {size}
          </Link>
        ))}
      </nav>
    </div>
  );
}
