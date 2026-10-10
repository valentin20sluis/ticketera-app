# Admin Users CRUD

Estado: approved

## Objetivo

Rediseñar `/super-admin/usuarios` (hoy `app/(panel)/super-admin/usuarios/page.tsx` lista todos los
usuarios sin filtros ni paginación y solo permite invitar, cambiar rol y suspender) para que el
super admin tenga un CRUD completo: pestañas por rol con contadores, búsqueda, filtros, orden,
paginación en SQL, edición de nombre/rol/estado, eliminación con confirmación y acciones en lote.
El estado de la vista vive en la URL (`searchParams`), así que la página sigue siendo de servidor.

## Fuera de alcance

- **Stripe Connect**, Dashboard y Organizadores del super admin (`app/(panel)/super-admin/page.tsx`, `organizadores/`).
- **Cambiar el correo** de un usuario (lo gestiona Clerk; en el panel es solo lectura).
- **Exportar CSV**.
- **Historial / auditoría** de cambios (ver Fases siguientes).
- Selección de filas **entre páginas** ("seleccionar los N resultados"): el lote es solo la página actual.
- Reasignar o archivar eventos/sedes de un organizador eliminado (ver pregunta 2).
- Cerrar la sesión de Clerk de un usuario suspendido: la suspensión sigue siendo solo de DB, aplicada por `requireRole`.

## Reutilización

- Existente que se reutiliza:
  - `modules/users/utils/permissions.ts` (`canManageUser`, `ASSIGNABLE_ROLES`, `AssignableRole`): regla de permiso por usuario destino; `canManageUser` ya excluye la cuenta raíz y al propio actor (el actor siempre es `super_admin`).
  - `modules/users/constants.ts` (`ROLE_LABELS`, `HIDDEN_FROM_PANEL_EMAILS` hoy `[]`, `SUPER_ADMIN_EMAIL`): etiquetas y filtro de ocultos (se conserva en la consulta).
  - `modules/users/services/current-user.service.ts` (`requireRole`, `CurrentUser`): revalidación de permisos en cada acción.
  - `modules/users/services/user-admin.service.ts` (`inviteUser`, `changeUserRole`, `setUserSuspended`): se conservan tal cual; la invitación sigue llevando el rol en `publicMetadata` y se aplica al registrarse (`resolveInitialRole`).
  - `app/api/webhooks/clerk/route.ts`: sin cambios; `user.deleted` ya llama a `markClerkUserDeleted`.
  - `lib/db/test-helpers.ts` (`createTestDb`, PGlite con migraciones de `./drizzle`) para los tests de servicio.
  - shadcn ya instalados en `components/ui/`: `button`, `badge`, `input`, `checkbox`, `sheet`, `card`, `radio-group`, `dropdown-menu`, `tabs`.
- Existente que se extiende:
  - `lib/db/schema.ts`: `users` gana `deleted_at` (T1).
  - `modules/users/services/user-admin.service.ts`: `listUsers` pasa a recibir filtros y paginar; se agrega `countUsersByTab` (T2).
  - `modules/users/services/user-sync.service.ts`: `markClerkUserDeleted` además fija `deleted_at` (T3).
  - `modules/users/actions/user-admin.actions.ts`: acciones nuevas; `changeRoleAction` (FormData) se reemplaza (T4). Solo la usa la página vieja (verificado con grep).
- Nuevo (y por qué no sirve nada existente):
  - `modules/users/schemas/user-list-params.schema.ts`: no existe parseo/validación de `searchParams` ni constructor de URLs.
  - `modules/users/services/user-account.service.ts`: edición de perfil, borrado y lotes con Clerk; `user-admin.service.ts` solo cubre rol y suspensión de un usuario.
  - Componentes de la pantalla en `modules/users/components/` (T5, T6). Los filtros usan `<form method="get">` con controles nativos (como ya hace el panel con `<select>`) y las pestañas/paginación son `<Link>`: sin `tabs` de shadcn (es estado cliente, no navegación) ni estado cliente para filtros (KISS).
- Dependencias / componentes shadcn a instalar antes de implementar: `npx shadcn@latest add dialog switch table` (los ejecuta T5; archivos generados `components/ui/dialog.tsx`, `switch.tsx`, `table.tsx`, no se editan a mano). Sin dependencias npm nuevas. Migración: T1 corre `npm run db:generate`; **el usuario aplica `npm run db:migrate`** antes de probar manualmente (los tests usan PGlite y migran solos).

## Decisiones de diseño (resumen)

