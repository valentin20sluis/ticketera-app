# Landing page de la Ticketera

Estado: approved

## Objetivo
Construir la primera etapa de la Ticketera (venta de entradas a eventos): la landing (`/`) solo con UI y datos mock, sin backend. Al mismo tiempo se deja definido el sistema de diseño en código (tokens, Poppins, componentes shadcn instalados y componentes compartidos) para que crear las siguientes pages sea rápido. Diseño de referencia aprobado: `docs/design-system.md`.

## Fuera de alcance
- Autenticación: los botones "Iniciar sesión" y "Crear cuenta" se renderizan pero no hacen nada.
- Checkout, carrito, pagos, y la página de detalle de evento (`/events/[slug]`) y de listado (`/events`). Los enlaces hacia esas rutas existen como contrato futuro y dan 404 hasta que se construyan.
- Backend, API, `axios`, `@tanstack/react-query`, `zustand`, `zod`: no se cablean en esta spec.
- Modo oscuro, i18n (los textos van fijos en español), SEO avanzado (sitemap, JSON-LD, Open Graph por evento).
- Que el buscador (texto, ciudad, fecha) filtre resultados: en esta fase es solo UI.
- `EventCardSkeleton` y estados de carga/error: no hay carga real con datos mock.
- Mover `SiteHeader`/`SiteFooter` a un layout compartido: se hará cuando exista la segunda page.
- Pruebas end-to-end y tests de componentes de UI (ver "Tests" en cada tarea).

## Reutilización
- Existente que se reutiliza: `components/ui/button.tsx` — CTAs y acciones, sin modificarlo. Es Base UI: para que un botón sea enlace se usa la prop `render` (`<Button render={<Link href="..." />} nativeButton={false}>`), no `asChild`. Sus tamaños (`h-8`, `h-9`) no llegan a 44 px: las áreas táctiles se resuelven con `className` (`h-11`, `size-11`), no editando el archivo.
- Existente que se reutiliza: `lib/utils.ts` — `cn` para clases condicionales.
- Existente que se extiende: `app/globals.css` — tokens claros del design system, se elimina el bloque `.dark`.
- Existente que se extiende: `app/layout.tsx` — Poppins en vez de Geist, `lang="es"`, metadata real.
- Existente que se reemplaza: `app/page.tsx` — el contenido de plantilla de create-next-app se sustituye por la landing.
- Nuevo (no existe nada equivalente en el repo, que solo tiene `button.tsx` y `cn`): `components/shared/*`, `modules/events/*`, `lib/formatters.ts`, `hooks/usePrefersReducedMotion.ts` (`hooks/` es el alias ya declarado en `components.json`), `public/images/events/*`.
- **Preparación del orquestador, antes de despachar cualquier tarea** (tocan archivos compartidos: `components/ui/`, `package.json`, lockfile):
  1. `npx shadcn@latest add card badge input select tabs carousel skeleton sheet separator` (sin `--overwrite`: si el CLI pregunta por sobrescribir `button.tsx`, responder que no). `skeleton` no se usa en esta fase; se instala porque el design system lo lista y queda disponible para las próximas pages.
  2. `npm install embla-carousel-autoplay` (plugin oficial de Embla para el carrusel del hero; debe ser compatible con la versión de `embla-carousel-react` que instale shadcn). No se instala Swiper ni otra librería de iconos.
  3. Si el CLI modifica `app/globals.css`, T1 conserva esas adiciones (excepto todo lo relativo a dark).
  4. Los componentes generados en `components/ui/` no se editan a mano. Antes de usarlos, revisar su API real (Base UI: `Tabs` `value`/`onValueChange`, `Select` con `items`, `Sheet` requiere `SheetTitle`, etc.).

## Criterios de aceptación

