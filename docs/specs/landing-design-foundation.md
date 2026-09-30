# Landing Design Foundation

Estado: in-progress

## Objetivo
Sentar la base visual y de datos de "Ticketera" (tokens de marca, componentes shadcn/shared necesarios y el módulo mock de eventos) e implementar sobre esa base la página de landing completa (desktop y mobile), tal como la describe el mockup de referencia. Sirve tanto a usuarios finales (primera pantalla del producto) como a las fases siguientes, que reutilizarán los mismos tipos y componentes de datos.

## Fuera de alcance
- Cualquier conexión a backend/base de datos real; todo dato viene de un módulo mock estático en memoria.
- Catálogo con filtros, detalle de evento, selector de zonas/asientos (venue map SVG), checkout, login/registro, "Mis entradas" y dashboard de organizador (fases 2 a 8, ver abajo).
- Modo oscuro funcional (toggle de tema): los tokens `.dark` ya existentes en `globals.css` no se activan desde ninguna UI en esta fase.
- Envío real del formulario de newsletter (solo estado local de éxito/error simulado, sin llamada a red).
- Optimización de imágenes vía `next.config.ts` (`images.remotePatterns`): se usa `next/image` con la prop `unoptimized` apuntando a URLs de `picsum.photos`, así que no se toca `next.config.ts`.
- SEO avanzado, analytics, i18n.

## Reutilización
- Existente que se reutiliza: `components/ui/button.tsx` — CTAs ("Comprar entradas", "Vender entradas", "Ver detalles", "Suscribirme", etc.) y acciones de navbar/footer.
- Existente que se reutiliza: `lib/utils.ts` (`cn`) — merge de clases en todos los componentes nuevos.
- Existente que se reutiliza: tokens neutros ya definidos en `app/globals.css` (`--background`, `--foreground`, `--card`, `--border`, `--muted`, `--destructive`, etc.) — no se renombran ni se eliminan, solo se agregan tokens de marca nuevos junto a ellos.
- Existente que se extiende: ninguno (no se modifica el comportamiento de ningún componente existente, solo se consume tal cual).
- Nuevo (y por qué no sirve nada existente):
  - `app/globals.css` (tokens `--brand`/`--brand-dark`/`--cta` + su mapeo en `@theme inline`): hoy no existe ningún color de marca, todo es gris neutro.
  - `modules/events/*` (types, data, services, hooks, components): no existe `modules/` en el repo; es el primer dominio de negocio.
  - `lib/format-currency.ts`: utilidad transversal (la van a reusar checkout y detalle de evento en fases futuras), no existe ninguna función de formato de moneda hoy.
  - `components/shared/SiteNavbar.tsx`, `SiteFooter.tsx`, `NewsletterCard.tsx`: no existe `components/shared/` en el repo; son de layout/marketing, no pertenecen a un solo dominio.
  - Carrusel del hero como hook + componente propios (`useHeroCarousel` + `HeroCarousel`) en vez de un carousel de shadcn (que trae `embla-carousel` como dependencia nueva): el mockup solo pide avanzar/retroceder un slide a la vez, pausar el autoplay y una franja de miniaturas — no hay swipe multi-item ni gestos táctiles avanzados. Igual que con los mapas de asientos (decisión ya tomada para fases futuras), preferimos no sumar una dependencia de terceros para un control de estado tan simple (KISS/YAGNI); el índice de slide, el wrap-around y el autoplay/pausa se resuelven con un hook propio y `setInterval`.
