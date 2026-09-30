# Events Catalog

Estado: in-progress

## Objetivo
Dar a los usuarios una página de catálogo (`/eventos`) donde puedan buscar por texto, filtrar por categoría/ciudad/fecha/precio y ordenar los eventos mock existentes, reutilizando `EventCard` y el resto de la base visual de la Fase 1. Resuelve la necesidad de descubrir eventos más allá del home (que solo muestra destacados/tabs por categoría), sin todavía depender de un backend real.

## Fuera de alcance
- Conexión real a backend/API: todo el filtrado ocurre client-side sobre `MOCK_EVENTS`/`MOCK_CATEGORIES`.
- Paginación real: se muestran todos los resultados filtrados a la vez (son pocos eventos mock).
- Query params en la URL (`?q=...&categoria=...`): el estado de filtros vive solo en memoria (`useState` vía el hook), se pierde al refrescar. No se agrega por YAGNI; si se necesita compartir/bookmarkear búsquedas, es una fase futura explícita.
- Detalle de evento, checkout, selector de zonas (fases 3-5 del roadmap).
- Cambiar el contrato de `Event`/`EventCategory` (`modules/events/types/event.types.ts`): esta spec solo diversifica *valores* de `city` en el mock existente, no agrega ni quita campos.
- Refactor de `EventCard`/`HeroCarousel` para recibir `categories` como prop en vez de importar `MOCK_CATEGORIES` directamente (deuda ya anotada en `landing-design-foundation.md`): sigue siendo YAGNI en esta fase porque el catálogo consume el mismo módulo mock singleton, así que no hay inconsistencia de datos que forzar a resolver ahora. Se reevalúa cuando una fase futura introduzca una fuente de datos distinta a `modules/events/data/events.mock.ts`.

## Reutilización
- Existente que se reutiliza: `modules/events/components/EventCard.tsx` — se usa tal cual en el grid de resultados, sin reimplementar su marcado.
- Existente que se reutiliza: `modules/events/types/event.types.ts` (`Event`, `EventCategory`) — sin cambios de contrato.
- Existente que se reutiliza: `modules/events/data/events.mock.ts` (`MOCK_EVENTS`, `MOCK_CATEGORIES`) como fuente de datos.
- Existente que se reutiliza: `components/ui/input.tsx`, `components/ui/sheet.tsx`, `components/ui/tabs.tsx`, `components/ui/button.tsx`, `components/ui/badge.tsx` (vía `EventCard`) y `lib/utils.ts` (`cn`).
- Existente que se reutiliza: el patrón de `Sheet` no controlado de `components/shared/SiteNavbar.tsx` (trigger + `SheetContent` con `md:hidden`/`lg:hidden`) como referencia para el panel de filtros mobile.
- Existente que se extiende: `modules/events/data/events.mock.ts` — se diversifican los valores de `city` de varios eventos (hoy todos son `"Lima"`) para que el filtro de ciudad tenga señal real; no cambia `id`, `slug` ni ningún otro campo de ningún evento, ni el tipo `Event`.
- Existente que se extiende: `components/shared/SiteNavbar.tsx` — el link "Eventos" pasa de `"/#eventos"` (ancla en el home) a `"/eventos"` (ruta del catálogo), en desktop y en el `Sheet` mobile.
- Nuevo (y por qué no sirve nada existente):
  - `modules/events/types/event-filter.types.ts`: no existe hoy ningún tipo para representar el estado combinado de búsqueda/filtros/orden.
  - `modules/events/services/event-filter.service.ts`: `event.service.ts` actual solo resuelve `featured` y filtro por una sola categoría; no cubre búsqueda de texto, múltiples categorías/ciudades, mes, rango de precio ni orden combinados.
  - `modules/events/hooks/useEventFilters.ts`: no existe ningún hook que orqueste el estado de filtros del catálogo (distinto del `useHeroCarousel` de la Fase 1, que es solo para el carrusel).
  - `modules/events/components/EventSearchBar.tsx`, `EventFilterPanel.tsx`, `EventsCatalog.tsx`: no existe ningún componente de búsqueda/filtros en el dominio events; `CategoryChips`/`UpcomingEventsSection` no cubren checkboxes de categoría+ciudad, radios de fecha/precio ni un panel reutilizable entre sidebar desktop y `Sheet` mobile.
  - `app/eventos/page.tsx`: no existe la ruta `/eventos`.