- **Eliminar = borrado lógico**: `users.deleted_at`. Un DELETE físico falla por las FK sin cascade (`orders.customer_id`, `venues.organizer_id`, `events.organizer_id`) y destruiría el historial de compras. Hoy `markClerkUserDeleted` ya es "soft" (solo `is_suspended = true`); se completa con `deleted_at`. El usuario eliminado desaparece de la lista y de los contadores; sus pedidos, tickets, sedes y eventos se conservan intactos.
- **Clerk**: eliminar también llama `clerkClient().users.deleteUser(clerkUserId)` **antes** de escribir en DB (si Clerk falla, no hay cambios; si Clerk ok y la DB falla, el webhook `user.deleted` converge). Si Clerk responde 404 (ya no existe) se continúa con la DB.
- **Editar nombre** se escribe en Clerk (`updateUser({ firstName, lastName })`, primer token = nombre, resto = apellido) **y luego** en DB, porque el webhook `user.updated` (`upsertClerkUser`) sobrescribe `full_name` con el valor de Clerk. Solo se llama a Clerk si el nombre cambió. Rol y suspensión son solo de DB (el webhook nunca los pisa).
- **Lotes**: solo filas de la página actual, máx. 50 ids. Cada usuario se evalúa con `canManageUser`; los no permitidos o inexistentes se omiten y se informan. Resultado parcial `{ done, failed: [{ userId, reason }] }`. Rol y suspensión: un único `UPDATE ... WHERE id IN (permitidos)`. Eliminar: secuencial (Clerk por usuario), un fallo no detiene el resto.
- **Contadores**: una sola consulta agregada con `count(*) FILTER (WHERE ...)`, que respeta `q` y `registro` pero ignora `rol`/`estado` (para que cada pestaña muestre cuántos resultados daría).
- **URL** (valores inválidos se normalizan al default, nunca lanzan): `q` (trim, máx. 100), `rol` = `customer|organizer|admin` (`admin` incluye `super_admin`), `estado` = `activo|suspendido`, `registro` = `7d|30d|anio` (omitido = cualquier fecha; "este año" = desde el 1 de enero UTC), `orden` = `antiguos` (default) `|recientes|nombre-asc|nombre-desc`, `page` (entero ≥ 1, se ajusta al último si excede), `porPagina` = `10|25|50` (default 10).
- **Pestañas = atajos de `rol`/`estado`**: Todos (sin ambos), Clientes (`rol=customer`), Organizadores (`rol=organizer`), Administradores (`rol=admin`), Suspendidos (`estado=suspendido`). Activa (`aria-current="page"`) la que coincide exactamente; con `rol` y `estado` a la vez ninguna.

## Criterios de aceptación