**Sistema de diseño**
- AC-1 (solo modo claro): `app/globals.css` no contiene el bloque `.dark { ... }`. Se conserva la línea `@custom-variant dark (&:is(.dark *));` (ver nota 1 al final), que nunca se activa porque nada añade la clase `dark`. `app/layout.tsx` exporta `viewport` con `colorScheme: "light"`. Con el navegador emulando `prefers-color-scheme: dark`, la página se ve idéntica al modo claro.
- AC-2 (tokens): los valores de `:root` en `app/globals.css` coinciden exactamente con la tabla de la sección 2 de `docs/design-system.md` (primary `#2563EB`, accent `#047857`, background `#F8FAFC`, etc.), `--popover` y `--popover-foreground` igual que card, y `--radius: 0.75rem`. Los tokens sidebar y chart pueden quedar como están. No hay hex literales ni clases `dark:` en los `.tsx` propios: `grep -rE "#[0-9a-fA-F]{3,8}\b" app components/shared modules hooks --include=*.tsx` no devuelve coincidencias (los colores se usan con clases semánticas: `bg-primary`, `text-muted-foreground`, etc.).
- AC-3 (tipografía): `app/layout.tsx` carga `Poppins` desde `next/font/google` con pesos `400, 500, 600, 700`, `subsets: ["latin"]`, `variable: "--font-poppins"` y `display: "swap"`, y lo aplica al `<html>`. En `globals.css`, `--font-sans` y `--font-heading` valen `var(--font-poppins)` (se elimina la referencia circular `--font-sans: var(--font-sans)` y la de `--font-geist-mono`). No queda ninguna referencia a Geist (`grep -ri geist app` vacío). El `font-family` calculado del `body` empieza por Poppins. `<html lang="es">`.
- AC-4 (metadata): `metadata` en `app/layout.tsx` tiene `title` con `default` y `template` (`"%s | Ticketera"`) y una `description` en español sobre venta de entradas a eventos. No queda "Create Next App".
- AC-5 (dependencias): los componentes shadcn `card`, `badge`, `input`, `select`, `tabs`, `carousel`, `skeleton`, `sheet` y `separator` existen en `components/ui/` generados por el CLI; `button.tsx` no cambió; `package.json` solo añade lo que traen esos comandos más `embla-carousel-autoplay`; no aparecen `clsx`, `tailwind-merge`, `swiper` ni otra librería de iconos.

**Landing**
- AC-6 (estructura): `/` muestra, en este orden, las 8 secciones: (1) `SiteHeader` fijo arriba (`sticky top-0`), (2) hero con `HeroCarousel`, (3) `EventSearchBar`, (4) `CategoryTabs` con Todos, Conciertos, Deportes, Teatro, Festivales, Familia, (5) "Eventos destacados" con `EventGrid` filtrada por la categoría activa, (6) "Esta semana" con carrusel, (7) banner "Organiza tu evento", (8) `SiteFooter`. Landmarks: `header`, `nav` (con `aria-label`), un solo `main`, `footer`. Hay exactamente un `h1` (ver nota 3): visualmente oculto (`sr-only`), en `app/page.tsx`, dentro de `main`. Los títulos de sección y de slide son `h2`, y los títulos de tarjeta `h3`. Hay un enlace "Saltar al contenido" que apunta a `#main-content` (visible al recibir foco). Las secciones "Eventos destacados", "Esta semana" y "Organiza tu evento" tienen `id` `events`, `this-week` y `organize`, con `scroll-mt-20` para no quedar tapadas por el header fijo.
- AC-7 (filtro por categoría): por defecto la pestaña activa es "Todos" y la grilla muestra todos los eventos del mock. Al elegir una categoría, la grilla muestra solo los eventos de esa categoría, sin recargar la página. Cada categoría tiene al menos un evento. La lista de pestañas se recorre con las flechas del teclado y tiene `aria-label="Filtrar por categoría"`. El contenedor de resultados tiene `aria-live="polite"`. La lógica de filtrado es la función `filterEventsByCategory` del service (cubierta por tests, AC-18); ningún componente duplica esa lógica.
- AC-8 (hero): `HeroCarousel` muestra los 4 eventos con `featured: true`, cada slide con imagen, título (`h2`), fecha, lugar y botón "Comprar entradas" que enlaza a `getEventPath(slug)`. Solo la primera imagen lleva `priority`; las demás cargan de forma diferida. Todas llevan `sizes`. El texto sobre la imagen va sobre un degradado oscuro (mínimo `black/60` en la zona del texto) para cumplir contraste 4,5:1. El carrusel:
  - tiene botones "Anterior" y "Siguiente" y un botón de pausa/reanudar con `aria-label` que cambia ("Pausar rotación" / "Reanudar rotación") e icono `Pause`/`Play`;
  - rota solo (intervalo 5-7 s, en bucle) y deja de rotar mientras el cursor está encima o hay foco dentro; tras pulsar "Pausar", no se reanuda por mouseleave ni foco hasta pulsar "Reanudar";
  - con `prefers-reduced-motion: reduce` no rota nunca al cargar (el botón muestra "Reanudar rotación") y sigue funcionando con los botones y las flechas del teclado;
  - es una región con nombre accesible ("Eventos destacados") y cada slide con `aria-label` "N de 4";
  - alto fijo por breakpoint (no depende de la imagen) para evitar layout shift.
