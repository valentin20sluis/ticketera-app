# Ticket Selection

Estado: in-progress

## Objetivo
Dar a los usuarios, desde el detalle de un evento, una página de selección de entradas (`/eventos/[slug]/entradas`) donde elijan zona(s) del venue en un mapa SVG propio, ajusten cantidad por zona y vean un resumen de compra con el total — dejando el botón "Continuar" listo para conectarse al checkout real en la Fase 5, y conectando el CTA "Elegir entradas" del sidebar de detalle (Fase 3) a esta ruta.

**Decisión zona vs. asiento individual**: esta spec construye **únicamente selección a nivel de zona/sección** (rectángulos clicables: Campo VIP, Campo General, Tribuna Occidente/Oriente/Norte + franja "ESCENARIO"), igual que el mockup de referencia. No se modela ningún concepto de asiento individual, ni se deja el tipo `VenueZone` "preparado" con campos hipotéticos para butacas numeradas: hacerlo hoy sería anticipar una necesidad que no está pedida (YAGNI) y añadiría una responsabilidad más a un tipo que hoy solo describe secciones. Si una fase futura pide asientos numerados, se especifica aparte como una extensión (probablemente un tipo nuevo `VenueSeat` que referencia `VenueZone.id`, no un cambio retroactivo de `VenueZone`).

## Fuera de alcance
- Checkout de datos/pago (Fase 5): el botón "Continuar" de `TicketSummary` no tiene `href` ni `onClick`, solo se deshabilita cuando no hay ninguna entrada seleccionada (mismo patrón de placeholder ya usado en `EventTicketSidebar`/`EventDetailHero` de la Fase 3).
- Selección de asiento individual / mapa de butacas numeradas: ver la decisión de arriba.
- Disponibilidad en tiempo real o persistida: `available` por zona es un valor estático del mock, no se decrementa al "comprar" ni se sincroniza entre pestañas/usuarios.
- Persistir la selección en la URL, `localStorage` o un store global (`zustand`): el estado de selección vive solo en memoria del componente vía un hook, se pierde al recargar. No hace falta compartir/bookmarkear una selección en esta fase (YAGNI); se reevalúa si una fase futura lo pide.
- Zonas distintas por evento: los 10 eventos de `events.mock.ts` comparten un único layout de venue estático (`MOCK_VENUE_ZONES`), igual que hoy comparten `MOCK_CATEGORIES` como singleton. No se modela una relación evento→zonas distinta por evento (documentado como simplificación aceptada, ver "Reutilización").
- Accesibilidad avanzada del mapa SVG (navegación con flechas entre zonas, anuncios `aria-live` de cambios de cantidad): se agrega solo `role="button"`, `tabIndex` y `aria-label`/`aria-disabled` básicos por zona para que sea operable con teclado, nada más.
- Cambiar `Event`, `EventCard`, `EventDetailHero`, `EventAboutSection`, `EventImportantInfo`, `RelatedEventsSection` o el catálogo/filtros (`EventsCatalog`, `useEventFilters`): esta spec no toca ninguno de esos archivos.

