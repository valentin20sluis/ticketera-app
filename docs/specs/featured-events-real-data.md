# Featured Events and Public Catalog with Real Data

Estado: done

## Objetivo

La landing (`app/(public)/page.tsx`) y `/eventos` (`app/(public)/eventos/page.tsx`) leen `MOCK_EVENTS`/`MOCK_CATEGORIES`. Esta spec:

1. Las conecta a la DB (eventos `published` con venue, fecha, precio mínimo y disponibilidad reales).
2. Permite a `admin`/`super_admin` **destacar** eventos publicados; los destacados forman el carousel del Hero.

Es la "Fase 2/3 catálogo público" anunciada en `organizer-events-real-data.md` y `stripe-real-data.md`. No toca auth, pagos ni inventario más allá de **leer** la disponibilidad con la misma regla que `getZoneAvailability` (`modules/ticketing/services/get-zone-availability.service.ts`: reservado = `paid` + `pending` no vencida). Permisos: `modules/organizer/utils/event-permissions.ts` (`isEventAdmin`, `canWriteEvent`).

## Decisiones de diseño

- **D1 — `categoryId` público = `event_categories.icon_key`** (`music`, `sports`, ...), que el seed ya fija igual al id de `MOCK_CATEGORIES`. Así `EventCard`, `HeroCarousel`, `CategoryChips`, `EventsCatalog` y los filtros siguen funcionando sin cambios. La taxonomía visible (nombre, icono, color) sigue siendo la constante `MOCK_CATEGORIES`; la DB solo aporta la clave. Un evento con `icon_key` fuera de ese catálogo aparece en "Todos" pero no en un chip (ver pregunta 2).
- **D2 — Visible públicamente** = `status = 'published'` **y** al menos una función futura (`starts_at > now`) con al menos una zona. `startDate` = la función futura más cercana; `priceFrom` = precio mínimo de las zonas de las funciones futuras. Coincide con "próxima función" de `get-event-checkout.service.ts`.
- **D3 — `status` público**, sobre las zonas de las funciones futuras: `sold-out` si disponibles totales = 0; `last-tickets` si disponibles / capacidad total <= 20% (constante `LAST_TICKETS_RATIO`); si no, `available`.
- **D4 — Hero**: destacados (publicados, visibles según D2), orden por `startDate` asc, máximo 5. Sin destacados visibles: los 5 primeros por `startDate` entre los visibles. Sin límite duro de marcados.
- **D5 — Frescura**: las páginas públicas llaman `await connection()` (`next/server`, precedente en `app/(public)/eventos/[slug]/entradas/page.tsx`) porque la disponibilidad cambia con cada compra. Además las acciones de escritura llaman `revalidatePath("/")` y `revalidatePath("/eventos")` (API verificada en `node_modules/next/dist/docs/01-app/03-api-reference/04-functions/revalidatePath.md`).
- **D6 — Permiso de destacar**: solo `isEventAdmin` + `canWriteEvent(actor, event, "edit")` (cubre admin suspendido/eliminado). El organizador ni ve el control ni puede invocar la acción.
- **D7 — Limpieza**: cualquier transición de `status` a algo distinto de `published` pone `featured = false`. Volver a `published` (levantar suspensión) **no** lo restaura.

## Alcance

- Incluye: columna `events.featured` + migración; servicio de lectura pública; acción/servicio para destacar; toggle en el listado y en la edición (solo admin, solo `published`); landing y `/eventos` con datos reales.
- No incluye: `/eventos/[slug]` y `/eventos/[slug]/entradas` (el detalle sigue con mocks; ver pregunta 1), paginación o límite del catálogo, categorías administrables en DB, tope de destacados, orden manual del Hero, cambios al seed, `RelatedEventsSection`.

## Reutilizar

- Tipos y UI: `modules/events/types/event.types.ts` (`Event`, `EventCategory`), `HeroCarousel`, `UpcomingEventsSection`, `EventsCatalog`, `CategoryChips`, `EventCard` (sin cambios); `MOCK_CATEGORIES` solo como catálogo de categorías.
- `getZoneAvailability`: se extrae su condición de "orden que reserva" para compartirla (DRY) en vez de duplicarla.
- `lib/db/test-helpers.ts` (`createTestDb`), `lib/db/seed/event-catalog.ts` (`seedEventCatalog`) para tests.
- `EventActionError`, `loadEvent`, `run`/`EventActionState` en `event-write.service.ts` y `event.actions.ts`; `isEventAdmin`/`canWriteEvent` (sin cambios).
- `components/ui/switch.tsx` (ya instalado; no hace falta `shadcn add`).
- Lectura: `listEventsForViewer` (`ViewerEvent`) y `getOrganizerSummary` ya alimentan `OrganizerEventsTable`; solo ganan el campo `featured`.
- Nuevo (nada existente sirve): el servicio público, porque `list-events-for-viewer` no devuelve venue, precio ni disponibilidad y no filtra por función futura; `event.service.ts` solo filtra arrays en memoria.