- AC-9 ("Esta semana"): `EventCarousel` muestra `EventCard` en un carrusel deslizable (arrastre/gesto táctil, botones "Anterior"/"Siguiente", flechas del teclado), sin rotación automática (por eso no lleva botón de pausa; ver nota 4). Los botones se deshabilitan en los extremos. Muestra al menos 5 eventos del mock. Región con `aria-label="Eventos de esta semana"`. Se ve 1,15 tarjetas aprox. en móvil (para sugerir deslizamiento), 2 en `sm` y 4 en `lg`.
- AC-10 (`EventCard`): imagen 4:3 con `next/image` (`fill` + `sizes` + `object-cover`), badge de categoría arriba a la izquierda sobre la imagen, título (máx. 2 líneas con `line-clamp-2`), fecha con icono `CalendarDays` (formato de `formatDateTime`), lugar con icono `MapPin` (`venue, city`) y pie con "Desde" en texto atenuado seguido de {formatPrice(minPrice)} en `text-lg font-semibold`, el estado, un latido de 4 s cuando el estado es `low-stock` (`HeartbeatOnView`: se repite cada vez que la tarjeta vuelve a entrar en pantalla y se anula con `motion-reduce`) y un botón visual "Ver entradas" de ancho completo y 44 px, transparente con borde oscuro (`variant="outline"`, `border-foreground`) (añadido después de la revisión; es `aria-hidden` porque el enlace único de la tarjeta ya lo cubre, y no se muestra en eventos `sold-out`). Estados: `available` → "Disponible" en `text-accent`; `low-stock` → "Últimas entradas" en `text-accent` con `font-semibold`; `sold-out` → "Agotado" en `text-destructive`. La tarjeta tiene un único enlace a `getEventPath(slug)` cuyo nombre accesible es el título (patrón de enlace extendido sobre toda la tarjeta), con foco visible (`focus-visible`/`focus-within` con anillo `ring`). Hover: `shadow-sm` → `shadow-md` y zoom de imagen `scale-105` a 300 ms con `motion-reduce` que lo anula. Los iconos llevan `aria-hidden="true"`.
- AC-11 (`EventSearchBar`): cuatro controles con etiqueta accesible (texto: `Input`; ciudad: `Select`, primera opción "Todas las ciudades" seguida de las ciudades de `getEventCities()`; fecha: `Input type="date"`; precio: `Select` con "Cualquier precio", "Hasta S/ 50", "S/ 50 a S/ 100" y "Más de S/ 100", añadido después de la revisión) y botón "Buscar" con icono `Search`. Es un `<form role="search">` cuyo submit hace `preventDefault` y no recarga ni navega. En 375 px los controles se apilan; en `md` van de dos en dos; desde `lg` van en una fila.
- AC-12 (header, footer, CTA):
  - `SiteHeader`: logo (icono `Ticket` + texto "Ticketera", enlace a `/`), navegación de escritorio con enlaces reales a `#events`, `#this-week` y `#organize` (este último con la utilidad `rotating-border`: borde de 3 px con un arco brillante que orbita 3 vueltas en 5 s y luego se completa en azul y descansa 6 s, en bucle, estático con `prefers-reduced-motion`; añadido después de la revisión), botones "Iniciar sesión" (`ghost`) y "Crear cuenta" (`default`) sin acción. En menos de `md` la navegación pasa a un `Sheet` abierto por un botón con icono `Menu` y `aria-label="Abrir menú"`; el `Sheet` tiene `SheetTitle`, repite los mismos enlaces (definidos en una sola constante, DRY) y se cierra al elegir un enlace.
  - `SiteFooter`: marca con descripción breve; columnas de enlaces (Descubre, Ayuda con "Libro de reclamaciones", Síguenos con Instagram, Facebook, TikTok y YouTube como texto, sin iconos de marca porque `lucide-react` no los incluye); métodos de pago como `Badge` de texto (Visa, Mastercard, Yape, Plin); `Separator`; copyright con el año actual. Los enlaces cuyo destino no existe apuntan a `#` (aceptado solo en el footer).
  - `CtaBanner` "Organiza tu evento": fondo `bg-primary text-primary-foreground`, título, descripción y botón `secondary` con texto en español.
  - `SectionHeader`: título `h2` y, si recibe `actionHref`, enlace "Ver todo" (con `aria-label="Ver todo: {título}"`). En la landing se usa en "Eventos destacados" y "Esta semana" con `actionHref="/events"`.
