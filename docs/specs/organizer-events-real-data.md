# Organizer Events Real Data

Estado: approved

## Objetivo

`/organizador` ("Mis eventos", `app/(panel)/organizador/page.tsx`) hoy muestra un catálogo falso: `CURRENT_ORGANIZER` +
`SEED_ORGANIZER_CATALOG` + `OrganizerDashboardView`, que lee `localStorage`. Esta spec la conecta a la DB: tarjetas
con entradas vendidas, ingresos (PEN) y eventos publicados, y el listado de **todos** los eventos del organizador
(borrador, publicado, cancelado, suspendido) con su estado. Además crea **una sola pieza reutilizable de servidor**
que centraliza "qué eventos puede ver quien mira", para no repetir la autorización en cada listado.

## Decisiones de diseño (revisar antes de aprobar)

1. **D1 — Pieza reutilizable = función de servidor, sin hook de cliente.** Los hooks de React no pueden usarse en Server
   Components (`node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`) y todas las vistas
   que hoy necesitan este listado (`/organizador`, `/organizador/resumen`) son Server Components que ya leen la DB. Un
   `useEventList` exigiría una ruta de API protegida + `QueryClientProvider` (hoy inexistente) sin que ninguna vista de
   cliente lo pida: YAGNI. "Reutilizable" se cumple con `listEventsForViewer(db, viewer, options)`: un único punto que
   decide el alcance por rol y que cualquier página, Server Action o futura ruta de API puede llamar. Si más adelante
   aparece una vista de cliente, se agrega `GET /api/events` que llama a la misma función y entonces el hook (Fase siguiente).
2. **D2 — El alcance lo decide el servidor, nunca el cliente.** `viewer` sale de `getCurrentUser()`; el listado no acepta
   `organizerId` como dato confiable: para un organizador se ignora y se fuerza `viewer.id`; solo para `admin`/`super_admin`
   es un filtro opcional validado con zod.
3. **D3 — Suspendido/eliminado degrada a público** (solo `published`), no a vacío ni a error: es lo mismo que vería un anónimo.
4. **D4 — `/organizador` y `/organizador/resumen` siguen siendo dos vistas.** Resumen = ranking de **publicados** por ventas
   (sin cambios de comportamiento); Mis eventos = **gestión** de todos los estados. Ambas leen `getOrganizerSummary`, así
   que no hay consultas duplicadas, y no se toca `nav-config.ts`. Absorber una en la otra obligaría a quitar un ítem del
   menú y a redirigir; se deja como posible Fase 2.
5. **D5 — `getOrganizerSummary` recibe el `viewer` (no un `organizerId`)** para que la autorización viva dentro del servicio
   y no dependa de que cada página recuerde llamar `requireRole`.
6. **D6 — Catálogo local y botón "Crear evento": se mantiene el asistente intacto y se muestra un aviso** (ver "Riesgo crítico").

## Riesgo crítico: el asistente "Crear evento" no escribe en la DB

`CreateEventWizard` (`modules/organizer/components/CreateEventWizard.tsx`) guarda con `useOrganizerCatalog` en `localStorage`
(`organizer-catalog-storage.ts`), usando `CURRENT_ORGANIZER.id` (mock). Cuando `/organizador` lea de la DB, **un evento
creado con el asistente dejará de aparecer en "Mis eventos"**. Tratamiento en esta spec:

- No se cambia el asistente (fuera de alcance): persistirlo en DB requiere crear sede, zonas, evento y función en
  transacción, validar propiedad de la sede y subir imagen; es una spec propia (Fase 2).
- El botón "Crear evento" **se conserva** y `/organizador` muestra un aviso visible (T4) indicando que el asistente aún
  guarda solo en este navegador y que esos eventos no aparecen en la lista hasta que se conecte a la base de datos.
- No se mantiene la vista local como respaldo: mezclaría dos fuentes de verdad en una misma lista.

## Fuera de alcance

- **Stripe Connect** y la página `/organizador/pagos`.
- **Cambiar o persistir el asistente de creación** (`CreateEventWizard`, `useCreateEventForm`, `create-event.schema.ts`,
  `/organizador/eventos/nuevo`): sigue en `localStorage`.
