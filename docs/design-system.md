# Design System: Ticketera

Documento de diseño de la Ticketera (venta de entradas a eventos). Es la referencia visual para la landing y para todas las pages futuras. Referencias visuales: Ticketmaster y Joinnus. Recomendaciones de base: skill `ui-ux-pro-max` (patrón "Hero-Centric + Feature-Rich", paleta "Calendar & Scheduling" adaptada, guías de shadcn y Next.js).

Si algo de este documento choca con `docs/SETUP.md`, manda `docs/SETUP.md`.

---

## 1. Principios

- **Solo modo claro.** No hay variante oscura: se elimina el bloque `.dark` de `app/globals.css` y se fija `colorScheme: "light"` en `viewport`. Se conserva la línea `@custom-variant dark`: sin ella, Tailwind v4 activaría las clases `dark:` de los componentes shadcn según el tema del sistema operativo.
- **Moderno, no sobrecargado.** Mucho aire, una sola familia tipográfica, un color primario y un acento. Las imágenes de los eventos son las protagonistas.
- **Móvil primero.** Se diseña desde 375 px hacia arriba.
- **Reutilizar antes de crear.** Primero shadcn, luego `components/shared/`, y solo al final un componente nuevo (ver `docs/SETUP.md` sección 2.3).

## 2. Color

Los tokens viven en `app/globals.css` como variables CSS de shadcn y se exponen a Tailwind v4 con `@theme inline`. En los componentes se usan clases semánticas (`bg-primary`, `text-muted-foreground`), nunca hex sueltos.

| Token shadcn | Valor | Uso |
|---|---|---|
| `--primary` | `#2563EB` | Botones principales, enlaces, chips activos |
| `--primary-foreground` | `#FFFFFF` | Texto sobre primario (contraste 5,2:1) |
| `--secondary` | `#EFF4FF` | Botones secundarios, chips inactivos |
| `--secondary-foreground` | `#1E3A8A` | Texto sobre secundario |
| `--accent` | `#047857` | Disponibilidad, "entradas disponibles", confirmaciones |
| `--accent-foreground` | `#FFFFFF` | Texto sobre acento (contraste 5,5:1) |
| `--background` | `#F8FAFC` | Fondo de página |
| `--foreground` | `#0F172A` | Texto principal |
| `--card` | `#FFFFFF` | Tarjetas, header, popovers |
| `--card-foreground` | `#0F172A` | Texto en tarjetas |
| `--muted` | `#F1F5FD` | Fondos suaves, skeletons |
| `--muted-foreground` | `#475569` | Texto secundario (contraste 7:1) |
| `--border` / `--input` | `#E4ECFC` | Bordes e inputs |
| `--ring` | `#2563EB` | Anillo de foco |
| `--destructive` | `#DC2626` | Agotado y errores |

Notas:
- El verde `#059669` de la base de datos de la skill se cambió a `#047857` porque con texto blanco el original no llega a 4,5:1.
- El color nunca es el único portador de significado: "Agotado" lleva texto además de rojo.

## 3. Tipografía

- **Familia única: Poppins**, para todo el proyecto (títulos, cuerpo, botones, números). Se carga con `next/font/google` en `app/layout.tsx` (pesos 400, 500, 600, 700, `subsets: ["latin"]`, `variable: "--font-poppins"`). Reemplaza a Geist y Geist Mono.
- Se enlaza en `globals.css` con `--font-sans: var(--font-poppins)` y `--font-heading: var(--font-poppins)`.
- Escala (móvil → escritorio):

| Uso | Clases | Peso |
|---|---|---|
| Hero título | `text-3xl md:text-5xl` | 700 |
| Título de sección | `text-2xl md:text-3xl` | 600 |
| Título de tarjeta | `text-base md:text-lg` | 600 |
| Cuerpo | `text-base` (16 px, interlineado 1,5) | 400 |
| Texto secundario / meta | `text-sm` | 400–500 |
| Etiquetas y badges | `text-xs` | 500–600 |

Ningún texto de cuerpo por debajo de 14 px.

## 4. Espaciado, forma y elevación

- Contenedor: `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8`.
- Separación vertical entre secciones: `py-12 md:py-16`.
- Grilla base de 4 px (escala de Tailwind). Entre tarjetas: `gap-4 md:gap-6`.
- Radio base `--radius: 0.75rem`. Tarjetas `rounded-xl`, botones e inputs `rounded-lg`, badges y chips `rounded-full`.
- Elevación: `shadow-sm` en reposo, `shadow-md` al pasar el cursor en tarjetas. Sin sombras pesadas.
- Breakpoints de Tailwind por defecto (`sm 640`, `md 768`, `lg 1024`, `xl 1280`).

