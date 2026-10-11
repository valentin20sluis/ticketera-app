"use client";

import { useState } from "react";
import Link from "next/link";
import { SelectField } from "@/components/shared/SelectField";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  USERS_BASE_PATH,
  type UserListParams,
} from "@/modules/users/schemas/user-list-params.schema";

// Sentinel for "any": the select needs a non-empty item value.
const ANY = "__any";

const ROLE_OPTIONS = [
  ["customer", "Cliente"],
  ["organizer", "Organizador"],
  ["admin", "Administrador"],
] as const;
const STATE_OPTIONS = [
  ["activo", "Activo"],
  ["suspendido", "Suspendido"],
] as const;
const REGISTRATION_OPTIONS = [
  ["7d", "Últimos 7 días"],
  ["30d", "Últimos 30 días"],
  ["anio", "Este año"],
] as const;
const ORDER_OPTIONS = [
  ["antiguos", "Más antiguos"],
  ["recientes", "Más recientes"],
  ["nombre-asc", "Nombre A-Z"],
  ["nombre-desc", "Nombre Z-A"],
] as const;

// The form submits by GET, so the chosen value travels in a hidden input ("" = any).
function FilterSelect({
  id,
  label,
  name,
  value,
  options,
  anyLabel,
}: {
  id: string;
  label: string;
  name: string;
  value?: string;
  options: readonly (readonly [string, string])[];
  anyLabel?: string;
}) {
  const [current, setCurrent] = useState(value ?? (anyLabel ? "" : options[0][0]));
  const items = [
    ...(anyLabel ? [{ value: ANY, label: anyLabel }] : []),
    ...options.map(([optionValue, optionLabel]) => ({ value: optionValue, label: optionLabel })),
  ];

  return (
    <div className="flex min-w-40 flex-col gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <input type="hidden" name={name} value={current} />
      <SelectField
        id={id}
        options={items}
        value={current || ANY}
        onValueChange={(next) => setCurrent(next === ANY ? "" : next)}
      />
    </div>
  );
}

export function UsersFilters({ params }: { params: UserListParams }) {
  return (
    <form
      method="get"
      action={USERS_BASE_PATH}
      className="flex flex-wrap items-end gap-3"
    >
      <input type="hidden" name="porPagina" value={params.porPagina} />
      <div className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
        <label htmlFor="users-q">Buscar</label>
        <Input
          id="users-q"
          type="search"
          name="q"
          defaultValue={params.q}
          maxLength={100}
          placeholder="Nombre o correo"
          className="h-10"
        />
      </div>
      <FilterSelect id="users-rol" label="Rol" name="rol" value={params.rol} options={ROLE_OPTIONS} anyLabel="Todos" />
      <FilterSelect id="users-estado" label="Estado" name="estado" value={params.estado} options={STATE_OPTIONS} anyLabel="Todos" />
      <FilterSelect id="users-registro" label="Registro" name="registro" value={params.registro} options={REGISTRATION_OPTIONS} anyLabel="Cualquier fecha" />
      <FilterSelect id="users-orden" label="Ordenar por" name="orden" value={params.orden} options={ORDER_OPTIONS} />
      <div className="flex items-center gap-2">
        <Button type="submit" className="h-10">
          Aplicar
        </Button>
        <Link
          href={USERS_BASE_PATH}
          className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          Limpiar filtros
        </Link>
      </div>
    </form>
  );
}