- AC-13 (responsive): a 375 px no hay scroll horizontal de la página. La grilla de `EventGrid` es 1 columna (base), 2 (`sm`), 4 (`lg`) con `gap-4 md:gap-6`. Las pestañas de categoría hacen scroll horizontal propio en móvil. El contenedor usa `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8` desde un único componente `Container`, y las secciones `py-12 md:py-16`.
- AC-14 (movimiento reducido): todo `transition`/`animate`/`scale` propio lleva su contraparte `motion-reduce:`. Las transiciones solo afectan `transform`, `opacity` y color, con 150-300 ms `ease-out`. `html` solo aplica `scroll-behavior: smooth` dentro de `@media (prefers-reduced-motion: no-preference)`. El hook `usePrefersReducedMotion` es el único punto que lee la media query.
- AC-15 (accesibilidad): los pares texto/fondo usados cumplen 4,5:1 (los de la sección 2 del design system; el texto sobre el estado resaltado de las opciones del `Select`, que usa `accent`, debe seguir siendo legible). Todo elemento interactivo propio tiene foco visible. Áreas táctiles de al menos 44×44 px (`h-11`/`size-11`/`min-h-11`) en: botones del header, botón de menú, triggers de las pestañas, botones anterior/siguiente/pausa de ambos carruseles, controles del buscador, botón de CTA y "Comprar entradas". Los botones solo con icono tienen `aria-label`. Los iconos decorativos, `aria-hidden="true"`. Todo funciona solo con teclado (header, sheet, tabs, carruseles, tarjetas, buscador).

**Datos, imágenes y utilidades**
- AC-16 (imágenes): existen exactamente 12 archivos en `public/images/events/` con los nombres de la tabla de T2, en JPG o WebP, ancho entre 1200 y 1600 px, apaisados y ≤ 400 KB cada uno. Provienen de Unsplash o Pexels (licencias libres), sin logos ni marcas visibles, y no hay URLs externas de imágenes en el código. Todas se muestran con `next/image` (ningún `<img>`).
- AC-17 (créditos): la tabla de la sección 12 de `docs/design-system.md` reemplaza la fila `_(pendiente)_` por 12 filas (una por archivo) con autor, URL de la foto en la fuente y licencia (`Unsplash License` o `Pexels License`).
- AC-18 (mock y service): `event.mock.ts` define 12 eventos ficticios (sin marcas ni artistas reales) con `id` y `slug` únicos, `imageSrc` que apunta a un archivo existente en `public/`, `imageAlt` descriptivo no vacío, al menos 2 eventos por categoría, 4 con `featured: true` (de al menos 3 categorías), 6 con fecha dentro de los próximos 7 días, al menos 1 `sold-out` y 2 `low-stock`. Las fechas se generan relativas al momento de carga del módulo (helper `daysFromNow`) para que "Esta semana" no quede vacío. `event.service.ts` cumple el contrato de T3. Todo lo anterior lo comprueban los tests de `event.service.test.ts`.
- AC-19 (formatters): `formatPrice(80)` → `"S/ 80"`, `formatPrice(80.5)` → `"S/ 80.50"`, `formatPrice(1200)` → `"S/ 1,200"`. `formatDateTime(iso)` devuelve `"<día abreviado> <día> <mes abreviado> · HH:mm"` (ej. `"sáb 14 mar · 20:30"`) en zona `America/Lima` y formato 24 h, independiente de la zona horaria del proceso (`"2026-03-15T01:30:00.000Z"` es 14 de marzo 20:30 en Lima).

