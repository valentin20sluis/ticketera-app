# Event Detail

Estado: done

## Objetivo
Dar a los usuarios una página de detalle (`/eventos/[slug]`) para un evento específico, con toda la información necesaria para decidir la compra (fecha, ubicación, descripción, datos prácticos y precio) y un punto de entrada visual hacia el flujo de compra, reutilizando `EventCard` y el resto de la base ya construida en las fases 1 y 2. Conecta además el botón "Ver entradas" de `EventCard`, que hoy no navega a ningún lado.

## Fuera de alcance
- Selector de zonas/asientos y checkout (Fase 4-5 del roadmap): tanto el CTA "Comprar entradas" del hero como el "Elegir entradas" del sidebar se renderizan como `Button` sin `href`/`onClick` (no navegan a ningún lado todavía). No se crea la ruta `/eventos/[slug]/entradas`.
- Datos reales de disponibilidad de entradas (aforo, stock por zona): se sigue mostrando solo `priceFrom`/`status`, ya existentes en `Event`.
- Mapa real del lugar: no se agrega ningún mapa ni placeholder visual de mapa. La ubicación (`venueName` + `city`) se comunica solo como texto con ícono de pin, igual que ya hace `EventCard` — no estaba en la lista de secciones pedidas explícitamente para esta fase (YAGNI); si una fase futura lo requiere, se especifica aparte.
- Funcionalidad real de favorito/compartir: los botones existen visualmente (íconos) pero sin `onClick` ni estado.
- Query params, SSR con datos reales o `generateStaticParams`: el slug se resuelve contra `MOCK_EVENTS` en cada request (Server Component síncrono sobre datos en memoria), sin prerender estático explícito.
- Cambiar `EventFilters`/catálogo (`docs/specs/events-catalog.md`): esta spec no toca `EventsCatalog.tsx`, `EventFilterPanel.tsx`, `EventSearchBar.tsx`, `useEventFilters.ts` ni `event-filter.service.ts`.