- AC-1: `users` tiene la columna `deleted_at timestamptz` nullable y existe una migración generada en `drizzle/`; `createTestDb()` migra sin error.
- AC-2: `parseUserListParams(raw)` devuelve valores por defecto (`orden=antiguos`, `page=1`, `porPagina=10`, resto vacío) ante parámetros ausentes o inválidos (`page=-3`, `page=abc`, `porPagina=1000`, `orden=x`, `rol=super_admin`), acepta solo las listas blancas de la sección "URL", recorta `q` a 100 caracteres y toma el primer valor si llega un array.
- AC-3: `buildUserListHref(params, overrides)` genera `/super-admin/usuarios?...` omitiendo los valores por defecto y codificando `q`; cambiar cualquier filtro/orden/`porPagina` reinicia `page`.
- AC-4: `listUsers(db, params)` pagina en SQL (`LIMIT/OFFSET`) y devuelve `{ rows, total, page, pageSize, totalPages }`; sin parámetros el orden es `created_at` ascendente (igual que hoy) con desempate por `id`; excluye `deleted_at IS NOT NULL` y `HIDDEN_FROM_PANEL_EMAILS`; ajusta `page` al último disponible.
- AC-5: Los filtros `rol` (con `admin` incluyendo `super_admin`), `estado`, `registro` y los 4 `orden` devuelven el subconjunto y el orden esperados (nombre sin distinguir mayúsculas).
- AC-6: La búsqueda `q` usa `ILIKE` sobre `full_name` y `email`; los caracteres `%`, `_` y `\` del texto se escapan y se tratan como literales (buscar `100%` no devuelve a todos).
- AC-7: `countUsersByTab(db, params)` ejecuta **una** consulta y devuelve `{ all, customer, organizer, admin, suspended }` respetando `q` y `registro`, ignorando `rol`/`estado` y excluyendo eliminados.
- AC-8: `updateUserProfile` con nombre cambiado llama a Clerk `updateUser` antes de escribir `full_name`; si Clerk lanza, la DB no cambia; con nombre igual no llama a Clerk; aplica `role` y `isSuspended` solo en DB; rechaza cuentas no gestionables (`canManageUser`).
- AC-9: `deleteUser` exige que el correo escrito coincida (sin distinguir mayúsculas) con el del usuario, rechaza la cuenta raíz, llama a `deleteUser` de Clerk antes de la DB (404 de Clerk se tolera) y fija `deleted_at` e `is_suspended = true` sin borrar filas ni tocar `orders`/`events`/`venues`.
- AC-10: `markClerkUserDeleted` fija `deleted_at` (solo si era null) además de `is_suspended = true`, es idempotente y no hace que `upsertClerkUser` reactive a un eliminado.
- AC-11: Las operaciones en lote (`bulkChangeRole`, `bulkSetSuspended`, `bulkDelete`) omiten ids inexistentes, la cuenta raíz y cualquier destino que `canManageUser` rechace, aplican el resto y devuelven `{ done, failed }`; en `bulkDelete` el fallo de Clerk en un usuario no impide procesar los demás.
- AC-12: Toda Server Action de `user-admin.actions.ts` llama a `requireRole(["super_admin"])` antes de cualquier otra cosa y valida la entrada con zod v4 (`userId` uuid, `role` en `ASSIGNABLE_ROLES`, `fullName` 1–255 tras `trim`, lotes `min(1).max(50)` ids uuid sin repetidos); entrada inválida devuelve `{ error }` sin tocar la DB; las acciones exitosas llaman a `revalidatePath("/super-admin/usuarios")`.
- AC-13: La página lee `searchParams` como `Promise` (`await`), lo normaliza con `parseUserListParams`, exige `requireRole(["super_admin"])` y renderiza: cabecera con "Invitar usuario", pestañas con contador, filtros (búsqueda, rol, estado, registro, orden, "Limpiar filtros" que enlaza a la URL base), tabla y paginación; sin resultados muestra un estado vacío.
- AC-14: Pestañas, filtros y paginación son enlaces/GET (funcionan sin JS): la pestaña activa y el número de página actual llevan `aria-current`; la paginación muestra "Mostrando X–Y de N usuarios", anterior/siguiente (deshabilitados en los extremos), números de página y opciones 10/25/50.
- AC-15: Cada fila muestra casilla, avatar con iniciales, nombre, correo, badge de rol, badge de estado con punto **y texto**, fecha de registro y botones editar / suspender-reactivar / eliminar con `aria-label` que incluye el nombre del usuario; la cuenta raíz (`super_admin`) muestra "Cuenta raíz" y ningún botón ni casilla habilitada. La tabla va en un contenedor con scroll horizontal y los filtros se envuelven (`flex-wrap`).
- AC-16: Al marcar filas aparece la barra de lote ("N seleccionados": Cambiar rol, Suspender, Eliminar); existe casilla "seleccionar todos de la página"; la selección se limpia al terminar la acción o cambiar de página; el resultado parcial se muestra (p. ej. "3 actualizados, 1 omitido").
- AC-17: El panel "Editar usuario" (`Sheet`) muestra nombre editable, correo deshabilitado con la nota de que lo gestiona Clerk, rol (no `super_admin`), interruptor "Cuenta suspendida" y "Zona de peligro" con "Eliminar usuario…".
- AC-18: El diálogo de eliminar (individual y en lote) tiene el botón rojo deshabilitado hasta que el texto escrito coincida: el correo del usuario (individual) o la palabra `ELIMINAR` (lote); el servidor revalida la coincidencia del correo (AC-9).
- AC-19: El diálogo "Invitar usuario" ofrece correo (con `<label>`) y rol en tarjetas seleccionables (Cliente, Organizador, Administrador; `radio-group` con labels), usa `inviteUserAction` y muestra error/éxito; `InviteUserForm.tsx` queda eliminado sin referencias.
- AC-20: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tareas

### T1 — Columna `deleted_at` + migración

- Archivos: `lib/db/schema.ts` (modificar: `deletedAt: timestamp("deleted_at", { withTimezone: true })` en `users`), `drizzle/0004_<nombre>.sql` (crear, generado), `drizzle/meta/0004_snapshot.json` (crear, generado), `drizzle/meta/_journal.json` (modificar, generado)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Tests: no aplica test nuevo (columna y migración generadas); se verifica porque `createTestDb()` migra y `npx vitest run lib/db` sigue pasando. Ejecutar `npm run db:generate`; **el usuario aplica `npm run db:migrate`**.
- [x] Completada

### T2 — Parámetros de URL y consulta paginada con contadores

- Archivos: `modules/users/schemas/user-list-params.schema.ts` (crear: `parseUserListParams`, `buildUserListHref`, tipos `UserListParams`, constantes de listas blancas y `PAGE_SIZES`), `modules/users/schemas/user-list-params.schema.test.ts` (crear), `modules/users/services/user-admin.service.ts` (modificar: nuevo `listUsers(db, params)`, `countUsersByTab`, helper interno `escapeLike`), `modules/users/services/user-admin.service.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- Tests: schema — defaults, listas blancas, arrays, `q` largo, `page` inválido, `buildUserListHref` omite defaults y reinicia `page`. Servicio con `createTestDb`: orden default, paginación y clamp de página, cada filtro y orden, `admin` incluye `super_admin`, búsqueda con `%`/`_`/`\` literales, excluye eliminados y ocultos (mantener el `vi.mock` de constants), `countUsersByTab` correcto (verificar que es una consulta usando conteos coherentes con los filtros `q`/`registro`).
- [x] Completada

### T3 — Servicio de cuentas: editar, eliminar y lotes

- Archivos: `modules/users/services/user-account.service.ts` (crear: `updateUserProfile`, `deleteUser`, `bulkChangeRole`, `bulkSetSuspended`, `bulkDelete`; tipo `BulkResult = { done: number; failed: { userId: string; reason: string }[] }`), `modules/users/services/user-account.service.test.ts` (crear), `modules/users/services/user-sync.service.ts` (modificar: `markClerkUserDeleted` fija `deletedAt` si es null), `modules/users/services/user-sync.service.test.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-8, AC-9, AC-10, AC-11
- Tests: `createTestDb` + `vi.mock("@clerk/nextjs/server")` (`clerkClient` con `users.updateUser`/`deleteUser`): orden Clerk→DB y que un fallo de Clerk deja la DB intacta; nombre sin cambios no llama a Clerk; correo de confirmación incorrecto/mayúsculas; cuenta raíz rechazada; 404 de Clerk tolerado; el usuario eliminado conserva sus `orders` (insertar una orden y comprobar que sigue); lotes con mezcla de permitidos, raíz e inexistentes → `{ done, failed }` correcto; `bulkDelete` continúa tras un fallo de Clerk; `markClerkUserDeleted` idempotente y `upsertClerkUser` posterior no limpia `deleted_at`.
- [x] Completada

