# Categorías desde la BD

Estado: aprobada

## Objetivo

La UI pública sigue leyendo las categorías de `MOCK_CATEGORIES` (`modules/events/data/events.mock.ts`) aunque la tabla `event_categories` (`name`, `icon_key`, `color_key`) ya existe y está sembrada. Una categoría nueva en la BD no aparecería en los chips, filtros ni etiquetas. Esta spec hace que la UI pública lea nombre, ícono y color de la BD y deja los mocks solo como fuente del seed. Continúa "Próximas fases" de `featured-events-real-data.md` y `event-detail-real-data.md` ("Categorías en DB, retirar `MOCK_CATEGORIES`").

No toca auth, pagos ni inventario: solo lectura de datos públicos.

## Hallazgos de la investigación

- Usos de `MOCK_CATEGORIES` en runtime (verificado con grep): `app/(public)/page.tsx` (chips y filtros), `app/(public)/eventos/page.tsx` (filtros), `EventCard.tsx`, `EventDetailHero.tsx` y `HeroCarousel.tsx` (solo buscan el `name`). Fuera de la UI: `lib/db/seed/event-catalog.ts` (seed) y `modules/organizer/services/event-read.service.test.ts` (solo `.length`).
- `listPublicEvents` devuelve `Event.categoryId = event_categories.icon_key` (no el UUID). Funciona hoy porque el seed usa `iconKey = id del mock`, pero dos categorías con el mismo `icon_key` se mezclarían en filtros.
- `EventCategory` (`event.types.ts`) lleva `icon: LucideIcon` (una función): no se puede pasar de servidor a cliente. `CategoryChips` es el único que usa el ícono y no es cliente, pero el tipo tampoco sirve para datos de la BD.
- No existe un mapa `icon_key` → ícono Lucide en el código: los íconos viven dentro de `MOCK_CATEGORIES`. Hay que crearlo (un solo lugar).
- `listCategories` de `modules/organizer/services/event-read.service.ts` devuelve solo `{ id, name }` para el selector del wizard. Sirve a otro caso; no se mueve (ver pregunta 2).
- Los componentes solo necesitan el **nombre** de la categoría del evento. Poner `categoryName` en `Event` (ya viene del `join` de `listPublicEvents`) evita pasar `categories` por `UpcomingEventsSection`, `EventsCatalog`, `RelatedEventsSection`, `EventCard` y `HeroCarousel` (cliente), y elimina el caso "categoría no encontrada".

## Decisiones

- **D1 — Nombre en el evento.** `Event` gana `categoryName: string`; `listPublicEvents` lo trae del `join` existente. `EventCard`, `EventDetailHero` y `HeroCarousel` lo leen de `event`, sin props nuevas. Como el `join` es `inner` y la FK es `NOT NULL`, siempre hay nombre: no hay caso "no encontrada".
- **D2 — Id real.** `Event.categoryId` pasa a ser `event_categories.id` (UUID) en vez de `icon_key`, para que filtros y conteos no dependan del ícono. Los filtros comparan `event.categoryId` con el `id` de cada categoría, y ambos salen de la BD.
- **D3 — Categorías públicas.** Nuevo `listPublicCategories(db)` en `modules/events/services/` que devuelve `{ id, name, iconKey, colorKey }[]` ordenado por `name`, serializable. Las páginas servidor lo llaman junto a `listPublicEvents` y pasan el resultado como props (`CategoryChips`, `UpcomingEventsSection`, `EventsCatalog`). `EventCategory` pasa a ese mismo shape (sin `icon`).
- **D4 — Mapa de íconos.** `modules/events/utils/category-icons.ts` exporta `getCategoryIcon(iconKey): LucideIcon` con el mapa de las 6 claves del seed (`music`→`Music`, `sports`→`Trophy`, `theater`→`Theater`, `festivals`→`PartyPopper`, `conferences`→`Presentation`, `family`→`Baby`) y fallback `Tag` para claves desconocidas. `CategoryChips` lo usa; es el único consumidor. Color desconocido: fallback neutro (`bg-muted text-muted-foreground`) en `CategoryChips`.
- **D5 — Mocks.** `events.mock.ts` y `venue-zones.mock.ts` no se mueven: `venue-zones.mock` lo usan componentes de selección y varios tests, y `MOCK_EVENTS` lo usan tests. `MOCK_CATEGORIES` pierde el campo `icon` (y los imports de Lucide) y queda tipada sin ícono; solo la consume el seed. `MOCK_EVENTS` se tipa `Omit<Event, "categoryName">[]`.
- **D6 — Seed y migración.** Sin cambios en el seed (usa `id`, `name`, `colorKey` de `MOCK_CATEGORIES`; `icon_key` sigue siendo el id del mock) ni migración: el esquema no cambia.

## Alcance

- Incluye: servicio público de categorías, `categoryName` y UUID en `Event`, mapa de íconos, reemplazo de `MOCK_CATEGORIES` en las 5 ubicaciones, ajuste de tipos y tests afectados.
- No incluye: CRUD de categorías, cambios al selector de categorías del organizador (`listCategories`), mover los mocks, cambios de diseño, validación de `icon_key`/`color_key` al crear categorías, SEO.

## Reutilizar

- `listPublicEvents` y su `join` con `eventCategories` (`list-public-events.service.ts`).
- `getDb` de `@/lib/db/client`, `connection` de `next/server` (patrón de las páginas actuales).
- `CATEGORY_COLOR_CLASSES` ya definido en `CategoryChips.tsx`.
- Íconos de `lucide-react` (ya instalado).
- `eventCategories` de `@/lib/db/schema`. El patrón de `listCategories` (organizer) como referencia de consulta, sin importarlo.

## Archivos