## Reutilización
- Existente que se reutiliza: `modules/events/components/EventCard.tsx` — en la sección "También te puede interesar", sin reimplementar su marcado.
- Existente que se reutiliza: `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx` y `lib/utils.ts` (`cn`) — no se necesita instalar ningún componente shadcn nuevo (ya cubren banner, badges, CTAs y tarjetas informativas).
- Existente que se reutiliza: `lib/format-currency.ts` (`formatPrice`) — precio en el hero y en el sidebar.
- Existente que se reutiliza: `modules/events/data/events.mock.ts` (`MOCK_EVENTS`, `MOCK_CATEGORIES`) como fuente de datos.
- Existente que se reutiliza: el patrón de `render={<Link .../>}` sobre `Button` ya usado en `components/shared/SiteNavbar.tsx` (`SheetTrigger`) y `modules/events/components/EventsCatalog.tsx` (`SheetTrigger`) — se aplica ahora directamente sobre `Button` para que "Ver entradas" navegue sin envolverlo en un `<a>` manual.
- Existente que se reutiliza: el patrón ya establecido en `EventCard.tsx`/`HeroCarousel.tsx` de resolver el nombre de categoría importando `MOCK_CATEGORIES` directamente en el componente (en vez de recibirla como prop) — documentado como deuda aceptada en `landing-design-foundation.md` y `events-catalog.md`. `EventDetailHero` sigue el mismo patrón por consistencia. Como consecuencia, **ningún componente nuevo de esta fase necesita recibir `EventCategory`/`icon` como prop ni volverse `"use client"`**; si en el futuro alguno lo necesitara, el tipo debe acotarse a `Pick<EventCategory, "id" | "name">` (nunca pasar el objeto completo con el `icon: LucideIcon` de un Server Component a un Client Component) — ese workaround (convertir toda la página en `"use client"`) ya rompió `npm run build` dos veces en fases anteriores y el reviewer lo marcó como blocker ambas veces.
- Existente que se extiende: `modules/events/types/event.types.ts` (`Event`) — se agregan 4 campos nuevos **requeridos** (`doorsOpenTime`, `showStartTime`, `minimumAge`, `admissionType`, todos `string`) para la sección "Información importante", que hoy no existen en el mock. Se opta por requeridos (no opcionales) en vez de placeholders fijos en UI: son datos reales por evento (la hora de apertura de puertas no es la misma para un festival de 12 horas que para una obra de teatro de 2 horas), ya se van a poblar los 10 eventos existentes en esta misma tarea, y evita lógica de fallback en el componente (KISS). Si una fase futura no puede proveerlos para un evento nuevo, se reevalúa volverlos opcionales con fallback en ese momento.
- Existente que se extiende: `modules/events/data/events.mock.ts` — se agregan valores para los 4 campos nuevos en los 10 eventos existentes, sin tocar `id`, `slug`, ni ningún otro campo.
- Existente que se extiende: `modules/events/services/event.service.ts` — se agregan `getEventBySlug` y `getRelatedEvents` junto a `getFeaturedEvents`/`getEventsByCategory` ya existentes (mismo archivo, mismo dominio de lógica pura sobre `Event[]`).
- Existente que se extiende: `modules/events/utils/format-event-date.ts` — se agrega `formatFullEventDate` (la fecha larga que hoy vive duplicada e inline dentro de `EventCard.tsx` sin tests, porque ahí estaba exenta por SETUP.md 3.2 al ser un componente presentacional; al moverla a `utils/` se vuelve una utilidad pura reutilizable y por lo tanto **sí** requiere test) y `formatEventTime` (nueva, hora del evento).
- Existente que se extiende: `modules/events/components/EventCard.tsx` — usa el `formatFullEventDate` importado de `utils/format-event-date.ts` en vez de su copia local, y su botón "Ver entradas" pasa a navegar a `/eventos/${event.slug}`.
- Nuevo (y por qué no sirve nada existente):
  - `modules/events/components/EventDetailHero.tsx`, `EventAboutSection.tsx`, `EventImportantInfo.tsx`, `EventTicketSidebar.tsx`, `RelatedEventsSection.tsx`: no existe ningún componente de detalle de evento; cada uno cubre una sección distinta del mockup con una sola responsabilidad (SRP), ninguno de los componentes existentes (`EventCard`, `UpcomingEventsSection`, `HowItWorksSection`, `EventFilterPanel`, etc.) cubre hero de detalle, descripción larga, tarjetas de info práctica, sidebar de compra ni el bloque de recomendados.
  - `app/eventos/[slug]/page.tsx`: no existe la ruta de detalle.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno (el catálogo de shadcn no tiene nada adicional que cubra hero/sidebar/info-cards mejor que componer `card`/`badge`/`button`, ya instalados).

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con la página de detalle integrada.
- AC-2: `npx vitest run` pasa para todos los archivos de test nuevos/modificados (`event.service.test.ts`, `format-event-date.test.ts`).
- AC-3: `modules/events/types/event.types.ts` agrega a `Event` los campos requeridos `doorsOpenTime: string`, `showStartTime: string`, `minimumAge: string`, `admissionType: string`; `modules/events/data/events.mock.ts` provee un valor no vacío para cada uno de esos 4 campos en los 10 eventos existentes, sin cambiar `id`, `slug` ni ningún otro campo de ningún evento.
- AC-4: `getEventBySlug(events, slug)` en `event.service.ts` devuelve el `Event` cuyo `slug` coincide, o `undefined` si ninguno coincide. `getRelatedEvents(events, currentEvent, limit = 4)` devuelve hasta `limit` eventos distintos de `currentEvent` (nunca lo incluye), priorizando los de `categoryId` igual al de `currentEvent` ordenados ascendente por `startDate`, y completa los cupos restantes (cuando los de la misma categoría son menos que `limit`) con otros eventos de cualquier categoría ordenados igual por `startDate`, sin repetir ningún evento — verificado en `event.service.test.ts` con un caso de categoría con suficientes eventos, un caso de categoría con menos eventos que `limit` (usa el relleno) y un caso que respeta un `limit` explícito distinto del default.
- AC-5: `format-event-date.ts` exporta `formatFullEventDate(isoDate: string): string` (día + mes en español completo + año, ej. `"2026-11-15T20:00:00-05:00"` → contiene `"15"`, `"noviembre"` y `"2026"`) y `formatEventTime(isoDate: string): string` (hora del evento con formato `H:MM` o `HH:MM`, ej. matchea `/^\d{1,2}:\d{2}/`), cada una verificada en `format-event-date.test.ts` con al menos un caso.
- AC-6: `EventCard.tsx` importa y usa `formatFullEventDate` desde `modules/events/utils/format-event-date.ts` (sin una copia local de la función), y su `Button` de "Ver entradas" usa la prop `render` para navegar a `/eventos/${event.slug}` con `next/link`, sin agregar `"use client"` al archivo — verificable leyendo el código (mismo patrón `render={<Link href=... />}` que `SheetTrigger` en `SiteNavbar.tsx`/`EventsCatalog.tsx`).
- AC-7: `app/eventos/[slug]/page.tsx` renderiza, en este orden: `EventDetailHero`, luego un área de contenido responsive con `EventAboutSection` + `EventImportantInfo` en la columna principal y `EventTicketSidebar` en una columna lateral, y por último `RelatedEventsSection`.
- AC-8: `EventDetailHero` muestra: imagen banner (`next/image` con `unoptimized`, sin tocar `next.config.ts`), badge con el nombre de categoría (resuelta vía `MOCK_CATEGORIES.find`, mismo patrón que `EventCard`), título (`<h1>`), fecha completa + hora (`formatFullEventDate` + `formatEventTime`), ubicación (`venueName` + `city` con ícono de pin), un `Button` "Comprar entradas" que incluye el texto `Desde {formatPrice(event.priceFrom)}` sin `href`/`onClick`, y dos `Button` secundarios solo con ícono (favorito, compartir) sin `onClick`.
- AC-9: `EventAboutSection` recibe `description: string` (no el `Event` completo — Interface Segregation) y renderiza un encabezado "Acerca del evento" seguido del texto de `description`.
- AC-10: `EventImportantInfo` recibe `Pick<Event, "doorsOpenTime" | "showStartTime" | "minimumAge" | "admissionType">` y renderiza 4 tarjetas (`Card`) con etiqueta + valor: apertura de puertas (`doorsOpenTime`), inicio del show (`showStartTime`), edad mínima (`minimumAge`), tipo de ingreso (`admissionType`).
- AC-11: `EventTicketSidebar` recibe `Pick<Event, "slug" | "priceFrom">` y muestra el texto "Entradas desde" + `formatPrice(priceFrom)` + un `Button` "Elegir entradas" sin `href`/`onClick`; en viewport `lg:` y superior el `aside` que lo contiene usa `lg:sticky lg:top-24` (verificable leyendo las clases).
- AC-12: `RelatedEventsSection` recibe `events: Event[]` (ya resueltos por la página vía `getRelatedEvents`, sin volver a llamar al service dentro del componente) y renderiza un encabezado "También te puede interesar" + un grid de `EventCard` (uno por evento recibido, sin reimplementar su marcado); si `events` está vacío, el componente no renderiza nada (`return null`).
- AC-13: `app/eventos/[slug]/page.tsx` es un Server Component `async` que hace `await params` para obtener `slug`, resuelve el evento con `getEventBySlug(MOCK_EVENTS, slug)` y llama a `notFound()` de `next/navigation` cuando no hay coincidencia (sin armar una UI de 404 manual) — verificable leyendo el código.
- AC-14: Responsive: en mobile, el área de contenido bajo el hero usa `grid-cols-1` (About/ImportantInfo/Sidebar apilados en una sola columna); desde `lg:` usa un grid de 3 columnas donde About+ImportantInfo ocupan `lg:col-span-2` y el sidebar `lg:col-span-1` — verificable leyendo las clases en `app/eventos/[slug]/page.tsx`.