## Archivos

- Modificar: `lib/db/schema.ts`, `lib/db/schema.test.ts`, `drizzle/meta/_journal.json`, `modules/ticketing/services/get-zone-availability.service.ts` (+ su test si cambia), `modules/organizer/services/event-write.service.ts` (+ test), `modules/organizer/actions/event.actions.ts` (+ test), `modules/events/services/list-events-for-viewer.service.ts` (+ test), `modules/organizer/services/event-read.service.ts` (+ test), `modules/organizer/components/OrganizerEventsTable.tsx`, `app/(panel)/organizador/eventos/[id]/editar/page.tsx`, `app/(public)/page.tsx`, `app/(public)/eventos/page.tsx`.
- Crear: `drizzle/0005_*.sql` y `drizzle/meta/0005_snapshot.json` (generados), `modules/events/services/list-public-events.service.ts` (+ `.test.ts`), `modules/organizer/components/FeaturedToggle.tsx`.

## Criterios de aceptación

- AC1: `events.featured` es `boolean not null default false`; existe `drizzle/0005_*.sql` generado con `npm run db:generate` que solo agrega esa columna, y los eventos existentes quedan en `false`.
- AC2: `listPublicEvents(db, now?)` devuelve solo eventos `published` con función futura y zona; excluye `draft`, `cancelled`, `suspended`, publicados sin función futura o sin zonas, y no incluye funciones pasadas en `startDate`/`priceFrom`.
- AC3: Cada elemento cumple la forma `Event`: `id`, `slug`, `title`, `description`, `imageUrl`, `doorsOpenTime`, `showStartTime`, `minimumAge`, `admissionType`, `featured` (de la columna), `venueName` y `city` del venue, `categoryId` = `icon_key` de su categoría (D1), `currency: "PEN"`, `startDate` ISO de la función futura más cercana, `priceFrom` numérico = mínimo de zonas futuras. Orden: `startDate` asc, desempate por `id`.
- AC4: `status` sigue D3: `sold-out` con disponibilidad 0 en todas las zonas futuras; `last-tickets` con disponibilidad <= 20% de la capacidad total; `available` en otro caso. Una orden `paid` y una `pending` vigente descuentan; una `pending` vencida, `expired` o `cancelled` no (misma regla que `getZoneAvailability`).
- AC5: `pickHeroEvents(events)` (pura) devuelve los `featured` ordenados por `startDate` asc, máximo 5; si no hay ninguno devuelve los primeros 5 de la lista; con lista vacía devuelve `[]`; no muta la entrada.
- AC6: `setEventFeatured(db, actor, eventId, featured)` con `admin`/`super_admin` activo sobre un evento `published` actualiza la columna (true y false). Falla con `EventActionError` para: organizador (incluso dueño), customer, `null`, admin suspendido o con `deletedAt`, evento inexistente o id no uuid, y evento no `published` al marcar `true` (desmarcar un no publicado es permitido y no hace nada nocivo).
- AC7: `setEventStatus` a `cancelled` o `suspended` deja `featured = false`; a `published` no lo cambia; el flujo y los permisos existentes de cambio de estado no varían.
- AC8: `setEventFeaturedAction({ eventId, featured })` exige `requireRole(["organizer","admin","super_admin"])`, valida con zod (`eventId` uuid, `featured` boolean estricto; claves extra o tipos incorrectos devuelven "Datos no válidos") y retorna `{ success: true }` o `{ error }` con mensajes solo de `EventActionError`. Tras cualquier acción de escritura se hace `revalidatePath` de `/organizador`, `/` y `/eventos`.
- AC9: `ViewerEvent` y `OrganizerEventSummary` incluyen `featured: boolean` (se actualiza el test de claves cerradas de `listEventsForViewer`); `getEventForEdit` devuelve `featured`.
- AC10: En `/organizador`, solo `admin`/`super_admin` ven la columna "Destacado" con un `Switch` accesible (`aria-label` con el título del evento) y solo en filas `published`; el organizador no ve la columna. El switch refleja el estado, se deshabilita mientras guarda, y ante error vuelve al valor anterior y muestra el mensaje.
- AC11: En `/organizador/eventos/[id]/editar` el mismo `FeaturedToggle` aparece solo para admin/super_admin y solo si el evento es `published`; el organizador no lo ve.
- AC12: `/` y `/eventos` no importan `MOCK_EVENTS`; `/` pasa `pickHeroEvents(events)` a `HeroCarousel` y todos los eventos a `UpcomingEventsSection`; `/eventos` pasa los eventos a `EventsCatalog`; ambas llaman `await connection()` y renderizan con DB vacía sin error (Hero no se muestra; el catálogo muestra su estado vacío existente).
- AC13: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)