## Reutilización
- Existente que se reutiliza: `components/ui/button.tsx` (variantes `outline`/`ghost` y tamaños `icon`/`icon-sm` ya definidos) — CTAs de zona, stepper +/- y botón "Continuar", sin agregar ningún componente shadcn nuevo.
- Existente que se reutiliza: `components/ui/card.tsx` y `components/ui/badge.tsx` — contenedores de `ZoneSelectorList`/`TicketSummary` y la etiqueta "Agotado" en filas de zona sin disponibilidad.
- Existente que se reutiliza: `lib/format-currency.ts` (`formatPrice`) y `lib/utils.ts` (`cn`) — precios por zona, subtotales y total; merge de clases condicionales (estado de zona, fila activa).
- Existente que se reutiliza: `modules/events/data/events.mock.ts` (`MOCK_EVENTS`) y `modules/events/services/event.service.ts` (`getEventBySlug`) — resolución del evento por slug en la nueva ruta, igual que ya hace `app/eventos/[slug]/page.tsx`.
- Existente que se reutiliza: el patrón `nativeButton={false}` + `render={<Link href=... />}` sobre `Button` ya usado en `EventCard.tsx` (Ver entradas) para que "Elegir entradas" navegue sin convertir `EventTicketSidebar` en `"use client"`.
- Existente que se extiende: `modules/events/components/EventTicketSidebar.tsx` — el `Button` "Elegir entradas" pasa de no tener `href`/`onClick` a navegar a `/eventos/${event.slug}/entradas` con el patrón de arriba; sigue siendo Server Component.
- Patrón obligatorio ya aprendido (documentado explícitamente para que el developer no lo repita): `Event` no contiene ningún campo no serializable (no tiene `icon: LucideIcon`, a diferencia de `EventCategory`), así que pasar un `Event`/`Pick<Event, ...>` de un Server Component (`app/eventos/[slug]/entradas/page.tsx`) a un Client Component (`TicketSelectionView`) no rompe el build. Aun así, `TicketSelectionView` recibe `Pick<Event, "title" | "slug">` (no el `Event` completo) por Interface Segregation, no por necesidad de serialización — no hay que "arreglar" nada de serialización aquí, pero tampoco hay que ampliar la prop a más de lo que el componente usa. **Regla que sí sigue aplicando sin excepción**: ningún archivo de esta spec convierte una página entera de `app/` en `"use client"`; la interactividad vive en `TicketSelectionView.tsx` (y los componentes que este compone), la página de `app/` sigue siendo un Server Component `async` que solo resuelve datos y delega.
- Nuevo (y por qué no sirve nada existente):
  - `modules/events/types/venue-zone.types.ts`: no existe ningún tipo que describa zonas/secciones de un venue; `Event` no tiene (ni debe tener, ver Fuera de alcance) ese concepto.
  - `modules/events/data/venue-zones.mock.ts`: no existe ninguna fuente de datos de zonas.
  - `modules/events/services/venue-zone.service.ts`: `event.service.ts`/`event-filter.service.ts` operan sobre `Event[]`, no sobre zonas de venue; es lógica pura de un concepto de dominio distinto (SRP).
  - `modules/events/hooks/useTicketSelection.ts`: no existe ningún hook de selección/cantidad/totales; `useEventFilters`/`useHeroCarousel` resuelven problemas de estado distintos (filtros de catálogo, índice de carrusel).
  - `modules/events/components/VenueZoneMap.tsx`, `ZoneSelectorList.tsx`, `TicketSummary.tsx`, `TicketSelectionView.tsx`: no existe ningún componente de mapa de venue, lista de zonas con stepper, resumen de compra ni el orquestador que los conecta. Se construye el mapa como SVG propio (sin librería de terceros) por la investigación ya hecha en una sesión anterior: las librerías de seat-map de npm están abandonadas/no verificadas contra React 19, y las opciones enterprise (Seats.io, etc.) asumen un backend de disponibilidad real fuera de alcance.
  - `app/eventos/[slug]/entradas/page.tsx`: no existe la ruta de selección de entradas (la Fase 3 la dejó explícitamente sin implementar).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. El catálogo de `components/ui/` ya cubre todo lo necesario (`button`, `card`, `badge`); no hay un componente shadcn de "seat map"/"stepper" en el catálogo oficial, y un stepper de cantidad se resuelve con dos `Button size="icon"` + un `span` con el número, sin nada nuevo que instalar.

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con la ruta de selección de entradas integrada.
- AC-2: `npx vitest run` pasa para todos los archivos de test nuevos (`venue-zone.service.test.ts`, `useTicketSelection.test.ts`).
- AC-3: `modules/events/types/venue-zone.types.ts` define `VenueZoneShape` (`x`, `y`, `width`, `height`, todos `number`, coordenadas en un sistema `0-100` documentado en un comentario como `viewBox="0 0 100 100"`), `ZoneSelectionStatus` (`"available" | "selected" | "sold-out"`) y `VenueZone` (`id: string`, `name: string`, `price: number`, `capacity: number`, `available: number`, `shape: VenueZoneShape`); `VenueZone` no incluye ningún campo de estado de selección (ni `status` ni `quantity`) — ese estado es siempre derivado, nunca almacenado en el tipo de dato del venue.
- AC-4: `modules/events/data/venue-zones.mock.ts` exporta `MOCK_VENUE_ZONES: VenueZone[]` con exactamente 5 zonas (`campo-vip`, `campo-general`, `tribuna-occidente`, `tribuna-oriente`, `tribuna-norte`), al menos una con `available: 0` (zona agotada de prueba: `tribuna-occidente`), y todos los `shape` con valores dentro de `[0, 100]`.
- AC-5: `modules/events/services/venue-zone.service.ts` exporta `MAX_TICKETS_PER_ZONE = 6`, `getVenueZones(): VenueZone[]` (devuelve `MOCK_VENUE_ZONES`), `isZoneSoldOut(zone: Pick<VenueZone, "available">): boolean` (`true` cuando `available <= 0`) y `getZoneMaxQuantity(zone: Pick<VenueZone, "available">): number` (`Math.max(0, Math.min(zone.available, MAX_TICKETS_PER_ZONE))`) — verificado en `venue-zone.service.test.ts` con una zona con `available` mayor a 6 (se clampa a 6), una con `available` menor a 6 (se clampa a `available`) y la zona agotada (da `0`).
- AC-6: `useTicketSelection(zones: VenueZone[])` en su estado inicial devuelve cantidad `0` para cada zona, `activeZoneId: null`, `lines: []`, `totalQuantity: 0` y `totalAmount: 0`.
- AC-7: `selectZone(zoneId)` sobre una zona disponible (`available > 0`) con cantidad `0` pone su cantidad en `1` y `activeZoneId` en `zoneId`; llamarlo de nuevo sobre una zona que ya tiene cantidad `> 0` solo actualiza `activeZoneId` sin cambiar la cantidad; llamarlo sobre una zona agotada (`available <= 0`) no tiene efecto (ni cantidad ni `activeZoneId` cambian).
- AC-8: `increment(zoneId)`/`decrement(zoneId)` cambian la cantidad de esa zona en `±1`, con clamp entre `0` y `getZoneMaxQuantity(zone)` (incrementar en el máximo, o sobre una zona agotada, no tiene efecto; decrementar en `0` no tiene efecto); cuando sí cambian la cantidad, actualizan `activeZoneId` a `zoneId`.
- AC-9: `getZoneStatus(zoneId): ZoneSelectionStatus` devuelve `"sold-out"` para una zona con `available <= 0` sin importar su cantidad, `"selected"` cuando la cantidad es `> 0`, y `"available"` en cualquier otro caso.
- AC-10: `lines` incluye únicamente las zonas con cantidad `> 0`, cada una como `{ zoneId, zoneName, price, quantity, subtotal }` con `subtotal = price * quantity`; `totalQuantity` es la suma de cantidades de todas las zonas; `totalAmount` es la suma de los `subtotal` de `lines` — verificado con un escenario de 2 o más zonas seleccionadas con cantidades distintas.
- AC-11: `VenueZoneMap({ zones, onZoneSelect })` (donde cada zona en `zones` ya trae `status: ZoneSelectionStatus` resuelto por quien lo llama) renderiza un `<svg>` con una franja estática no clicable ("ESCENARIO") y una región clicable por cada zona recibida, con clases distintas según `status` (verificable leyendo el código: una rama de clases para `"available"`, otra para `"selected"`, otra para `"sold-out"`); al hacer click sobre una zona con `status !== "sold-out"` llama a `onZoneSelect(zone.id)`, y sobre una zona `"sold-out"` no lo llama.
- AC-12: `ZoneSelectorList({ zones, activeZoneId, onIncrement, onDecrement })` (donde cada zona ya trae `status`, `quantity` y `maxQuantity` resueltos por quien lo llama) renderiza una fila por zona con nombre, `formatPrice(price)` y un stepper de dos `Button` (decrementar/incrementar); el botón de decrementar está `disabled` cuando `quantity === 0`, el de incrementar está `disabled` cuando `status === "sold-out"` o `quantity >= maxQuantity`; la fila cuyo `id === activeZoneId` tiene una clase visual distinta a las demás (verificable leyendo el código).
- AC-13: `TicketSummary({ lines, totalQuantity, totalAmount })` renderiza un mensaje de estado vacío cuando `lines.length === 0`; en otro caso, una fila por línea (`{quantity} × {zoneName}` + `formatPrice(subtotal)`) y una fila de total con `formatPrice(totalAmount)`, más un `Button` "Continuar" sin `href` ni `onClick`, `disabled` cuando `totalQuantity === 0`; el elemento raíz incluye clases `fixed` + `bottom-0` para mobile y `lg:sticky lg:top-24` desde `lg:` (verificable leyendo las clases).
- AC-14: `TicketSelectionView({ event, zones })` es un Client Component (`"use client"`) que llama a `useTicketSelection(zones)` una sola vez y compone `VenueZoneMap` + `ZoneSelectorList` + `TicketSummary`, pasándole a cada uno solo los props derivados que necesita (`status`/`quantity`/`maxQuantity` ya resueltos antes de renderizarlos, ninguno de los 3 vuelve a calcularlos) — verificable leyendo el código.
- AC-15: El layout de `TicketSelectionView` usa `grid-cols-1 ... lg:grid-cols-3`: `VenueZoneMap` + `ZoneSelectorList` ocupan `lg:col-span-2`, `TicketSummary` ocupa `lg:col-span-1`; el contenedor tiene padding inferior adicional (ej. `pb-28`/`pb-32`) para que la barra fija de `TicketSummary` en mobile no tape contenido — verificable leyendo las clases.
- AC-16: `app/eventos/[slug]/entradas/page.tsx` es un Server Component `async` que hace `await params` para obtener `slug`, resuelve el evento con `getEventBySlug(MOCK_EVENTS, slug)`, llama a `notFound()` de `next/navigation` cuando no hay coincidencia, obtiene las zonas con `getVenueZones()` y renderiza `TicketSelectionView` pasándole `event` acotado a `Pick<Event, "title" | "slug">` y `zones` — verificable leyendo el código.
- AC-17: `EventTicketSidebar.tsx` navega su `Button` "Elegir entradas" a `/eventos/${event.slug}/entradas` usando `nativeButton={false}` + `render={<Link .../>}` (mismo patrón que `EventCard.tsx`), sin agregar `"use client"` al archivo.