## 5. Movimiento

- Transiciones de 150–250 ms con `ease-out`, solo sobre `transform`, `opacity` y color (nunca `width`/`height`).
- Hover de tarjeta: elevación sutil y zoom de imagen `scale-105` a 300 ms.
- El enlace "Organiza tu evento" del header lleva un borde de 3 px con un arco brillante primario-acento que orbita sobre un aro tenue: tres vueltas en 5 s, y al terminar el aro se completa en azul (primario) y descansa 6 s, en bucle de 11 s (utilidad `rotating-border` en `app/globals.css`).
- Las tarjetas con "Últimas entradas" laten (`animate-heartbeat`, 4 s, escala máx. 1,04) cada vez que entran en pantalla al hacer scroll, mediante `components/shared/HeartbeatOnView`.
- Todo movimiento se desactiva con `prefers-reduced-motion` (`motion-reduce:` en Tailwind).
- Todo carrusel lleva botones anterior/siguiente. Solo el que rota solo (el hero) lleva además un botón de pausa; los manuales no. La rotación automática se detiene con foco, hover y reduced motion, y con reduced motion nunca arranca al cargar.

## 6. Iconos

- Librería: `lucide-react` (ya instalada). No se agrega otra.
- Tamaños: 16 px en texto, 20 px en botones, 24 px en navegación.
- Los iconos decorativos llevan `aria-hidden="true"`. Un botón solo con icono lleva `aria-label`.
- Prohibido usar emojis como iconos.

## 7. Componentes

### 7.1 shadcn/ui (instalar con `npx shadcn@latest add <name>`; el estilo es `base-nova` sobre Base UI)

| Componente | Uso |
|---|---|
| `button` (ya existe) | CTAs y acciones |
| `card` | Tarjeta de evento (composición `Card` + `CardContent` + `CardFooter`) |
| `badge` | Categoría, "Agotado", "Últimas entradas" |
| `input` | Búsqueda de eventos |
| `select` | Selector de ciudad |
| `tabs` | Filtro por categoría |
| `carousel` | Hero y fila "Esta semana" (basado en Embla, sin Swiper) |
| `skeleton` | Estados de carga con las mismas dimensiones que el contenido |
| `sheet` | Menú móvil |
| `separator` | Divisores en footer y header |

Antes de usar un componente, se revisa su API en `components/ui/`: al ser Base UI, difiere de los ejemplos con Radix.

### 7.2 Compartidos (`components/shared/`)

| Componente | Responsabilidad |
|---|---|
| `Container` | Ancho máximo y márgenes laterales de todas las secciones |
| `SiteHeader` | Skip link, logo, navegación, botones de sesión, menú móvil. El buscador y la ciudad viven en `EventSearchBar`, no en el header |
| `SiteFooter` | Enlaces, redes, métodos de pago |
| `SectionHeader` | Título de sección + enlace "Ver todo" |
| `CtaBanner` | Banner de llamada a la acción sobre fondo primario |

### 7.3 De dominio (`modules/events/`)

```
modules/events/
  components/
    EventCard.tsx          # imagen, badge de categoría, título, fecha, lugar, precio desde
    EventGrid.tsx          # grilla responsive de EventCard
    HeroCarousel.tsx       # eventos destacados, con autoplay y pausa
    EventCarousel.tsx      # fila deslizable manual ("Esta semana")
    CategoryTabs.tsx       # filtro por categoría
    FeaturedEvents.tsx     # sección "Eventos destacados": tabs + grilla filtrada
    EventSearchBar.tsx     # texto + ciudad + fecha (solo UI)
  data/
    event.mock.ts          # datos de ejemplo
  services/
    event.service.ts       # devuelve los mocks; luego se reemplaza por la API
  types/
    event.types.ts
```

## 8. Estructura de la landing (`app/page.tsx`)

`app/page.tsx` solo compone piezas. Orden de secciones:

1. `SiteHeader` (fijo arriba)
2. Hero: `HeroCarousel` con 4 eventos destacados, título, fecha, lugar y botón "Comprar entradas"
3. `EventSearchBar` (texto, ciudad, fecha)
4. `CategoryTabs`: Todos, Conciertos, Deportes, Teatro, Festivales, Familia
5. "Eventos destacados": `EventGrid` filtrada por la categoría activa
6. "Esta semana": fila deslizable con `carousel`
7. Banner CTA "Organiza tu evento"
8. `SiteFooter`

