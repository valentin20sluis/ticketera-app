# Autoservicio: de customer a organizer

Estado: done

## Objetivo

Que un usuario con rol `customer` pueda convertirse en `organizer` por sí mismo, con un botón y una confirmación breve, sin aprobación (diseño aprobado: `docs/superpowers/specs/2026-09-30-ticketing-system-design.md`, "Roles y permisos" y "Autenticación"). `admin` y `super_admin` siguen asignándose solo a mano desde `/super-admin/usuarios`.

Hallazgos verificados en el código (condicionan las decisiones):

- Fuente de verdad del rol: columna `users.role`. `publicMetadata.role` de Clerk solo se lee al crear la fila (`resolveInitialRole` en `permissions.ts`, usado por `upsertClerkUser`). El `onConflictDoUpdate` de `upsertClerkUser` no incluye `role` (ya cubierto por `user-sync.service.test.ts`, "keeps the stored role"). **Decisión: no se sincroniza el rol a Clerk**; la DB es la única fuente. Un `user.updated` posterior no revierte el rol.
- `requireRole` y `getCurrentUser` leen la DB en cada request, así que `/organizador` ve el rol nuevo en la siguiente navegación sin tocar la sesión de Clerk.
- `SiteNavbar` (server) calcula `role` por request y lo pasa a `AuthNavSection` (client). Hoy el ítem "Vender entradas" lleva a `/organizador` a cualquier usuario con sesión, y para un `customer` `requireRole` lo expulsa a `/`. Esta spec corrige ese callejón sin salida.
- Patrón existente: action (`"use server"`) + service con `db` inyectada + `UserActionError` con mensaje seguro (`user-admin.actions.ts`, `user-account.service.ts`).
- `canManageUser` solo modela "super_admin gestiona a otros"; no sirve para autoservicio. No se modifica `permissions.ts`.
- `components/ui/dialog.tsx` existe; no hay `AlertDialog`. No se agrega ningún componente shadcn.
- Next 16 (`node_modules/next/dist/docs/01-app/03-api-reference/04-functions/`): en una Server Action, `redirect` hace navegación cliente y debe llamarse **fuera** de `try/catch` (lanza `NEXT_REDIRECT`); `revalidatePath(path, 'layout')` invalida el layout y todo lo anidado.

## Alcance

- Incluye:
  - Service `becomeOrganizer(db, actor)`: update condicional atómico `customer -> organizer`, idempotente si ya es organizer.
  - Server Action `becomeOrganizerAction()`: actor siempre desde `getCurrentUser()`, revalida el layout raíz y redirige a `/organizador`.
  - Diálogo de confirmación (reutilizando `Dialog` de shadcn, mismo patrón que `DeleteUserDialog`).
  - CTA "Quiero vender entradas" en el menú de cuenta (desktop y mobile) solo para `customer`.
  - Visibilidad por rol (ver abajo).