## Tareas

### T1 — Contrato de zonas de venue + datos mock
Define el tipo `VenueZone`/`VenueZoneShape`/`ZoneSelectionStatus` que van a reusar el service, el hook y los componentes, y el layout estático de 5 zonas (con una agotada) sobre un `viewBox` de `0 0 100 100`.
- Archivos:
  - `modules/events/types/venue-zone.types.ts` (crear)
  - `modules/events/data/venue-zones.mock.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4
- Tests: no aplica (tipos y fixture estática sin lógica — SETUP.md 3.2)
- [x] Completada

### T2 — Servicio de zonas de venue
Lógica pura de acceso a las zonas y cálculo de disponibilidad/máximo por zona, reutilizada por el hook (T3), los componentes (T4) y la página (T6).
- Archivos:
  - `modules/events/services/venue-zone.service.ts` (crear)
  - `modules/events/services/venue-zone.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5
- Tests: `venue-zone.service.test.ts` — `isZoneSoldOut` con zona disponible y zona agotada; `getZoneMaxQuantity` con `available` mayor a `MAX_TICKETS_PER_ZONE` (clampa a 6), menor (clampa a `available`) y con la zona agotada (da 0); `getVenueZones` devuelve las 5 zonas del mock incluyendo la agotada.
- [x] Completada