**Calidad**
- AC-20 (estructura): rutas, naming y capas según `docs/SETUP.md`. `app/page.tsx` solo compone piezas y obtiene datos del service. `"use client"` solo en `CategoryTabs`, `FeaturedEvents`, `EventSearchBar`, `HeroCarousel`, `EventCarousel`, `usePrefersReducedMotion` y `HeartbeatOnView` (añadido después de la revisión). Los componentes no importan nunca `event.mock.ts` (solo lo hace el service). No se usa `axios`, React Query, zustand ni zod.
- AC-21 (idioma): todos los textos visibles y `aria-label` están en español; nombres de archivos, carpetas, variables y tipos, en inglés.
- AC-22 (verificación): `npm run lint`, `npm run build` y `npx vitest run` terminan sin errores.

## Tareas

### T1 — Tokens, Poppins, layout y formatters
- Archivos: `app/globals.css` (modificar), `app/layout.tsx` (modificar), `lib/formatters.ts` (crear), `lib/formatters.test.ts` (crear)
- Depende de: ninguna (requiere la preparación del orquestador de "Reutilización")
- Grupo paralelo: G1
- Cubre: AC-1, AC-2, AC-3, AC-4, AC-14 (regla de `scroll-behavior`), AC-19
- Detalles:
  - `globals.css`: sustituir los valores de `:root` por los de la sección 2 del design system, ajustar `--radius`, eliminar `.dark`, conservar `@custom-variant dark (&:is(.dark *))`, corregir `--font-sans`/`--font-heading` a `var(--font-poppins)` y quitar `--font-mono` de Geist. Añadir `scroll-behavior: smooth` solo bajo `prefers-reduced-motion: no-preference`.
  - `layout.tsx`: Poppins, `lang="es"`, `metadata` (título y descripción reales), `export const viewport: Viewport = { colorScheme: "light" }`. Mantener el tipo `LayoutProps<"/">` y las clases `h-full antialiased` / `min-h-full flex flex-col`. Consultar `node_modules/next/dist/docs/01-app/03-api-reference/02-components/font.md` y `.../04-functions/generate-viewport.md`.
  - `formatters.ts`: `formatPrice(amount: number): string` y `formatDateTime(iso: string): string` según AC-19.
- Tests: `lib/formatters.test.ts` — `formatPrice` con entero, decimal y miles; `formatDateTime` con una fecha que cruza medianoche UTC (día de Lima distinto al día UTC), con una hora de tarde (formato 24 h) y verificando que el resultado incluye día, mes abreviado y `HH:mm` (assertions por regex, sin depender del espacio o punto exacto que emita ICU).
- [x] Completada (el lint de `components/ui/carousel.tsx` se resolvió con un override puntual en `eslint.config.mjs`, ver nota 7)

### T2 — Imágenes de eventos y créditos
- Archivos (12 activos binarios, que cuentan como un solo conjunto de datos, más 1 documento): `public/images/events/rock-concert-crowd.jpg`, `acoustic-live-band.jpg`, `orchestra-concert-hall.jpg`, `festival-main-stage.jpg`, `electronic-dj-night.jpg`, `football-stadium-night.jpg`, `marathon-runners-city.jpg`, `basketball-court-game.jpg`, `theater-stage-curtain.jpg`, `theater-play-actors.jpg`, `family-circus-show.jpg`, `kids-puppet-show.jpg` (todas en `public/images/events/`, crear); `docs/design-system.md` (modificar solo la tabla de la sección 12)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-16, AC-17
- Detalles:
  - Reparto por categoría (guía para el mock): conciertos = `rock-concert-crowd`, `acoustic-live-band`, `orchestra-concert-hall`; festivales = `festival-main-stage`, `electronic-dj-night`; deportes = `football-stadium-night`, `marathon-runners-city`, `basketball-court-game`; teatro = `theater-stage-curtain`, `theater-play-actors`; familia = `family-circus-show`, `kids-puppet-show`.
  - Descargar solo de Unsplash o Pexels, con `curl` o similar, usando los parámetros de tamaño de cada CDN (ej. `?w=1600&q=80&fm=jpg` en Unsplash, `?auto=compress&w=1600` en Pexels). Preferir imágenes sin rostros identificables de menores (en las de familia, de espaldas o en plano general) y sin logos ni texto de marcas.
  - Registrar por cada archivo el autor, la URL de la página de la foto y la licencia. Reportar cualquier archivo que deba cambiar de sujeto o de nombre, para que T3 use el nombre y el `alt` reales.
  - Verificar el ancho y el peso finales (AC-16).