- Nuevos: `modules/events/services/list-public-categories.service.ts` (+ `.test.ts`), `modules/events/utils/category-icons.ts` (+ `.test.ts`).
- Modificados: `modules/events/types/event.types.ts`, `modules/events/services/list-public-events.service.ts` (+ `.test.ts`), `modules/events/data/events.mock.ts`, `modules/events/components/{CategoryChips,EventCard,EventDetailHero,HeroCarousel}.tsx`, `app/(public)/page.tsx`, `app/(public)/eventos/page.tsx`, y los fixtures de tests que construyen `Event`/`EventCategory`: `modules/events/hooks/useEventFilters.test.ts`, `modules/events/services/event-filter.service.test.ts`, `modules/events/services/event.service.test.ts`.
- Sin cambios: `lib/db/seed/event-catalog.ts`, `lib/db/schema.ts`, migraciones, `modules/organizer/*`.

## Criterios de aceptación

- AC1: Una categoría insertada en `event_categories` con al menos un evento publicado aparece en los chips de la home, en los filtros de home y `/eventos`, y como etiqueta en `EventCard`, hero de la home y hero del detalle, sin tocar código.
- AC2: `listPublicCategories` devuelve todas las categorías de la BD como `{ id, name, iconKey, colorKey }`, ordenadas por `name`; con la tabla vacía devuelve `[]`.
- AC3: `listPublicEvents` devuelve `categoryId` = UUID de la categoría y `categoryName` = su `name`. Filtrar por categoría en `/eventos` y los eventos relacionados siguen funcionando con ese id.
- AC4: `getCategoryIcon` devuelve el ícono Lucide de cada una de las 6 claves del seed y un ícono por defecto (`Tag`) para una clave desconocida. Un `color_key` desconocido renderiza el chip con estilo neutro sin lanzar error.
- AC5: `MOCK_CATEGORIES` ya no se importa desde `app/` ni `modules/**/components`; `events.mock.ts` no importa `lucide-react`. Solo lo importan el seed y, si hace falta, tests.
- AC6: `HeroCarousel` (cliente) no recibe ni importa datos de categorías: lee `event.categoryName`; la página servidor no pasa nada nuevo a su prop.
- AC7: `npm run db:seed` (o el script de seed existente) sigue funcionando sin cambios y las categorías sembradas se ven con su ícono y color de antes.
- AC8: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)

- `list-public-categories.service.test.ts`: orden por nombre, shape `{ id, name, iconKey, colorKey }`, tabla vacía (patrón de DB de los otros `*.service.test.ts`).
- `category-icons.test.ts`: las 6 claves devuelven su ícono; clave desconocida devuelve `Tag`.
- `list-public-events.service.test.ts`: ajustar para `categoryId` = UUID y `categoryName`.
- Fixtures de `useEventFilters.test.ts`, `event-filter.service.test.ts` y `event.service.test.ts`: agregar `categoryName` y quitar `icon`.
- Componentes y páginas: sin tests (presentacionales o solo componen, SETUP.md 3.2).

## Tareas

### T1 — Servicio, tipos y mapa de íconos
- Archivos: `modules/events/types/event.types.ts`, `modules/events/services/list-public-categories.service.ts`, `modules/events/services/list-public-categories.service.test.ts`, `modules/events/services/list-public-events.service.ts`, `modules/events/services/list-public-events.service.test.ts`, `modules/events/utils/category-icons.ts`, `modules/events/utils/category-icons.test.ts`, `modules/events/data/events.mock.ts`, `modules/events/hooks/useEventFilters.test.ts`, `modules/events/services/event-filter.service.test.ts`, `modules/events/services/event.service.test.ts`
- Depende de: —
- Paralelizable: no (base de T2 y T3)
- Cubre: AC2, AC3, AC4, AC7

### T2 — Componentes sin MOCK_CATEGORIES
- Archivos: `modules/events/components/CategoryChips.tsx`, `modules/events/components/EventCard.tsx`, `modules/events/components/EventDetailHero.tsx`, `modules/events/components/HeroCarousel.tsx`
- Depende de: T1
- Paralelizable: sí (con T3)
- Cubre: AC1, AC4, AC5, AC6

### T3 — Páginas leen categorías de la BD
- Archivos: `app/(public)/page.tsx`, `app/(public)/eventos/page.tsx`
- Depende de: T1
- Paralelizable: sí (con T2)
- Cubre: AC1, AC5, AC8

## Preguntas abiertas

1. **Id de categoría en `Event`.** Recomendación (D2): UUID real en vez de `icon_key`. Alternativa mínima: dejar `icon_key` y asumir que es único. ¿De acuerdo con el UUID?
2. **`listCategories` del organizador.** Recomendación: dejarlo como está (devuelve solo `{ id, name }` para el wizard) y tener `listPublicCategories` aparte en `modules/events`. Alternativa: que el organizador importe el público (menos duplicación, toca `modules/organizer` y su test). ¿Se prefiere unificar?
3. **Categoría sin eventos publicados.** Recomendación: se muestra igual en chips y filtros (con conteo 0), como hoy con los mocks. ¿O solo las que tengan eventos?

## Pendientes humanos

- Aprobar la spec (`borrador` a `aprobada`).
- Revisar en el navegador tras implementar: home (hero con etiqueta de categoría, chips con ícono y color, filtros), `/eventos` (filtro por categoría y etiqueta en las tarjetas), detalle de un evento (etiqueta en el hero y relacionados).
- Opcional: insertar una categoría nueva en la BD (con evento publicado) y confirmar que aparece sin tocar código.

## Próximas fases

- CRUD de categorías (admin) con validación de `icon_key`/`color_key` contra el mapa de íconos y la paleta.
- Filtros por categoría vía query string si el catálogo crece.