### T3 — Hook de selección de entradas
Estado de cantidades por zona, zona activa y totales derivados, consumido por `TicketSelectionView` (T5).
- Archivos:
  - `modules/events/hooks/useTicketSelection.ts` (crear)
  - `modules/events/hooks/useTicketSelection.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-6, AC-7, AC-8, AC-9, AC-10
- Tests: `useTicketSelection.test.ts` (con `renderHook`/`act`, mismo patrón que `useEventFilters.test.ts`) — estado inicial; `selectZone` en zona disponible con cantidad 0, en zona ya seleccionada, y en zona agotada; `increment`/`decrement` con clamp en ambos límites (incluida una zona agotada); `getZoneStatus` en sus 3 valores; `lines`/`totalQuantity`/`totalAmount` con 2+ zonas seleccionadas con cantidades distintas.
- [x] Completada

### T4 — Componentes presentacionales: mapa, lista de zonas y resumen
Mapa SVG de zonas, lista de zonas con stepper de cantidad y resumen de compra — los tres sin estado propio, reciben valores ya resueltos y emiten callbacks.
- Archivos:
  - `modules/events/components/VenueZoneMap.tsx` (crear)
  - `modules/events/components/ZoneSelectorList.tsx` (crear)
  - `modules/events/components/TicketSummary.tsx` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-11, AC-12, AC-13
- Tests: no aplica (componentes presentacionales sin lógica propia no trivial — SETUP.md 3.2)
- [x] Completada

### T5 — Orquestador de la vista de selección
Compone T2 (service, para los derivados de `maxQuantity`)+T3 (hook)+T4 (componentes) en la vista interactiva completa, con el layout responsive final.
- Archivos:
  - `modules/events/components/TicketSelectionView.tsx` (crear)
- Depende de: T2, T3, T4
- Grupo paralelo: G3
- Cubre: AC-14, AC-15
- Tests: no aplica (componente de composición, la lógica ya está testeada en T2/T3 — SETUP.md 3.2)
- [ ] Completada

### T6 — Ruta `/eventos/[slug]/entradas` + conexión del sidebar
Página que resuelve el evento por slug (`notFound()` si no existe) y las zonas del venue, y renderiza T5; conecta el botón "Elegir entradas" del sidebar de detalle (Fase 3) a la nueva ruta.
- Archivos:
  - `app/eventos/[slug]/entradas/page.tsx` (crear)
  - `modules/events/components/EventTicketSidebar.tsx` (modificar)
- Depende de: T2, T5
- Grupo paralelo: G4
- Cubre: AC-1, AC-2, AC-16, AC-17
- Tests: no aplica (página de composición/data-fetching y cambio de un `Button` ya testeado indirectamente por el patrón de `EventCard` — SETUP.md 3.2)
- [ ] Completada

## Fases siguientes
- Fase 5: checkout paso 2 (datos y pago, consumiendo `lines`/`totalAmount` de esta fase) + paso 3 (confirmación con QR estilo "ticket stub").
- Fase 6: auth UI (login/registro, split screen, solo UI).
- Fase 7: "Mis entradas".
- Fase 8: dashboard de organizador (baja prioridad).