- Dependencias / componentes shadcn a instalar antes de implementar: `npx shadcn@latest add card badge tabs input sheet` (necesarios desde T5 en adelante; T1–T4 no dependen de ellos). No se instala `separator` (los divisores usan `border-t border-border`, ya existente) ni `carousel`/`avatar`/`navigation-menu` (no se necesitan en esta fase).

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con la landing completa integrada.
- AC-2: `npx vitest run` pasa para todos los archivos de test nuevos (`format-event-date.test.ts`, `format-currency.test.ts`, `event.service.test.ts`, `useHeroCarousel.test.ts`).
- AC-3: La ruta `/` renderiza, en este orden: navbar, hero carousel, grid de chips de categoría, sección "Próximos eventos" con tabs de categoría, sección "Cómo funciona" (3 pasos), newsletter y footer.
- AC-4: `app/globals.css` define `--brand`, `--brand-foreground`, `--brand-dark`, `--brand-dark-foreground`, `--cta`, `--cta-foreground` en `:root` y en `.dark`, mapeados en el bloque `@theme inline` como `--color-brand`, `--color-brand-foreground`, `--color-brand-dark`, `--color-brand-dark-foreground`, `--color-cta`, `--color-cta-foreground`; los tokens neutros existentes (`--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, etc.) siguen presentes sin cambios de valor.
- AC-5: `modules/events/types/event.types.ts` define `EventStatus` (`"available" | "last-tickets" | "sold-out"`), `EventCategory` (`id`, `name`, `icon`, `colorKey` con unión de al menos 6 valores pastel) y `Event` (`id`, `slug`, `title`, `categoryId`, `description`, `venueName`, `city`, `startDate` ISO string, `imageUrl`, `priceFrom`, `currency`, `status`, `featured`). `modules/events/data/events.mock.ts` exporta `MOCK_CATEGORIES` (≥6 categorías) y `MOCK_EVENTS` (≥8 eventos, cubriendo ≥4 categorías distintas, con al menos 3 `featured: true`, al menos 1 `status: "last-tickets"` y al menos 1 `status: "sold-out"`), usando URLs de imagen `https://picsum.photos/seed/<slug>/...`.
- AC-6: `getFeaturedEvents(events)` devuelve solo los eventos con `featured: true`; `getEventsByCategory(events, categoryId)` devuelve todos los eventos cuando `categoryId` es `"all"` o `undefined`, y solo los que coinciden con ese `categoryId` en otro caso — verificado en `event.service.test.ts`.
- AC-7: `formatEventDateBadge(isoDate)` devuelve `{ month, day }` en mayúsculas abreviadas (ej. `"2026-11-15"` → `{ month: "NOV", day: "15" }`), verificado en `format-event-date.test.ts` con al menos dos meses distintos y un caso de día de un solo dígito con padding (`"05"`).
- AC-8: `formatPrice(amount)` devuelve el precio en soles sin decimales cuando el monto es entero (ej. `40` → `"S/ 40"`, `250` → `"S/ 250"`), verificado en `format-currency.test.ts`.
- AC-9: `useHeroCarousel(itemCount, { intervalMs })` avanza automáticamente el índice cada `intervalMs` mientras no está en pausa (verificado con fake timers), `next()`/`prev()` hacen wrap-around en los límites (de `itemCount - 1` a `0` y viceversa), y `togglePause()` detiene/reanuda el auto-avance — verificado en `useHeroCarousel.test.ts`.
- AC-10: En viewport mobile (por debajo del breakpoint `md`), `SiteNavbar` oculta los links centrales (`Eventos`, `Categorías`, `Cómo funciona`) y el botón "Iniciar sesión"/"Vender entradas" detrás de un botón hamburguesa que abre un `Sheet` con esos mismos links y acciones; en `md:` y superior los links se muestran inline y el trigger hamburguesa se oculta — verificable leyendo las clases `hidden md:flex` / `md:hidden` en `SiteNavbar.tsx`.
- AC-11: `EventCard` muestra: badge de fecha (mes abreviado + día, vía `formatEventDateBadge`), nombre de categoría en índigo mayúsculas, título, ubicación (`venueName` + `city`) con ícono de pin, fecha completa con ícono de calendario, "Desde `formatPrice(priceFrom)`" y botón "Ver entradas"; muestra un badge adicional de estado ("Últimas entradas" / "Agotado") solo cuando `status !== "available"`, y ningún badge de estado cuando `status === "available"`.
- AC-12: `HeroCarousel` y `EventCard` renderizan las imágenes con `next/image` y la prop `unoptimized`, sin ningún cambio en `next.config.ts`.
- AC-13: `UpcomingEventsSection` muestra un tab "Todos" más un tab por cada categoría de `MOCK_CATEGORIES` (usando `components/ui/tabs`); seleccionar un tab distinto de "Todos" deja visibles únicamente los `EventCard` cuyo `categoryId` coincide, delegando el filtrado a `getEventsByCategory` (sin reimplementar la lógica de filtro en el componente).
- AC-14: El grid de "Próximos eventos" usa 1 columna en mobile y 4 en desktop (`grid-cols-1 ... lg:grid-cols-4` o equivalente); la fila de `CategoryChips` permite scroll horizontal en mobile (`overflow-x-auto`) — verificable leyendo las clases del componente.

## Tareas

### T1 — Tokens de marca en globals.css
Agrega los tokens de índigo (marca) y naranja (CTA) como variables nuevas junto a las ya existentes, sin tocar los tokens neutros.
- Archivos: `app/globals.css` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-4
- Tests: no aplica (variables CSS, sin lógica — SETUP.md 3.2)
- [x] Completada

### T2 — Contrato del dominio events: tipos + datos mock
Define el shape de `Event`/`EventCategory` que van a reusar landing y las fases siguientes (catálogo, detalle, checkout), y la fixture estática de datos.
- Archivos:
  - `modules/events/types/event.types.ts` (crear)
  - `modules/events/data/events.mock.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-5
- Tests: no aplica (tipos y fixture estática sin lógica — SETUP.md 3.2)
- [x] Completada

### T3 — Utilidades puras de formato
Formateo de fecha (badge mes/día) y de precio en soles, reutilizables por cualquier componente que muestre eventos.
- Archivos:
  - `modules/events/utils/format-event-date.ts` (crear)
  - `modules/events/utils/format-event-date.test.ts` (crear)
  - `lib/format-currency.ts` (crear)
  - `lib/format-currency.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-7, AC-8
- Tests: `format-event-date.test.ts` — al menos dos meses distintos, día con padding de un dígito; `format-currency.test.ts` — montos enteros, símbolo "S/", sin decimales.
- [x] Completada

### T4 — Servicio de eventos + hook del hero carousel
Lógica de selección/filtrado de eventos (sobre el tipo definido en T2) y el estado del carrusel del hero (índice, wrap-around, autoplay/pausa), ambos sin UI.
- Archivos:
  - `modules/events/services/event.service.ts` (crear)
  - `modules/events/services/event.service.test.ts` (crear)
  - `modules/events/hooks/useHeroCarousel.ts` (crear)
  - `modules/events/hooks/useHeroCarousel.test.ts` (crear)
- Depende de: T2
- Grupo paralelo: G2
- Cubre: AC-6, AC-9
- Tests: `event.service.test.ts` — `getFeaturedEvents` filtra `featured: true`; `getEventsByCategory` con `"all"`/`undefined` devuelve todos, con un id específico filtra. `useHeroCarousel.test.ts` (fake timers) — auto-avance cada `intervalMs`, wrap-around de `next`/`prev` en ambos límites, `togglePause` detiene y reanuda el auto-avance.
- [x] Completada

### T5 — Componentes de UI del dominio events
Componentes presentacionales que consumen los tipos (T2), utils (T3) y service/hook (T4) ya definidos y testeados. Contratos de props: `HeroCarousel({ events: Event[] })` (recibe ya filtrados por `featured`), `CategoryChips({ categories: EventCategory[] })`, `UpcomingEventsSection({ events: Event[], categories: EventCategory[] })` (maneja el `useState` del tab seleccionado y llama a `getEventsByCategory`), `HowItWorksSection()` (sin props, contenido estático de 3 pasos), `EventCard({ event: Event })`.
- Archivos:
  - `modules/events/components/EventCard.tsx` (crear)
  - `modules/events/components/HeroCarousel.tsx` (crear)
  - `modules/events/components/CategoryChips.tsx` (crear)
  - `modules/events/components/UpcomingEventsSection.tsx` (crear; corrección ronda 2: su prop `categories` no debe ser `EventCategory[]` completo — pasar el ícono de Lucide, una función, desde un Server Component a este Client Component rompe `npm run build`. Acota el tipo a solo los campos serializables que usa, ej. `Pick<EventCategory, "id" | "name">[]`)
  - `modules/events/components/HowItWorksSection.tsx` (crear)
- Depende de: T2, T3, T4
- Grupo paralelo: G3
- Cubre: AC-3, AC-11, AC-12, AC-13, AC-14
- Tests: no aplica (componentes presentacionales que solo componen tipos/service/hook ya testeados, sin lógica propia no trivial — SETUP.md 3.2)
- [ ] Completada (reabierta en corrección ronda 2, ver nota de `UpcomingEventsSection.tsx` arriba)

### T6 — Chrome del sitio + newsletter + composición de la landing
Navbar y footer de layout (reutilizables por las fases futuras), card de newsletter (solo UI, estado local de éxito simulado) y el ensamblado final de la página usando los componentes de T5 con los datos de `modules/events/data/events.mock.ts`.
- Archivos:
  - `components/shared/SiteNavbar.tsx` (crear)
  - `components/shared/SiteFooter.tsx` (crear)
  - `components/shared/NewsletterCard.tsx` (crear)
  - `app/page.tsx` (modificar — reemplaza el boilerplate de create-next-app por la landing; corrección ronda 2: al pasar categorías a `UpcomingEventsSection`, mapear `MOCK_CATEGORIES` a solo los campos serializables que ese componente ya acepta tras su corrección, sin el `icon`)
  - `app/layout.tsx` (modificar — metadata "Ticketera" + `SiteNavbar`/`SiteFooter` envolviendo `children`, conserva el wiring de Geist Sans/Mono)
  - `__tests__/page.test.tsx` (eliminar — corrección ronda 2: era el test del boilerplate de create-next-app, quedó huérfano al reemplazar `app/page.tsx`; `docs/SETUP.md` 3.2 no exige test para una página que solo compone)
- Depende de: T1, T5
- Grupo paralelo: G4
- Cubre: AC-1, AC-3, AC-10
- Tests: no aplica (componentes presentacionales y página de composición — SETUP.md 3.2)
- [ ] Completada

## Notas para fases siguientes (no bloqueantes en esta spec)
- `EventCard` y `HeroCarousel` resuelven el nombre de categoría importando `MOCK_CATEGORIES` directamente en vez de recibir `categories` como prop (hallazgo `minor/spec` del reviewer en T5). Válido mientras todo sea mock estático; cuando el catálogo/detalle (fases 2-3) reemplace el mock por datos reales, evaluar si conviene que reciban `categories` como prop para desacoplarlos de `modules/events/data/events.mock`.

## Fases siguientes
- Fase 2: catálogo de eventos con sidebar de filtros (categoría, ciudad, fecha, precio) y orden.
- Fase 3: detalle de evento (hero + info + selector de zonas de entradas + sidebar de compra).
- Fase 4: selección de zona/asientos (venue map SVG propio) + paso 1 de checkout.
- Fase 5: checkout paso 2 (datos y pago) + paso 3 (confirmación con QR estilo "ticket stub").
- Fase 6: auth UI (login/registro, split screen, solo UI).
- Fase 7: "Mis entradas".
- Fase 8: dashboard de organizador (baja prioridad).