### Patrón de la `EventCard`

- Imagen 4:3 con `object-cover` y `next/image` (`fill` + `sizes`).
- Badge de categoría sobre la imagen (arriba a la izquierda).
- Título (máx. 2 líneas), fecha con icono de calendario, lugar con icono de pin.
- Pie: "Desde S/ 80" y estado ("Disponible" en acento, "Agotado" en destructivo).
- Toda la tarjeta es un enlace con foco visible.

## 9. Imágenes

- Fuentes con licencia de uso libre: Unsplash y Pexels. Cada imagen se descarga a `public/images/events/` (no se enlaza a URLs externas).
- Nombres en kebab-case (`rock-festival-crowd.jpg`). Formato JPG/WebP, máximo ~1600 px de ancho.
- Cada imagen debe tener `alt` descriptivo en el mock.
- Créditos (autor, fuente, URL, licencia) en la tabla de la sección 12.
- `next/image`: `preload` solo en la primera slide del hero (en Next 16, `priority` está deprecado), el resto carga diferida. Siempre `sizes` o dimensiones para evitar layout shift.

## 10. Accesibilidad

- Contraste mínimo 4,5:1 en texto y 3:1 en bordes de componentes.
- Foco visible en todo elemento interactivo (`focus-visible:ring-2 ring-ring`).
- Áreas táctiles de al menos 44×44 px, con 8 px de separación.
- Navegación completa con teclado, incluidos carruseles y tabs.
- Landmarks correctos: `header`, `nav`, `main`, `footer`, y un único `h1`, visualmente oculto (`sr-only`) en `app/page.tsx`. Los títulos de las slides del hero y de las secciones son `h2`.
- `lang="es"` en `<html>`.

## 11. Rendimiento

- Componentes de servidor por defecto; `"use client"` solo donde haya estado o interacción (carruseles, tabs, buscador).
- Skeletons con las dimensiones reales de la tarjeta para evitar CLS.
- Imágenes con `next/image`, nunca `<img>`.

## 12. Créditos de imágenes

Se completa durante la implementación, una fila por imagen.

| Archivo | Autor | Fuente | Licencia |
|---|---|---|---|
| `rock-concert-crowd.jpg` | Mark Wu | Pexels: https://www.pexels.com/photo/silhouetted-audience-and-artist-on-the-stage-at-the-concert-12265693/ | Pexels License |
| `acoustic-live-band.jpg` | Fliqa India | Pexels: https://www.pexels.com/photo/male-musicians-with-guitars-performing-on-concert-3569451/ | Pexels License |
| `orchestra-concert-hall.jpg` | Talha Resitoglu | Pexels: https://www.pexels.com/photo/sydney-opera-house-concert-hall-full-house-37377494/ | Pexels License |
| `festival-main-stage.jpg` | Maor Attias | Pexels: https://www.pexels.com/photo/people-watching-live-concert-5193532/ | Pexels License |
| `electronic-dj-night.jpg` | Nano Erdozain | Pexels: https://www.pexels.com/photo/a-man-in-a-hat-is-playing-music-at-a-party-27570912/ | Pexels License |
| `football-stadium-night.jpg` | George Zografidis | Pexels: https://www.pexels.com/photo/illuminated-soccer-stadium-at-night-with-crowd-30651230/ | Pexels License |
| `marathon-runners-city.jpg` | VANNGO Ng | Pexels: https://www.pexels.com/photo/nighttime-marathon-event-in-urban-setting-38674856/ | Pexels License |
| `basketball-court-game.jpg` | cottonbro studio | Pexels: https://www.pexels.com/photo/a-person-holding-the-basket-ball-in-front-of-a-person-6777189/ | Pexels License |
| `theater-stage-curtain.jpg` | Dmitry Romanoff | Pexels: https://www.pexels.com/photo/luxurious-red-theater-curtain-in-elegant-italian-opera-house-39591661/ | Pexels License |
| `theater-play-actors.jpg` | cottonbro studio | Pexels: https://www.pexels.com/photo/two-men-and-woman-acting-on-stage-6899922/ | Pexels License |
| `family-circus-show.jpg` | Muhammad Auwal Said | Pexels: https://www.pexels.com/photo/clown-standing-on-stage-22820478/ | Pexels License |
| `kids-puppet-show.jpg` | Vlada Karpovich | Pexels: https://www.pexels.com/photo/close-up-shot-of-a-puppet-show-7356561/ | Pexels License |