- **Catálogo público** (`/`, `/eventos`, `/eventos/[slug]`, `event.service.ts`, `MOCK_EVENTS`): sigue en mocks. No se
  migra aquí aunque `listEventsForViewer` ya cubra el alcance "público" (necesita `featured`, `priceFrom`, disponibilidad;
  ver `stripe-real-data.md` Fase 2).
- `/super-admin/organizadores` (hoy `PanelComingSoon`): no se conecta; podrá usar `listEventsForViewer` con `organizerId`.
- Hook de cliente / ruta de API / `QueryClientProvider` (ver D1).
- Exportaciones (CSV/PDF), paginación y filtros de UI en `/organizador` (la función admite `limit`, la página usa el default).
- Cambios de schema o migraciones.

## Reutilización

- Existente que se reutiliza:
  - `modules/users/services/current-user.service.ts` (`getCurrentUser`, `requireRole`, tipo `CurrentUser`): sesión y guardia de las páginas.
  - `modules/users/types/user.types.ts` (`UserRole`): roles del viewer.
  - `modules/organizer/components/OrganizerSummaryStats.tsx`: tarjetas (sin cambios).
  - `lib/format-currency.ts` (`formatPrice`, "S/"), `modules/events/utils/format-event-date.ts`, `components/ui/{table,badge,button}.tsx`.
  - `lib/db/schema.ts` (`events`, `event_functions`, `function_zones`, `order_items`, `orders`, `users`) sin cambios; `lib/db/test-helpers.ts` (`createTestDb`) y `lib/db/seed/event-catalog.ts` (`seedEventCatalog`) para tests.
  - Los patrones de zod v4 + `parse...` de `modules/users/schemas/user-list-params.schema.ts`.
- Existente que se extiende:
  - `modules/organizer/services/get-organizer-summary.service.ts`: firma `(db, viewer)`, obtiene los eventos con `listEventsForViewer` en vez de su propia consulta, `OrganizerEventSummary` gana `status`, `OrganizerSummary` gana `events` (todos los estados). Se conservan `publishedEvents`, `publishedEventsCount`, totales y la regla "solo `orders.status = 'paid'`".
  - `modules/organizer/components/OrganizerEventsTable.tsx`: el badge deja de ser fijo "Publicado" y pasa a reflejar `event.status`; nueva prop opcional `emptyState`.
  - `app/(panel)/organizador/resumen/page.tsx`: solo adapta la llamada a la nueva firma.
- Nuevo (y por qué no sirve nada existente):
  - `modules/events/services/list-events-for-viewer.service.ts`: no existe ningún lugar que decida alcance por rol; `event.service.ts` filtra arrays mock y `get-organizer-summary` solo filtra por `organizerId` recibido.
  - `modules/events/schemas/event-list-options.schema.ts`: no hay validación de opciones de listado.
- Se elimina (verificado con grep: solo los importa `app/(panel)/organizador/page.tsx` o ellos mismos):
  - `modules/organizer/components/OrganizerDashboardView.tsx`, `modules/organizer/components/OrganizerEventCard.tsx`.
  - `modules/organizer/utils/get-organizer-event-summaries.ts` + `.test.ts` (solo los usa `OrganizerDashboardView`).
  - Tipo `OrganizerEventSummary` (y su uso de `EventStatus`) en `modules/organizer/types/organizer.types.ts`: lo usaban la tarjeta y la util; evita dos tipos con el mismo nombre. `EventStatus` se conserva porque lo usa `OrganizerEvent`.
- Se **conserva** (lo usa el asistente `CreateEventWizard` / `/organizador/eventos/nuevo`): `modules/organizer/data/current-organizer.mock.ts`, `modules/organizer/data/organizer-catalog.mock.ts` (`SEED_ORGANIZER_CATALOG`), `modules/organizer/hooks/useOrganizerCatalog.ts`, `modules/organizer/utils/organizer-catalog-storage.ts` (+ test), `build-organizer-event-entry.ts`. Se eliminarán cuando el asistente se persista en DB (Fase 2).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. Precondición operativa: DB migrada y sembrada con `npm run db:seed -- <email-organizador>` para ver datos.