## Tareas

### T1 — Contrato de info práctica + datos mock + service de detalle
Agrega los 4 campos nuevos a `Event`, los puebla en los 10 eventos existentes, y agrega `getEventBySlug`/`getRelatedEvents` al service ya existente del dominio.
- Archivos:
  - `modules/events/types/event.types.ts` (modificar)
  - `modules/events/data/events.mock.ts` (modificar)
  - `modules/events/services/event.service.ts` (modificar)
  - `modules/events/services/event.service.test.ts` (modificar)
  - `modules/events/services/event-filter.service.test.ts` (modificar — corrección ronda 2: su `buildEvent` local, de la Fase 2, no tiene los 4 campos nuevos; ahora que son requeridos en `Event`, agregar valores dummy a ese helper para que vuelva a tipar)
  - `modules/events/hooks/useEventFilters.test.ts` (modificar — corrección ronda 2: mismo problema, su propio `buildEvent` local necesita los 4 campos nuevos)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4
- Tests: `event.service.test.ts` — `getEventBySlug` con slug existente y slug inexistente; `getRelatedEvents` con categoría con eventos suficientes, con categoría con menos eventos que `limit` (verifica el relleno con otras categorías) y con un `limit` explícito distinto del default, en los tres casos verificando que nunca incluye `currentEvent`. `event-filter.service.test.ts`/`useEventFilters.test.ts` (ya existentes, de la Fase 2) deben seguir pasando tal cual, solo con su `buildEvent` local actualizado.
- [x] Completada