- Tests: no aplica (activos estáticos y documentación; se verifican con AC-16 y AC-17).
- [x] Completada

### T3 — Capa de datos de `events` (tipos, mock, service)
- Archivos: `modules/events/types/event.types.ts` (crear), `modules/events/data/event.mock.ts` (crear), `modules/events/services/event.service.ts` (crear), `modules/events/services/event.service.test.ts` (crear)
- Depende de: T2 (los `imageSrc` e `imageAlt` deben corresponder a las fotos reales descargadas)
- Grupo paralelo: G2
- Cubre: AC-7 (lógica de filtrado), AC-18
- Detalles:
  - `event.types.ts` (contrato que consumen T5 y T6):
    ```ts
    export const EVENT_CATEGORIES = [
      { value: "concerts", label: "Conciertos" },
      { value: "sports", label: "Deportes" },
      { value: "theater", label: "Teatro" },
      { value: "festivals", label: "Festivales" },
      { value: "family", label: "Familia" },
    ] as const;
    export type EventCategory = (typeof EVENT_CATEGORIES)[number]["value"];
    export type EventCategoryFilter = "all" | EventCategory;
    export type EventStatus = "available" | "low-stock" | "sold-out";
    export interface TicketEvent {
      id: string;
      slug: string;
      title: string;
      category: EventCategory;
      imageSrc: string;   // "/images/events/<file>"
      imageAlt: string;
      startsAt: string;   // ISO 8601 UTC
      venue: string;
      city: string;
      minPrice: number;   // soles peruanos
      status: EventStatus;
      featured: boolean;
    }
    ```
    (Se llama `TicketEvent` y no `Event` para no chocar con el `Event` global del DOM.)
  - `event.mock.ts`: `export const eventsMock: TicketEvent[]` cumpliendo AC-18. Ciudades peruanas (Lima, Arequipa, Cusco, Trujillo, etc.), al menos 3 ciudades distintas, títulos y lugares ficticios.
  - `event.service.ts` (funciones async devuelven `Promise` para que la sustitución por una API no cambie las firmas; las puras son síncronas):
    - `getEvents(): Promise<TicketEvent[]>` — todos, ordenados por `startsAt` ascendente.
    - `getFeaturedEvents(): Promise<TicketEvent[]>` — los `featured: true`.
    - `getThisWeekEvents(now?: Date): Promise<TicketEvent[]>` — `startsAt` en `[now, now + 7 días)`, ascendente; `now` por defecto `new Date()`.
    - `getEventCities(): Promise<string[]>` — ciudades únicas, ordenadas alfabéticamente.
    - `filterEventsByCategory(events: TicketEvent[], category: EventCategoryFilter): TicketEvent[]` — `"all"` devuelve todos; si no, solo los de esa categoría; conserva el orden y no muta el arreglo de entrada.
    - `getEventPath(slug: string): string` — `"/events/<slug>"`.
- Tests: `event.service.test.ts` — filtro: `"all"` devuelve todo, cada categoría devuelve solo las suyas, conserva el orden, no muta la entrada, categoría sin eventos devuelve `[]` (con fixtures propios); `getEvents` ordenado y sin `id`/`slug` repetidos; `getFeaturedEvents` devuelve 4; `getThisWeekEvents` respeta la ventana con un `now` inyectado (incluye borde inferior, excluye borde superior) y devuelve ≥ 5 con el `now` por defecto; `getEventCities` únicas y ordenadas; `getEventPath`; invariantes del mock (≥ 1 evento por categoría, `imageSrc` existe en `public/` con `fs.existsSync`, `imageAlt` no vacío, al menos 1 `sold-out` y 2 `low-stock`).
- [x] Completada