## Matriz rol -> alcance (contrato de `listEventsForViewer`)

`viewer` = `Pick<CurrentUser, "id" | "role" | "isSuspended" | "deletedAt"> | null`.

| Viewer | Alcance | Estados visibles | `options.organizerId` |
|---|---|---|---|
| `null` (sin sesión) | `public` | solo `published` | ignorado |
| `customer` | `public` | solo `published` | ignorado |
| cualquier rol con `isSuspended = true` o `deletedAt != null` | `public` | solo `published` | ignorado |
| `organizer` | `own` (`events.organizer_id = viewer.id`) | todos | ignorado (se fuerza `viewer.id`) |
| `admin` | `all` | todos | filtro opcional (uuid válido) |
| `super_admin` | `all` | todos | filtro opcional (uuid válido) |

`options.status` (lista blanca `draft|published|cancelled|suspended`) solo restringe dentro del alcance; en `public` se ignora (siempre `published`).
Salida por evento (lista cerrada): `id`, `title`, `slug`, `imageUrl`, `status`, `startDate` (ISO de la función más temprana, `null` si no tiene). Nunca `organizerId`, `clerkUserId`, correos, `stripe_*` ni datos de pedidos. Orden: `created_at` desc, desempate por `id`.

## Criterios de aceptación

- AC-1: `parseEventListOptions(raw)` (zod v4, `strictObject`) acepta `{ organizerId?: uuid, status?: draft|published|cancelled|suspended, limit?: entero 1–100 (default 100) }`; rechaza (lanza `ZodError`) uuid inválido, `status` fuera de la lista blanca, `limit` 0, 101 o no entero, y claves desconocidas.
- AC-2: `resolveEventScope(viewer)` devuelve `{ kind: "public" }` para `null`, `customer` y cualquier usuario suspendido o con `deletedAt`; `{ kind: "own", organizerId: viewer.id }` para `organizer`; `{ kind: "all" }` para `admin` y `super_admin`. Es una función pura.
- AC-3: `listEventsForViewer` en alcance `public` devuelve solo eventos `published` de todos los organizadores, sin importar `options.organizerId` ni `options.status`.
- AC-4: En alcance `own` devuelve todos los estados de ese organizador y ninguno de otro, aunque `options.organizerId` apunte a otro usuario.
- AC-5: En alcance `all` devuelve eventos de todos los organizadores y todos los estados; `options.organizerId` filtra a ese organizador; `options.status` filtra por estado.
- AC-6: Cada fila contiene exactamente las claves `id`, `title`, `slug`, `imageUrl`, `status`, `startDate` (verificable con `Object.keys`); `startDate` es la función más temprana en ISO o `null`.
- AC-7: `getOrganizerSummary(db, viewer)` con un viewer en alcance `public` (anónimo, customer, suspendido, eliminado) devuelve el resumen vacío (ceros y listas vacías) sin consultar ventas; con `organizer` devuelve solo sus datos; con `admin`/`super_admin` devuelve los **propios** (`organizerId: viewer.id`), nunca los de todos.
- AC-8: `getOrganizerSummary` mantiene la regla vigente: `totalTicketsSold`/`totalRevenue` suman solo pedidos `paid` de todos los eventos propios en cualquier estado; `publishedEvents` solo `published` ordenado por entradas vendidas desc (desempate ingresos); `publishedEventsCount` = su longitud; nuevo `events` contiene todos los estados con `status`, `ticketsSold` y `revenue`, ordenado por `created_at` desc.
- AC-9: `/organizador` no importa `CURRENT_ORGANIZER`, `SEED_ORGANIZER_CATALOG` ni `OrganizerDashboardView`; es Server Component, exige `requireRole(["organizer", "admin", "super_admin"])`, llama a `getOrganizerSummary(db, user)` y renderiza `OrganizerSummaryStats` (entradas vendidas, ingresos "S/", eventos publicados) y `OrganizerEventsTable` con `summary.events`.
- AC-10: `OrganizerEventsTable` muestra un badge con **texto** por estado (Borrador, Publicado, Cancelado, Suspendido; el punto de color es decorativo, `aria-hidden`). Con lista vacía renderiza el `emptyState` recibido o, por defecto, el mensaje actual.
- AC-11: Sin eventos, `/organizador` muestra "Todavía no tienes eventos" con un enlace "Crear evento" a `/organizador/eventos/nuevo`; las tarjetas muestran 0 / S/ 0 / 0.
- AC-12: `/organizador` conserva el botón "Crear evento" y muestra un aviso visible de que el asistente aún guarda en este navegador y esos eventos no aparecen en la lista.
- AC-13: `/organizador/resumen` sigue mostrando solo publicados con la misma información que hoy (tests existentes de `get-organizer-summary` adaptados a la nueva firma siguen pasando).
- AC-14: Tras la limpieza, `grep -rn "OrganizerDashboardView\|OrganizerEventCard\|get-organizer-event-summaries" --include=*.ts --include=*.tsx .` solo devuelve resultados en `docs/`; `CreateEventWizard` y `/organizador/eventos/nuevo` siguen compilando sin cambios.
- AC-15: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tareas

