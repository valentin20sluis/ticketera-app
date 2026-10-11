import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const ORGANIZERS_BASE_PATH = "/super-admin/organizadores";

export function OrganizersSearch({ q, porPagina }: { q: string; porPagina: number }) {
  return (
    <form method="get" action={ORGANIZERS_BASE_PATH} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="porPagina" value={porPagina} />
      <Input
        type="search"
        name="q"
        defaultValue={q}
        maxLength={100}
        placeholder="Buscar por nombre o correo"
        aria-label="Buscar organizadores"
        className="h-10 max-w-sm min-w-48 flex-1"
      />
      <Button type="submit" className="h-10">
        Buscar
      </Button>
      {q && (
        <Link
          href={ORGANIZERS_BASE_PATH}
          className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Limpiar
        </Link>
      )}
    </form>
  );
}