### T4 — Componentes compartidos (`components/shared/`)
- Archivos: `components/shared/Container.tsx` (crear), `components/shared/SiteHeader.tsx` (crear), `components/shared/SiteFooter.tsx` (crear), `components/shared/SectionHeader.tsx` (crear), `components/shared/CtaBanner.tsx` (crear)
- Depende de: T1 (tokens y fuente)
- Grupo paralelo: G2
- Cubre: AC-12, AC-13 (contenedor), AC-15 (áreas táctiles y foco del header/footer/CTA)
- Detalles:
  - `Container`: `div` con `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`; acepta `className` y `children` (los del `div` mediante `ComponentProps<"div">`).
  - `SiteHeader` (componente de servidor: usa `Sheet` de shadcn, que ya es cliente; no necesita `"use client"` propio, salvo que la API real de Base UI lo exija; en ese caso, extraer la parte interactiva). Incluye el enlace "Saltar al contenido" a `#main-content`, `Separator` si aporta. Botón del menú y de sesión con `className="h-11"` (o `size-11` el de solo icono).
  - `SiteFooter`, `SectionHeader({ title, actionHref? })`, `CtaBanner({ title, description, actionLabel, actionHref })` según AC-12. Enlaces con `next/link`.
- Tests: no aplica (componentes puramente presentacionales; SETUP.md 3.2).
- [x] Completada

### T5 — Componentes de `events` que muestran listas (tarjeta, grilla, filtro y carrusel semanal)
- Archivos: `modules/events/components/EventCard.tsx` (crear), `modules/events/components/EventGrid.tsx` (crear), `modules/events/components/CategoryTabs.tsx` (crear), `modules/events/components/FeaturedEvents.tsx` (crear), `modules/events/components/EventCarousel.tsx` (crear)
- Depende de: T1 (`formatters`), T3 (tipos y service)
- Grupo paralelo: G3
- Cubre: AC-7, AC-9, AC-10, AC-14, AC-15
- Detalles:
  - `EventCard({ event, priority? })`: sin `"use client"`; usa `Card`, `Badge`, `next/image`, `next/link`, `formatDateTime`, `formatPrice`, `getEventPath` y la etiqueta de `EVENT_CATEGORIES`. Sin lógica de negocio.
  - `EventGrid({ events })`: `ul` con `EventCard` por `li`, grilla de AC-13.
  - `CategoryTabs({ value, onValueChange })`: cliente; `Tabs` de shadcn con "Todos" + `EVENT_CATEGORIES`; triggers de al menos 44 px de alto; scroll horizontal en móvil sin desbordar la página.
  - `FeaturedEvents({ events })`: cliente; guarda la categoría activa (`useState<EventCategoryFilter>("all")`), calcula `filterEventsByCategory(events, category)` y renderiza `SectionHeader` ("Eventos destacados", `actionHref="/events"`), `CategoryTabs` y `EventGrid` dentro del contenedor `aria-live="polite"`. No usa `useEffect` ni estado derivado duplicado.
  - `EventCarousel({ events, "aria-label" })`: cliente; usa `Carousel`/`CarouselContent`/`CarouselItem`/`CarouselPrevious`/`CarouselNext` de shadcn con `opts={{ align: "start", dragFree: true }}`, botones de 44 px, sin autoplay.
- Tests: no aplica (composición de shadcn sin lógica propia; el filtrado se prueba en `event.service.test.ts` de T3, SETUP.md 3.2).
- [x] Completada

### T6 — Hero, buscador, hook de movimiento reducido y composición de la landing
- Archivos: `modules/events/components/HeroCarousel.tsx` (crear), `modules/events/components/EventSearchBar.tsx` (crear), `hooks/usePrefersReducedMotion.ts` (crear), `hooks/usePrefersReducedMotion.test.ts` (crear), `app/page.tsx` (modificar)
- Depende de: T1, T3, T4, T5
- Grupo paralelo: G4
- Cubre: AC-6, AC-8, AC-11, AC-13, AC-14, AC-15, AC-20, AC-21, AC-22
- Detalles:
  - `usePrefersReducedMotion(): boolean` con `useSyncExternalStore` sobre `matchMedia("(prefers-reduced-motion: reduce)")` (snapshot de servidor `false`).
  - `HeroCarousel({ events })`: cliente; `Carousel` con `opts={{ loop: true }}` y el plugin `embla-carousel-autoplay` (retraso 6 s, se detiene con `mouseenter` y `focusin`); el plugin solo se activa si `usePrefersReducedMotion()` es `false`. Estado propio de "pausado por el usuario" y botones anterior/siguiente/pausa según AC-8. Primera slide con `priority`. Como `Embla` no funciona bien en jsdom, la interacción se valida en el navegador durante la revisión, no con test unitario.
  - `EventSearchBar({ cities })`: cliente, según AC-11.
  - `app/page.tsx`: `async` componente de servidor. Obtiene `getFeaturedEvents()`, `getEvents()`, `getThisWeekEvents()` y `getEventCities()` en paralelo (`Promise.all`) y compone: `SiteHeader`, `<main id="main-content">` con `h1` `sr-only`, hero, buscador, `FeaturedEvents`, sección "Esta semana" (`SectionHeader` + `EventCarousel`), `CtaBanner` y luego `SiteFooter`. Cada sección va en un `<section>` con su `id`/`scroll-mt-20`/`py-12 md:py-16` dentro de `Container`. Se elimina el contenido de plantilla de create-next-app. No se borran los SVG de plantilla en `public/` (fuera de alcance).
  - Verificación final antes de cerrar: recorrer la página a 375 px, 768 px y 1280 px, comprobar en el navegador AC-6 a AC-15 y ejecutar `npm run lint`, `npm run build`, `npx vitest run`.