### T1 — Alcance por rol: opciones validadas y `listEventsForViewer`

- Archivos: `modules/events/schemas/event-list-options.schema.ts` (crear: `parseEventListOptions`, tipos `EventListOptions`, `EVENT_STATUSES`), `modules/events/schemas/event-list-options.schema.test.ts` (crear), `modules/events/services/list-events-for-viewer.service.ts` (crear: `resolveEventScope`, `listEventsForViewer`, tipos `EventViewer`, `ViewerEvent`), `modules/events/services/list-events-for-viewer.service.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6
- Tests: schema — casos válidos e inválidos de AC-1 (uuid, status, limit 0/101/1.5, clave extra, defaults). Servicio con `createTestDb` (PGlite), dos organizadores con eventos en los 4 estados y una función con fecha en alguno; **una prueba por celda de la matriz**: `null`, `customer`, `customer` suspendido, `organizer` suspendido, `organizer` con `deletedAt`, `organizer` (propios; `organizerId` ajeno ignorado), `admin` y `super_admin` (todos; filtro por `organizerId`; filtro por `status`), `admin` suspendido (público); `options.organizerId` inválido lanza; `Object.keys` de la fila == lista cerrada; evento sin función → `startDate: null`; con dos funciones → la más temprana.
- [x] Completada

### T2 — `getOrganizerSummary` con viewer y lista completa

- Archivos: `modules/organizer/services/get-organizer-summary.service.ts` (modificar), `modules/organizer/services/get-organizer-summary.service.test.ts` (modificar), `app/(panel)/organizador/resumen/page.tsx` (modificar: `getOrganizerSummary(db, user)`)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-7, AC-8, AC-13
- Tests: adaptar los casos existentes a `(db, viewer)`; agregar: viewer anónimo/customer/suspendido/eliminado → resumen vacío; `admin` y `super_admin` obtienen solo sus propios eventos (otro organizador con ventas `paid` no suma); `events` incluye borrador y cancelado con `status` correcto y ventas 0; un pedido `paid` de un evento en borrador cuenta en los totales y aparece en `events` pero no en `publishedEvents`; orden de `events` por `created_at` desc. La consulta de ventas se acota a los ids devueltos por `listEventsForViewer` (`inArray`), no a un `organizerId` externo.
- [x] Completada

### T3 — Tabla de eventos con estado real y estado vacío configurable

- Archivos: `modules/organizer/components/OrganizerEventsTable.tsx` (modificar: mapa de etiquetas/colores por `status`, prop opcional `emptyState?: ReactNode`)
- Depende de: T2 (consume el campo `status` del tipo `OrganizerEventSummary`)
- Grupo paralelo: G3
- Cubre: AC-10
- Tests: no aplica (componente presentacional, SETUP.md 3.2).
- [x] Completada

### T4 — Página `/organizador` con datos reales

- Archivos: `app/(panel)/organizador/page.tsx` (modificar: Server Component async; `requireRole`, `getDb`, `getOrganizerSummary`, composición de `OrganizerSummaryStats` + `OrganizerEventsTable`, `emptyState` con enlace "Crear evento", botón y aviso del asistente)
- Depende de: T2, T3
- Grupo paralelo: G4
- Cubre: AC-9, AC-11, AC-12
- Tests: no aplica (página de composición, SETUP.md 3.2). Verificación manual: organizador sin eventos, con borrador, con ventas `paid`.
- [x] Completada

### T5 — Eliminar el dashboard local huérfano

- Archivos: `modules/organizer/components/OrganizerDashboardView.tsx` (eliminar), `modules/organizer/components/OrganizerEventCard.tsx` (eliminar), `modules/organizer/utils/get-organizer-event-summaries.ts` (eliminar), `modules/organizer/utils/get-organizer-event-summaries.test.ts` (eliminar), `modules/organizer/types/organizer.types.ts` (modificar: quitar `OrganizerEventSummary`)
- Depende de: T4 (antes de borrar, el developer re-ejecuta el grep de AC-14)
- Grupo paralelo: G5
- Cubre: AC-14, AC-15
- Tests: no aplica (eliminación; el test de la util se borra con ella).
- [x] Completada

## Grupos paralelos

- G1: T1.
- G2: T2 (tras T1).
- G3: T3 (tras T2; modifica un archivo que consume el tipo que cambia T2).
- G4: T4 (tras T2 y T3).
- G5: T5 (tras T4).

Es una cadena casi lineal porque cada tarea consume el contrato de la anterior; no hay pares de tareas con archivos compartidos.

## Preguntas abiertas

1. **¿Hook de cliente?** Recomendación: no (D1). Se justifica porque no existe vista de cliente que lo necesite, `@tanstack/react-query` no está cableado y un hook exigiría una ruta de API más. Si se quiere igualmente, se agrega en una fase aparte: `GET /api/events` (valida sesión con `getCurrentUser`, llama a `listEventsForViewer`) + `useEventList`.
2. **Eventos creados con el asistente.** Recomendación (D6): conservar el asistente y mostrar el aviso de T4; spec nueva para persistirlo en DB (sede, zonas, evento, función, imagen). Alternativa descartada: mostrar además un bloque "Borradores locales" (mezcla fuentes).
3. **`/organizador` vs `/organizador/resumen`.** Recomendación (D4): dos vistas con propósitos distintos y una sola consulta compartida. Si se prefiere una sola, Fase 2: `/organizador/resumen` redirige a `/organizador` y se quita el ítem del menú.
4. **`admin`/`super_admin` en `/organizador`.** Recomendación: ven solo sus propios eventos (es "Mis eventos"); la vista global de todos queda para `/super-admin/organizadores` con el filtro `organizerId` de la función.
5. **Usuario suspendido/eliminado: público vs. vacío.** Recomendación (D3): alcance público; en la práctica `requireRole` ya lo redirige desde las páginas y la función es la segunda barrera.
6. **Moneda.** Recomendación: se mantiene `formatPrice` ("S/") y la suma de pedidos `paid`; todas las órdenes actuales son PEN. Si apareciera otra moneda, los totales deberían separarse por `currency` (fase aparte).
7. **Alcance público sin consumidor hoy.** `listEventsForViewer` cubre `public` aunque ninguna página lo use aún (lo exige la matriz solicitada y es el punto de entrada del catálogo real). Recomendación: mantenerlo, es pocas líneas y queda testeado.

## Fases siguientes

- Fase 2: persistir `CreateEventWizard` en la DB (server action con transacción) y eliminar `localStorage`, `CURRENT_ORGANIZER`, `SEED_ORGANIZER_CATALOG`, `useOrganizerCatalog` y `organizer-catalog-storage`.
- Fase 3: catálogo público (`/eventos`) y `/super-admin/organizadores` sobre `listEventsForViewer`; `GET /api/events` + `useEventList` solo si surge una vista de cliente.