- `lib/db/schema.test.ts`: `featured` default `false` al insertar un evento sin el campo (AC1).
- `list-public-events.service.test.ts` con `createTestDb` + datos propios: filtros de AC2; forma y orden de AC3 (dos funciones, una pasada: elige la futura; zonas con precios distintos); estados de AC4 por cada tipo de orden; `featured` leído de la columna; `pickHeroEvents` con 0, 3 destacados, 7 destacados (corta a 5, ordenados), sin destacados (primeros 5) y sin mutar entrada (AC5).
- `event-write.service.test.ts`: casos de AC6 y AC7 (cancelar/suspender limpia; publicar de nuevo no restaura).
- `event.actions.test.ts`: AC8 (guardia, validación, revalidatePath de las tres rutas, mensaje genérico ante error inesperado).
- `list-events-for-viewer.service.test.ts` y `event-read.service.test.ts`: `featured` presente (AC9).
- `get-zone-availability.service.test.ts`: sin regresión tras extraer la condición compartida.
- Componentes (`FeaturedToggle`, tabla, páginas): sin test (presentacionales/composición, SETUP.md 3.2); verificación manual de AC10-AC12.

## Tareas

### T0 / T1 — Columna `featured` y migración
- Archivos: `lib/db/schema.ts`, `lib/db/schema.test.ts`, `drizzle/0005_*.sql`, `drizzle/meta/0005_snapshot.json`, `drizzle/meta/_journal.json`
- Depende de: —
- Paralelizable: no (todo lo demás depende de la columna)
- Cubre: AC1
- Nota: esta tarea hace de base compartida; no hay otros cambios a `package.json`/layout/shadcn.

### T2 — Servicio de lectura pública
- Archivos: `modules/events/services/list-public-events.service.ts`, `modules/events/services/list-public-events.service.test.ts`, `modules/ticketing/services/get-zone-availability.service.ts` (extraer y exportar la condición de orden reservante; sin cambio de comportamiento)
- Depende de: T1
- Paralelizable: sí, con T3
- Cubre: AC2, AC3, AC4, AC5

### T3 — Escritura: destacar y limpiar al salir de `published`
- Archivos: `modules/organizer/services/event-write.service.ts`, `modules/organizer/services/event-write.service.test.ts`, `modules/organizer/actions/event.actions.ts`, `modules/organizer/actions/event.actions.test.ts`
- Depende de: T1
- Paralelizable: sí, con T2
- Cubre: AC6, AC7, AC8

### T4 — UI admin del toggle y lectura de `featured`
- Archivos: `modules/events/services/list-events-for-viewer.service.ts` (+ `.test.ts`), `modules/organizer/services/event-read.service.ts` (+ `.test.ts`), `modules/organizer/components/FeaturedToggle.tsx`, `modules/organizer/components/OrganizerEventsTable.tsx`, `app/(panel)/organizador/eventos/[id]/editar/page.tsx`
- Depende de: T1, T3
- Paralelizable: sí, con T5 (archivos disjuntos)
- Cubre: AC9, AC10, AC11

### T5 — Landing y `/eventos` con datos reales
- Archivos: `app/(public)/page.tsx`, `app/(public)/eventos/page.tsx`
- Depende de: T2
- Paralelizable: sí, con T4
- Cubre: AC12, AC13

Orden: T1 -> (T2 || T3) -> (T4 || T5). AC13 se verifica al final de todo.

## Preguntas abiertas

1. **Detalle con mocks (riesgo real).** `EventCard`/Hero enlazan a `/eventos/[slug]`, que sigue buscando en `MOCK_EVENTS`. Los eventos creados por organizadores/admin que no estén en los mocks darán 404 en el detalle (los sembrados desde mocks siguen funcionando, mismo slug). Recomendación: spec siguiente que migre el detalle; mientras tanto, ¿aceptable? (El checkout `/entradas` ya es real.)
2. **Categorías.** D1 mantiene las 6 categorías fijas y mapea por `icon_key`. Un evento con categoría nueva (otro `icon_key`) solo sale en "Todos". Recomendación: aceptable hasta que haya admin de categorías; ¿se prefiere excluirlo o mostrar un icono genérico?
3. **Umbral `last-tickets`.** Propongo 20% de la capacidad restante sobre el total de zonas futuras (constante). ¿Otro valor?
4. **Eventos del catálogo.** Sin paginación ni tope: se listan todos los publicados con función futura. Recomendación: suficiente hoy; paginar en una fase posterior.
5. **Seed.** El seed ignora `featured: true` de los mocks, así que al inicio no hay destacados y el Hero usa el fallback de 5 próximos. Recomendación: dejarlo así.
6. **Evento destacado cuya última función pasa.** Sigue con `featured = true` pero deja de verse (D2); no se limpia automáticamente. Recomendación: no limpiar (YAGNI).

## Próximas fases

- Detalle `/eventos/[slug]` y `RelatedEventsSection` con datos reales (retirar `MOCK_EVENTS` del runtime; `MOCK_CATEGORIES` pasa a una constante propia o a DB).
- Orden manual del Hero / tope de destacados, si negocio lo pide.
- Paginación y búsqueda en servidor del catálogo.