- Dependencias / componentes shadcn a instalar antes de implementar: `npx shadcn@latest add checkbox radio-group` (necesarios desde T3). No se instala `select` (el orden "Fecha"/"Precio más bajo" usa `components/ui/tabs`, ya instalado, mismo patrón que `UpcomingEventsSection`), ni `separator`/`skeleton`/`carousel` (no se necesitan en esta fase).

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con el catálogo integrado.
- AC-2: `npx vitest run` pasa para todos los archivos de test nuevos (`event-filter.service.test.ts`, `useEventFilters.test.ts`).
- AC-3: La ruta `/eventos` (`app/eventos/page.tsx`) renderiza, en este orden: encabezado de la página, `EventSearchBar`, panel de filtros (sidebar en desktop / trigger de `Sheet` en mobile), contador de resultados + control de orden, y el grid de `EventCard`.
- AC-4: `modules/events/data/events.mock.ts` mantiene los 10 eventos existentes con su mismo `id`, `slug` y el resto de campos sin cambios, pero sus valores de `city` cubren al menos 3 ciudades distintas (no todos `"Lima"`); el tipo `Event` en `event.types.ts` no se modifica.
- AC-5: `modules/events/types/event-filter.types.ts` define `SortOption` (`"date" | "price"`), `PriceRangeOption` (`id: string`, `label: string`, `min: number`, `max: number | null`), `MonthOption` (`value: string`, `label: string`) y `EventFilters` (`query: string`, `categoryIds: string[]`, `cities: string[]`, `month: string`, `priceRangeId: string`, `sortBy: SortOption`).
- AC-6: `applyEventFilters(events, filters)` en `event-filter.service.ts` combina con AND: `query` no vacío filtra eventos cuyo `title`, `venueName` o `city` contienen el texto (case-insensitive, sin distinguir mayúsculas/minúsculas); `categoryIds` no vacío filtra por `categoryId` incluido en la lista (OR entre categorías seleccionadas); `cities` no vacío filtra igual sobre `city`; `month !== "all"` filtra eventos cuyo `startDate` cae en ese `"YYYY-MM"`; `priceRangeId !== "all"` filtra eventos cuyo `priceFrom` cae dentro de `[min, max]` inclusive (`max: null` = sin límite superior); `sortBy: "date"` ordena el resultado ascendente por `startDate`, `sortBy: "price"` ordena ascendente por `priceFrom`. Con `filters` en sus valores por defecto, devuelve todos los `events` ordenados por fecha. Verificado en `event-filter.service.test.ts` con al menos un caso por filtro individual y un caso con 2+ filtros combinados.
- AC-7: `getCategoryCounts(events, categories)` devuelve un `Record<string, number>` con la cantidad de `events` por `categoryId` (sobre el set recibido completo, no sobre un resultado ya filtrado), incluyendo entradas en `0` para categorías sin eventos; `getAvailableCities(events)` devuelve las ciudades únicas de `events` ordenadas alfabéticamente; `getAvailableMonths(events)` devuelve los meses únicos (`value: "YYYY-MM"`) presentes en `events`, ordenados cronológicamente ascendente, con `label` en español con mes capitalizado (ej. `"Octubre 2026"`) — verificado en `event-filter.service.test.ts`.
- AC-8: `useEventFilters({ events, categories })` expone `filters: EventFilters`, `filteredEvents` (igual a `applyEventFilters(events, filters)`), `categoryCounts`, `availableCities`, `availableMonths`, `priceRanges`, y los setters `setQuery`, `toggleCategory`, `toggleCity`, `setMonth`, `setPriceRangeId`, `setSortBy`, `resetFilters`; `toggleCategory(id)`/`toggleCity(city)` agregan el valor si no estaba seleccionado y lo quitan si ya estaba; `resetFilters()` vuelve `filters` a los valores por defecto (`query: ""`, `categoryIds: []`, `cities: []`, `month: "all"`, `priceRangeId: "all"`, `sortBy: "date"`) — verificado en `useEventFilters.test.ts` con `renderHook`/`act` (mismo patrón que `useHeroCarousel.test.ts`).
- AC-9: `EventSearchBar` renderiza un `Input` (`components/ui/input`) controlado por props `value`/`onChange`, con placeholder que invita a buscar por artista, evento o ciudad; no contiene lógica de filtrado propia (delega en el `onChange` del padre).
- AC-10: `EventFilterPanel` renderiza: checkboxes de categoría (nombre + conteo entre paréntesis, vía `components/ui/checkbox`), checkboxes de ciudad, un `components/ui/radio-group` de fecha con la opción fija "Cualquier fecha" más una opción por cada `MonthOption` recibido, un `radio-group` de precio con las opciones de `priceRanges`, y un botón "Limpiar filtros" que invoca `onReset`; todo el estado seleccionado y los callbacks (`onToggleCategory`, `onToggleCity`, `onMonthChange`, `onPriceRangeChange`, `onReset`) llegan por props, sin estado propio no trivial.
- AC-11: El componente orquestador (`EventsCatalog`) muestra un contador "`N` eventos" donde `N === filteredEvents.length`, y cuando `filteredEvents.length === 0` muestra un mensaje de estado vacío (ej. "No se encontraron eventos con estos filtros") en vez del grid.
- AC-12: Responsive: en viewport por debajo de `lg`, el `EventFilterPanel` vive dentro de un `Sheet` (patrón de `SiteNavbar`) disparado por un botón "Filtros", y el `aside` del sidebar desktop está oculto (`lg:hidden` en el trigger/Sheet, `hidden lg:block` en el `aside`); en `lg:` y superior el `aside` con `EventFilterPanel` se muestra fijo a la izquierda y el trigger mobile se oculta — verificable leyendo las clases en `EventsCatalog.tsx`.
- AC-13: El grid de resultados usa `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` (o equivalente) y renderiza un `EventCard` por cada evento de `filteredEvents`, sin reimplementar su marcado.
- AC-14: El control de orden usa `components/ui/tabs` con dos `TabsTrigger` ("Fecha" y "Precio más bajo") que llaman a `setSortBy`; el orden visible del grid refleja siempre `filteredEvents` (ya ordenado por el service), sin lógica de ordenamiento adicional en el componente.
- AC-15: `SiteNavbar` actualiza el `href` del link "Eventos" de `NAV_LINKS` de `"/#eventos"` a `"/eventos"`, tanto en el `nav` desktop como en el `Sheet` mobile (mismo array `NAV_LINKS`, un solo cambio de valor); el resto de links y el comportamiento de AC-10 de `landing-design-foundation.md` (hamburguesa en mobile, links inline en `md:`) no cambian.