- No incluye:
  - Onboarding de Stripe / banner "Conectar con Stripe" (tarea 01, PR #10 sin mergear; no existe en `main`). Esta spec solo lleva a `/organizador`. Nota: cuando se mergee ese PR, el banner aparecerá ahí sin cambios en esta feature.
  - Aprobación manual, términos y condiciones de organizador (ver preguntas abiertas).
  - Volver de organizer a customer (solo el super_admin, desde Usuarios, como hoy).
  - Sincronizar el rol a Clerk, rate limiting, auditoría.
  - CTA en `/mis-entradas` (ver preguntas abiertas).
  - Cambiar el botón "Vender entradas" del visitante sin sesión (sigue yendo a `/organizador`, el proxy lo manda a iniciar sesión).

Visibilidad en el menú de cuenta (el `role` ya lo decide el servidor en `SiteNavbar`):

| Estado | Ítem del menú |
|---|---|
| Visitante sin sesión | Sin cambios ("Iniciar sesión" + "Vender entradas") |
| `customer` | "Quiero vender entradas" (abre el diálogo). No se muestra el enlace a `/organizador`. |
| `organizer`, `admin`, `super_admin` | Sin cambios: enlace "Vender entradas" a `/organizador` |
| Con sesión y `role = null` (suspendido o fallo de DB en el navbar) | Sin cambios (enlace a `/organizador`); no se muestra el CTA |

## Reutilizar

- `getCurrentUser`, tipo `CurrentUser` (`modules/users/services/current-user.service.ts`).
- `UserActionError` (`modules/users/services/user-account.service.ts`) para mensajes seguros.
- `getDb` (`lib/db/client.ts`), tabla `users` (`lib/db/schema.ts`: `role`, `isSuspended`, `deletedAt`).
- `upsertClerkUser` (solo en tests, para probar que un re-sync no revierte el rol).
- `components/ui/dialog.tsx`, `button.tsx`; patrón de `modules/users/components/DeleteUserDialog.tsx` (el padre monta/desmonta, `useTransition`, error en `aria-live`).
- `createTestDb` (`lib/db/test-helpers.ts`, PGlite) y estilo de `user-account.service.test.ts` / `user-admin.actions.test.ts`.
- `ROLE_LABELS` ya existe; no se tocan constantes.

## Archivos

Todos existen en `main` o son nuevos bajo `modules/users` y `modules/auth`.

Nuevos:
- `modules/users/services/become-organizer.service.ts`
- `modules/users/services/become-organizer.service.test.ts`
- `modules/users/actions/become-organizer.actions.ts`
- `modules/users/actions/become-organizer.actions.test.ts`
- `modules/users/components/BecomeOrganizerDialog.tsx`
- `modules/auth/components/AuthNavSection.test.tsx`

Modificados:
- `modules/auth/components/AuthNavSection.tsx`

Contratos:

```ts
// become-organizer.service.ts
export type BecomeOrganizerResult = "upgraded" | "already_organizer";
export function becomeOrganizer(db: Db, actor: CurrentUser): Promise<BecomeOrganizerResult>;
// lanza UserActionError (mensaje seguro) si no se permite

// become-organizer.actions.ts ("use server")
export interface BecomeOrganizerState { error: string }
// En éxito no retorna: hace redirect("/organizador"). Solo retorna en error.
export function becomeOrganizerAction(): Promise<BecomeOrganizerState>;
```

Lógica del service (el actor es solo una pista; la decisión se toma contra la DB):

1. `UPDATE users SET role='organizer', updated_at=now() WHERE id = actor.id AND role = 'customer' AND is_suspended = false AND deleted_at IS NULL RETURNING id`. Si devuelve fila: `"upgraded"`.
2. Si no devolvió fila, `SELECT` la fila por `id`: no existe o `deleted_at` no nulo -> `UserActionError("No se pudo completar la acción")`; `is_suspended` -> `UserActionError("Tu cuenta está suspendida")`; `role = 'organizer'` -> `"already_organizer"` (cubre doble clic, dos pestañas y reintento); `admin`/`super_admin` -> `UserActionError("Tu cuenta ya tiene acceso al panel")` sin escribir nada.
3. Nunca escribe sobre `admin`/`super_admin` (el `WHERE role='customer'` lo garantiza a nivel SQL).

Lógica de la action:

1. `getCurrentUser()`; si es `null` -> `redirect("/ingresar")` (sesión expirada).
2. `try { await becomeOrganizer(await getDb(), user) } catch (e) { return { error: e instanceof UserActionError ? e.message : "No se pudo completar la acción" } }` (sin detalles internos; `getCurrentUser` también dentro del `try` para que un fallo de Clerk/DB devuelva el mensaje genérico, salvo el caso `null`).
3. Fuera del `try`: `revalidatePath("/", "layout")` y `redirect("/organizador")`.

## Criterios de aceptación

- AC1: `becomeOrganizer` con un customer activo cambia `role` a `organizer`, actualiza `updated_at` y devuelve `"upgraded"`.
- AC2: `becomeOrganizer` con un organizer devuelve `"already_organizer"`, sin error y sin cambiar la fila.
- AC3: `becomeOrganizer` con `admin` o `super_admin` lanza `UserActionError("Tu cuenta ya tiene acceso al panel")` y el rol queda intacto (no hay degradación).
- AC4: `becomeOrganizer` con un customer suspendido lanza `UserActionError` y el rol sigue `customer`; con un customer con `deleted_at` lanza `UserActionError` y el rol sigue `customer`.
- AC5: Dos llamadas concurrentes (`Promise.all`) sobre el mismo customer terminan sin error: una devuelve `"upgraded"` y la otra `"already_organizer"`; el rol final es `organizer`.
- AC6: Un actor obsoleto (objeto `CurrentUser` con `role: "customer"` pero fila ya promovida a `admin` en DB) no se degrada ni se promueve: el resultado se decide por el `WHERE` y por el `SELECT` posterior, no por `actor.role`.
- AC7: Después de `becomeOrganizer`, `upsertClerkUser` con el mismo `clerkUserId` (y `publicRole` ausente o `"customer"`) mantiene `role = 'organizer'`.
- AC8: `becomeOrganizerAction` sin sesión (`getCurrentUser` -> `null`) redirige a `/ingresar` y no llama al service.
- AC9: En éxito (`upgraded` o `already_organizer`) la action llama `revalidatePath("/", "layout")` y `redirect("/organizador")`; el redirect ocurre fuera del `try/catch` (el `NEXT_REDIRECT` no se captura como error).
- AC10: Si el service lanza `UserActionError`, la action devuelve `{ error: <mensaje> }` y no redirige; si lanza un error cualquiera (p. ej. fallo de DB/Clerk) devuelve `{ error: "No se pudo completar la acción" }` sin filtrar el mensaje original.
- AC11: La action no acepta parámetros: el actor sale únicamente de la sesión del servidor (no existe forma de pasar un `userId`).
- AC12: `AuthNavSection` (variante mobile, sin dropdown) con sesión: `role="customer"` muestra "Quiero vender entradas" y no muestra el enlace a `/organizador`; `organizer`, `admin`, `super_admin` y `null` muestran el enlace "Vender entradas" a `/organizador` y no el CTA. Sin sesión se mantiene el comportamiento actual.
- AC13: La variante desktop aplica la misma regla (verificación manual del reviewer en el navegador; el dropdown no se testea).
- AC14: Al pulsar el CTA se abre un diálogo con título, texto que explica "tu cuenta pasará a organizador, podrás crear eventos y seguirás pudiendo comprar entradas, sin aprobación", y botones "Cancelar" y "Sí, quiero vender entradas". Mientras la action corre, el botón de confirmar queda deshabilitado y con texto de progreso (evita doble envío). Un error se muestra en una región `aria-live="polite"` y el diálogo sigue abierto.
- AC15: Flujo manual de extremo a extremo con un customer real: confirmar -> aterriza en `/organizador` (ya no lo expulsa `requireRole`), el badge del navbar dice "Organizador", el menú muestra el enlace en lugar del CTA, y `/super-admin/usuarios` lo lista como Organizador.
- AC16: `npm run lint`, `npm run build` y `npx vitest run` pasan.

## Tests requeridos

(Vitest, junto al archivo; services con `createTestDb`)

- `become-organizer.service.test.ts`: AC1 a AC7. Sin mocks de Clerk (el service no debe importar `@clerk/nextjs/server`; `upsertClerkUser` tampoco lo hace).
- `become-organizer.actions.test.ts`: AC8 a AC11. Mockear `next/cache`, `next/navigation` (`redirect` lanza un error centinela para comprobar que se invoca fuera del `try`), `current-user.service` y `become-organizer.service`. Seguir el estilo de `user-admin.actions.test.ts`.
- `AuthNavSection.test.tsx`: AC12 (variante mobile). Mockear `useAuthSession` y `next/link` si hace falta.
- `BecomeOrganizerDialog.tsx`: componente con poca lógica (pending + error); sin test propio, se cubre en AC14/AC15 por revisión manual.

## Tareas

### T1 — Service become-organizer
- Archivos: `modules/users/services/become-organizer.service.ts`, `modules/users/services/become-organizer.service.test.ts`
- Depende de: —
- Paralelizable: sí (grupo A, arranca primero)
- Cubre: AC1, AC2, AC3, AC4, AC5, AC6, AC7

### T2 — Server Action become-organizer
- Archivos: `modules/users/actions/become-organizer.actions.ts`, `modules/users/actions/become-organizer.actions.test.ts`
- Depende de: T1 (importa el service; los tests lo mockean)
- Paralelizable: sí con T3 (grupo B)
- Cubre: AC8, AC9, AC10, AC11

### T3 — Diálogo de confirmación
- Archivos: `modules/users/components/BecomeOrganizerDialog.tsx`
- Depende de: T1. Importa `becomeOrganizerAction` y `BecomeOrganizerState` con el contrato fijado arriba, así que puede escribirse en paralelo con T2; el typecheck/build final requiere ambas.
- Paralelizable: sí con T2 (grupo B)
- Cubre: AC14

Props: `{ onClose: () => void }`. Patrón `DeleteUserDialog`: `<Dialog open onOpenChange={(o) => !o && onClose()}>`; el cuerpo usa `useTransition`, llama `becomeOrganizerAction()` y, si retorna, muestra `error`. En éxito la action redirige y la navegación desmonta el diálogo.

### T4 — CTA en el menú de cuenta
- Archivos: `modules/auth/components/AuthNavSection.tsx`, `modules/auth/components/AuthNavSection.test.tsx`
- Depende de: T3
- Paralelizable: no (grupo C)
- Cubre: AC12, AC13, AC15

Detalle: estado `confirmOpen` en `AuthNavSection`; el ítem (`DropdownMenuItem` en desktop, `Button` en mobile) para `role === "customer"` hace `setConfirmOpen(true)`; `{confirmOpen && <BecomeOrganizerDialog onClose={() => setConfirmOpen(false)} />}` se renderiza fuera del `DropdownMenuContent` para que no se desmonte al cerrarse el menú. Para el resto de roles se conserva el enlace actual. `SiteNavbar` no cambia (ya pasa `role`).

Orden de ejecución: T1 -> (T2 || T3) -> T4. Cuatro tareas, sin T0 (no hay dependencias nuevas, ni componentes shadcn, ni cambios en `package.json`, `layout.tsx` o `globals.css`).

## Casos límite

- Doble clic / dos pestañas: el botón se deshabilita mientras corre (AC14); en servidor el update atómico + el `SELECT` posterior devuelven `already_organizer` para la segunda llamada (AC5), y ambas terminan en `/organizador`.
- Ya organizer (p. ej. cambió desde otra pestaña o lo promovió el super_admin): éxito idempotente (AC2). Si la pestaña tenía el menú viejo, el CTA sigue visible hasta la próxima navegación; el clic es inofensivo.
- Suspendido: el navbar pasa `role = null` (no ve el CTA), y si llama la action igualmente se rechaza (AC4). Eliminado: rechazo (AC4); además su cuenta de Clerk ya no existe.
- admin / super_admin: sin CTA; si invocan la action, error sin escritura (AC3).
- Sesión expirada: redirect a `/ingresar` (AC8).
- Fallo de Clerk/DB: mensaje genérico (AC10). No hay llamada a Clerk en el service; el fallo posible viene de `getCurrentUser` (fallback `getUser`) o de la DB.
- Un super_admin que degrada a alguien a customer desde Usuarios: puede volver a autopromoverse (se asume aceptable; ver pregunta 3).
- Visitante que pulsa "Vender entradas" en el navbar: sin cambios; tras iniciar sesión como customer cae en `/organizador` y `requireRole` lo manda a `/`. Fuera de alcance, pero ver pregunta 2.

## Preguntas abiertas

1. Términos de organizador: ¿hace falta aceptar condiciones antes de pasar a organizer (checkbox en el diálogo, guardar fecha de aceptación)? Default propuesto: no; el diálogo solo informa, sin persistir aceptación (cambiarlo agrega columna + migración y rompe el "solo actualiza `role`" del diseño).
2. Ubicación del CTA: ¿solo menú de cuenta, o también en `/mis-entradas` (banner/tarjeta)? Default propuesto: solo menú de cuenta (YAGNI; un único punto de entrada, ya visible en desktop y mobile). Si se quiere en `/mis-entradas` es una tarea extra (modifica `app/(public)/mis-entradas/page.tsx` o `MyTicketsView.tsx`).
3. Reversibilidad: confirmo que no hay camino de vuelta para el usuario; solo el super_admin lo baja a customer. Default propuesto: sí, sin camino de vuelta, y sin bloqueo anti-reintento tras una degradación manual.
4. Tras un organizer promovido por error de un tercero, o un customer que ya tiene sesión abierta: ¿basta con "siguiente navegación" para reflejar el rol? Default propuesto: sí (el rol se lee de la DB en cada request y el action revalida el layout raíz); no se fuerza refresco de la sesión de Clerk.
5. Visitante sin sesión que pulsa "Vender entradas": hoy, tras iniciar sesión como customer, acaba en `/` por `requireRole`. Default propuesto: dejarlo igual en esta fase (fuera de alcance); mejora posible: llevar a `/mis-entradas` o abrir el diálogo.
6. Copia del diálogo (títulos y textos en español) la redacta el developer según AC14; ¿alguna redacción obligatoria? Default propuesto: la de AC14.

## Próximas fases

- Conexión con Stripe tras convertirse en organizer (tarea 01, PR #10): el banner aparecerá en `/organizador` al mergear ese PR; esta feature no depende de él.
- CTA adicional en `/mis-entradas` y en el flujo del visitante sin sesión (preguntas 2 y 5).
- Aceptación de términos de organizador, si se decide que hacen falta (pregunta 1).