### T4 — Server Actions

- Archivos: `modules/users/actions/user-admin.actions.ts` (modificar: se conserva `inviteUserAction`; `setSuspendedAction` y `changeRoleAction` se reemplazan por `updateUserAction`, `setSuspendedAction` (entrada objeto), `deleteUserAction` y `bulkUsersAction` con unión discriminada `type: "role" | "suspend" | "delete"`; todas devuelven `{ error?: string; result?: BulkResult; success?: boolean }`), `modules/users/actions/user-admin.actions.test.ts` (crear)
- Depende de: T3
- Grupo paralelo: G3
- Cubre: AC-12
- Tests: `vi.mock` de `requireRole`, de los servicios y de `next/cache`: `requireRole` se invoca primero (si lanza/redirige no se llama a ningún servicio); entradas inválidas (uuid, rol `super_admin`, nombre vacío, lote vacío / > 50 / ids repetidos) devuelven `{ error }`; casos válidos llaman al servicio con el actor y hacen `revalidatePath`.
- [x] Completada

### T5 — Navegación de la lista: pestañas, filtros, paginación e invitación

- Archivos: `modules/users/components/UsersTabs.tsx` (crear, servidor; `<nav aria-label>` con `Link` y contador), `modules/users/components/UsersFilters.tsx` (crear, servidor; `<form method="get">` con labels reales, `<select>` nativos, "Aplicar" y "Limpiar filtros"; campos ocultos para conservar `porPagina`), `modules/users/components/UsersPagination.tsx` (crear, servidor; texto "Mostrando X–Y de N usuarios", `Link`s con `aria-current="page"`, opciones 10/25/50), `modules/users/components/InviteUserDialog.tsx` (crear, cliente; `Dialog` + `useActionState(inviteUserAction)`; tarjetas de rol con `radio-group`), `modules/users/components/InviteUserForm.tsx` (eliminar)
- Antes de escribir: `npx shadcn@latest add dialog switch table` (genera `components/ui/dialog.tsx`, `switch.tsx`, `table.tsx`, fuera del límite de 5 archivos por ser generados).
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-14, AC-19
- Tests: no aplica (componentes de presentación; la lógica de URLs y rangos ya se prueba en T2, SETUP.md 3.2).
- [x] Completada