## Tareas

### T1 — Contrato de filtros + diversificación de datos mock
Define el shape de `EventFilters`/`PriceRangeOption`/`MonthOption` que van a reusar el service, el hook y los componentes, y ajusta `events.mock.ts` para que el filtro de ciudad tenga señal real.
- Archivos:
  - `modules/events/types/event-filter.types.ts` (crear)
  - `modules/events/data/events.mock.ts` (modificar — solo valores de `city` en al menos 4 de los 10 eventos, sin tocar `id`/`slug`/otros campos)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-4, AC-5
- Tests: no aplica (tipos y ajuste de datos estáticos, sin lógica — SETUP.md 3.2)
- [ ] Completada

### T2 — Servicio de filtrado/orden combinado
Lógica pura de búsqueda, filtros (categoría, ciudad, mes, rango de precio) y orden sobre `Event[]`, más las utilidades de conteo/opciones derivadas de los datos.
- Archivos:
  - `modules/events/services/event-filter.service.ts` (crear)
  - `modules/events/services/event-filter.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-6, AC-7
- Tests: `event-filter.service.test.ts` — `applyEventFilters` con cada filtro por separado (`query`, `categoryIds`, `cities`, `month`, `priceRangeId`), un caso con 2+ filtros combinados, y `sortBy: "date"`/`"price"`; `getCategoryCounts` incluye categorías con conteo `0`; `getAvailableCities` devuelve únicas y ordenadas; `getAvailableMonths` devuelve únicos, ordenados cronológicamente, con `label` capitalizado.
- [ ] Completada

### T3 — Componentes presentacionales de búsqueda y filtros
Barra de búsqueda y panel de filtros (categoría/ciudad/fecha/precio + "Limpiar filtros"), ambos sin estado propio: reciben valores y callbacks por props (consumidos luego por el hook de T4 vía el orquestador de T5). Requiere `components/ui/checkbox` y `components/ui/radio-group` ya instalados.
- Archivos:
  - `modules/events/components/EventSearchBar.tsx` (crear)
  - `modules/events/components/EventFilterPanel.tsx` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-9, AC-10
- Tests: no aplica (componentes presentacionales sin lógica propia — SETUP.md 3.2)
- [ ] Completada

### T4 — Hook de estado de filtros del catálogo
Orquesta el estado de `EventFilters`, calcula `filteredEvents`/`categoryCounts`/`availableCities`/`availableMonths` vía el service de T2, y expone los setters que va a consumir `EventsCatalog`.
- Archivos:
  - `modules/events/hooks/useEventFilters.ts` (crear)
  - `modules/events/hooks/useEventFilters.test.ts` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-8
- Tests: `useEventFilters.test.ts` — estado inicial por defecto; `toggleCategory`/`toggleCity` agregan y quitan; `setQuery`/`setMonth`/`setPriceRangeId`/`setSortBy` actualizan `filters` y `filteredEvents` en consecuencia; `resetFilters` vuelve a los valores por defecto.
- [ ] Completada

### T5 — Componente orquestador del catálogo
Compone `EventSearchBar` (T3) + `EventFilterPanel` (T3) dentro de un `aside` desktop y un `Sheet` mobile + control de orden (`tabs`) + contador/estado vacío + grid de `EventCard`, todo alimentado por `useEventFilters` (T4).
- Archivos:
  - `modules/events/components/EventsCatalog.tsx` (crear)
- Depende de: T3, T4
- Grupo paralelo: G4
- Cubre: AC-11, AC-12, AC-13, AC-14
- Tests: no aplica (componente de composición, la lógica ya está testeada en T2/T4 — SETUP.md 3.2)
- [ ] Completada

### T6 — Ruta `/eventos` + link de navbar
Página que compone `EventsCatalog` con `MOCK_EVENTS`/`MOCK_CATEGORIES`, y actualiza el link "Eventos" del navbar para que apunte a la nueva ruta.
- Archivos:
  - `app/eventos/page.tsx` (crear)
  - `components/shared/SiteNavbar.tsx` (modificar — solo el `href` de "Eventos" en `NAV_LINKS`)
- Depende de: T5
- Grupo paralelo: G5
- Cubre: AC-1, AC-3, AC-15
- Tests: no aplica (página de composición y cambio de un valor estático — SETUP.md 3.2)
- [ ] Completada

## Notas para fases siguientes (no bloqueantes en esta spec)
- Sigue pendiente (ver `landing-design-foundation.md`) que `EventCard`/`HeroCarousel` resuelvan categoría importando `MOCK_CATEGORIES` en vez de recibirla como prop. Esta fase no lo corrige porque el catálogo sigue leyendo el mismo módulo mock singleton (no hay fuente de datos distinta todavía); revaluar cuando una fase futura reemplace `modules/events/data/events.mock.ts` por datos reales o por-request.
- Esta fase no persiste filtros en la URL (`useState` en memoria). Si una fase futura necesita compartir/bookmarkear una búsqueda filtrada, evaluar `useSearchParams`/`URLSearchParams` en ese momento (YAGNI hoy).

## Fases siguientes
- Fase 3: detalle de evento (hero + info + selector de zonas de entradas + sidebar de compra).
- Fase 4: selección de zona/asientos (venue map SVG propio) + paso 1 de checkout.
- Fase 5: checkout paso 2 (datos y pago) + paso 3 (confirmación con QR estilo "ticket stub").
- Fase 6: auth UI (login/registro, split screen, solo UI).
- Fase 7: "Mis entradas".
- Fase 8: dashboard de organizador (baja prioridad).