### T2 — Utilidad de fecha/hora completa + conexión de EventCard
Extrae `formatFullEventDate` de `EventCard.tsx` al util compartido (con test, ya que deja de estar exenta por ser presentacional), agrega `formatEventTime`, y conecta el botón "Ver entradas" de `EventCard` a la nueva ruta de detalle.
- Archivos:
  - `modules/events/utils/format-event-date.ts` (modificar)
  - `modules/events/utils/format-event-date.test.ts` (modificar)
  - `modules/events/components/EventCard.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-5, AC-6
- Tests: `format-event-date.test.ts` — `formatFullEventDate` con al menos un caso (día, mes en español, año presentes); `formatEventTime` con al menos un caso que matchee `/^\d{1,2}:\d{2}/`.
- [x] Completada

### T3 — Hero, descripción e info práctica del detalle
Componentes presentacionales de la parte superior de la página: banner + acciones de compra/favorito/compartir, descripción, y tarjetas de información práctica. Consumen el contrato de `Event` ya extendido en T1 y los utils de T2.
- Archivos:
  - `modules/events/components/EventDetailHero.tsx` (crear)
  - `modules/events/components/EventAboutSection.tsx` (crear)
  - `modules/events/components/EventImportantInfo.tsx` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-8, AC-9, AC-10
- Tests: no aplica (componentes presentacionales sin lógica propia no trivial — SETUP.md 3.2)
- [x] Completada

### T4 — Sidebar de compra y sección de recomendados
Sidebar de "Entradas desde" (placeholder de compra) y el bloque de eventos relacionados, que reutiliza `EventCard` (ya conectado en T2) sin reimplementar su marcado.
- Archivos:
  - `modules/events/components/EventTicketSidebar.tsx` (crear)
  - `modules/events/components/RelatedEventsSection.tsx` (crear)
- Depende de: T2
- Grupo paralelo: G2
- Cubre: AC-11, AC-12
- Tests: no aplica (componentes presentacionales sin lógica propia no trivial — SETUP.md 3.2)
- [x] Completada

### T5 — Ruta `/eventos/[slug]`
Página que resuelve el evento por slug (`notFound()` si no existe), calcula los relacionados y compone T3+T4 en el layout responsive final.
- Archivos:
  - `app/eventos/[slug]/page.tsx` (crear)
- Depende de: T1, T2, T3, T4
- Grupo paralelo: G3
- Cubre: AC-1, AC-2, AC-7, AC-13, AC-14
- Tests: no aplica (página de composición y data-fetching sobre servicios ya testeados — SETUP.md 3.2)
- [x] Completada

## Fases siguientes
- Fase 4: selección de zona/asientos (venue map SVG propio) + paso 1 de checkout, incluyendo la ruta `/eventos/[slug]/entradas` que esta fase deja sin implementar.
- Fase 5: checkout paso 2 (datos y pago) + paso 3 (confirmación con QR estilo "ticket stub").
- Fase 6: auth UI (login/registro, split screen, solo UI).
- Fase 7: "Mis entradas".
- Fase 8: dashboard de organizador (baja prioridad).
