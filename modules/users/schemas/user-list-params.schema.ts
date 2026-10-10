export const LIST_ROLES = ["customer", "organizer", "admin"] as const;
export const LIST_STATES = ["activo", "suspendido"] as const;
export const LIST_REGISTRATIONS = ["7d", "30d", "anio"] as const;
export const LIST_ORDERS = ["antiguos", "recientes", "nombre-asc", "nombre-desc"] as const;
export const PAGE_SIZES = [10, 25, 50] as const;

export const USERS_BASE_PATH = "/super-admin/usuarios";
const MAX_QUERY_LENGTH = 100;

export type UserListParams = {
  q: string;
  rol?: (typeof LIST_ROLES)[number];
  estado?: (typeof LIST_STATES)[number];
  registro?: (typeof LIST_REGISTRATIONS)[number];
  orden: (typeof LIST_ORDERS)[number];
  page: number;
  porPagina: (typeof PAGE_SIZES)[number];
};

type RawParams = Record<string, string | string[] | undefined>;

const DEFAULTS = { q: "", orden: "antiguos", page: 1, porPagina: 10 } as const;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(list: readonly T[], value: string | undefined) {
  return list.find((item) => item === value);
}

export function parseUserListParams(raw: RawParams): UserListParams {
  const page = Number(first(raw.page));
  const porPagina = Number(first(raw.porPagina));
  return {
    q: (first(raw.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH),
    rol: oneOf(LIST_ROLES, first(raw.rol)),
    estado: oneOf(LIST_STATES, first(raw.estado)),
    registro: oneOf(LIST_REGISTRATIONS, first(raw.registro)),
    orden: oneOf(LIST_ORDERS, first(raw.orden)) ?? DEFAULTS.orden,
    page: Number.isInteger(page) && page >= 1 ? page : DEFAULTS.page,
    porPagina: PAGE_SIZES.find((size) => size === porPagina) ?? DEFAULTS.porPagina,
  };
}

export function buildUserListHref(params: UserListParams, overrides: Partial<UserListParams> = {}) {
  const next: UserListParams = { ...params, page: 1, ...overrides };
  const search = new URLSearchParams();
  if (next.q) search.set("q", next.q);
  if (next.rol) search.set("rol", next.rol);
  if (next.estado) search.set("estado", next.estado);
  if (next.registro) search.set("registro", next.registro);
  if (next.orden !== DEFAULTS.orden) search.set("orden", next.orden);
  if (next.porPagina !== DEFAULTS.porPagina) search.set("porPagina", String(next.porPagina));
  if (next.page !== DEFAULTS.page) search.set("page", String(next.page));
  const query = search.toString();
  return query ? `${USERS_BASE_PATH}?${query}` : USERS_BASE_PATH;
}