### T6 — Tabla, edición, eliminación, lote y página

- Archivos: `modules/users/components/UsersTable.tsx` (crear, cliente; filas, casillas, selección de la página, badges de rol/estado y avatar con iniciales definidos aquí, acciones por fila con `aria-label`, fila "Cuenta raíz"), `modules/users/components/BulkActionsBar.tsx` (crear, cliente; Cambiar rol / Suspender / Eliminar, usa `bulkUsersAction`, muestra el resultado parcial), `modules/users/components/EditUserSheet.tsx` (crear, cliente; `Sheet` con `updateUserAction`, `Switch`, Zona de peligro), `modules/users/components/DeleteUserDialog.tsx` (crear, cliente; `Dialog` con confirmación escrita, reutilizado por fila, panel de edición y lote vía prop `confirmText`), `app/(panel)/super-admin/usuarios/page.tsx` (modificar: `searchParams` como `Promise`, `parseUserListParams`, `Promise.all([listUsers, countUsersByTab])`, composición; sin lógica propia)
- Depende de: T4, T5
- Grupo paralelo: G4
- Cubre: AC-13, AC-15, AC-16, AC-17, AC-18, AC-20
- Tests: no aplica a componentes y página de composición (SETUP.md 3.2). Si `DeleteUserDialog` incorpora lógica de habilitado más allá de `value === confirmText`, extraerla a una util pura con su test. Verificación manual a 375 px de ancho y con teclado (foco en diálogo/sheet, `Esc` cierra).
- [x] Completada

## Grupos paralelos

- G1: T1.
- G2: T2, T3 (archivos disjuntos; ambos tras T1).
- G3: T4 (tras T3), T5 (tras T2) (archivos disjuntos).
- G4: T6 (tras T4 y T5).

## Preguntas abiertas

1. **Borrado lógico vs. bloquear si hay datos.** Recomendación adoptada: borrado lógico con `deleted_at` y eliminación también en Clerk; la lista lo oculta y las compras se conservan. Bloquear la eliminación cuando hay pedidos impediría limpiar cuentas reales y no resuelve a Clerk.
2. **Organizador eliminado con eventos publicados.** Se conservan los eventos y los tickets vendidos siguen válidos, pero nadie puede gestionarlos. Recomendación: aceptarlo en esta fase y, en una fase siguiente, mostrar en el diálogo de eliminar cuántos eventos/pedidos tiene y/o suspender sus eventos.
3. **Eliminar en Clerk.** Recomendación: sí (si no, el usuario podría volver a entrar y el `getCurrentUser` lo recrearía con la fila ya eliminada). Si se prefiere no tocar Clerk, bastaría suspender; se descarta por no cumplir "eliminar".
4. **Nombre en Clerk.** Recomendación: escribir en Clerk y luego en DB con división simple primer token / resto, porque el webhook sobrescribe `full_name`. Limitación aceptada: nombres compuestos pueden repartirse distinto entre nombre y apellido en Clerk, pero `full_name` se reconstruye igual.
5. **Contadores con `q`/`registro`.** Recomendación: respetarlos para que el número de la pestaña coincida con el resultado; si se prefiere totales globales fijos, basta quitar esos dos filtros de `countUsersByTab`.
6. **Confirmación del lote de eliminar.** Recomendación: escribir `ELIMINAR` (no hay un único correo). Seleccionar y eliminar se limita a la página actual (máx. 50).
7. **"Filas por página" como enlaces** (no `<select>` con autoenvío, que requeriría JS cliente). Recomendación: enlaces `10 · 25 · 50` con `aria-current`.
8. **Fecha "este año"** se calcula en UTC. Recomendación: suficiente; zona horaria de Lima solo si se detecta desfase real.

## Fases siguientes

- Fase 2: historial/auditoría de cambios (quién cambió qué rol/estado/nombre y cuándo).
- Fase 3: exportar CSV; selección de resultados entre páginas; resumen de datos asociados (eventos/pedidos) en el diálogo de eliminar.