- Tests: `hooks/usePrefersReducedMotion.test.ts` — con `window.matchMedia` simulado devuelve `true`/`false` según `matches`; reacciona al evento `change`; retira el listener al desmontar (usar `renderHook`). Para `HeroCarousel`, `EventSearchBar` y `page.tsx`: no aplica (presentacionales/composición, SETUP.md 3.2).
- [x] Completada

## Grupos paralelos
- G1: T1, T2 (archivos disjuntos)
- G2: T3 (tras T2), T4 (tras T1) (archivos disjuntos)
- G3: T5
- G4: T6

## Fases siguientes
- Fase 2: página de detalle de evento (`/events/[slug]`) y listado (`/events`), y que el buscador filtre de verdad.
- Fase 3: mover `SiteHeader`/`SiteFooter` a un layout compartido, `EventCardSkeleton` y estados de carga/error, y sustituir `event.service.ts` por API con axios y React Query.
- Fase 4: autenticación y checkout.

## Notas para el revisor y el orquestador (divergencias con `docs/design-system.md`)
1. Solo modo claro: la sección 1 del design system pide eliminar también `@custom-variant dark`. En Tailwind v4, sin esa línea, la variante `dark:` cae al media query `prefers-color-scheme`, y los componentes generados por shadcn traen clases `dark:` (p. ej. en `button.tsx`) que se activarían en sistemas operativos en modo oscuro, mezclando tokens claros con estilos oscuros. Por eso se conserva la línea (inactiva, porque nadie pone `.dark`), se elimina el bloque `.dark` y se añade `colorScheme: "light"`. Si se prefiere seguir el documento al pie de la letra, hay que quitar además las clases `dark:` de `components/ui/*`, lo que contradice "no editar a mano".
2. Header: el design system (7.2) lista buscador y ciudad en `SiteHeader`, pero la landing ya tiene `EventSearchBar` (sección 3) con esos mismos controles. Para no duplicarlos en la misma pantalla, el header no los incluye en esta fase.
3. `h1`: el design system pide un único `h1`, "el título del hero". Como el hero tiene 4 slides con títulos distintos, un `h1` por slide daría 4. Se usa un `h1` oculto en la page y `h2` en las slides.
4. Pausa: el design system pide botones anterior/siguiente y pausa en los carruseles. Solo el hero rota solo; "Esta semana" es manual, y un botón de pausa sin nada que pausar sería ruido (YAGNI).
5. Los enlaces a `/events` y `/events/[slug]` dan 404 hasta la fase 2. Lo mismo ocurre con el botón del `CtaBanner` "Organiza tu evento", que apunta a `/organize` (ruta futura no prevista originalmente).
7. `components/ui/carousel.tsx` (generado por shadcn) llama a `setState` dentro de un efecto y `npm run lint` fallaba con `react-hooks/set-state-in-effect`. Como `components/ui/` no se edita a mano, se añadió un override en `eslint.config.mjs` que apaga esa regla solo para ese archivo.
6. Dado que T2 tiene 12 activos binarios, supera de forma literal el límite de 5 archivos por tarea; se trata como una sola unidad de datos (una responsabilidad, sin código).
