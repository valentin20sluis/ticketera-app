# Rediseño del mapa de zonas del venue ("Escenario")

Estado: draft

## Objetivo
El selector de zonas de `/eventos/[slug]/entradas` (`VenueZoneMap.tsx`) funciona pero el usuario lo probó y no le quedó claro el UX/UI: no hay leyenda de colores, no hay zoom/pan (el SVG es fijo y las zonas pequeñas son difíciles de leer/tocar), el feedback de hover/selección es sutil, y la conexión visual entre el mapa y el resumen de compra (`TicketSummary`) es débil. Esta spec rediseña la experiencia de selección de zona **sin cambiar el modelo de negocio**: se mantiene "zonas de cupo" (no asientos numerados), decisión ya fijada en `docs/specs/ticket-selection.md` (Fase 4) y en `docs/superpowers/specs/2026-09-30-ticketing-system-design.md`. Se mejora el SVG propio (ya accesible) agregando una leyenda de colores, zoom/pan real con controles visibles, feedback de hover/selección más notorio, y una conexión visual explícita entre la zona activa del mapa y su línea en el resumen de compra.

## Fuera de alcance
- Modelo de datos de zonas: `VenueZone`, `VenueZoneShape`, `ZoneSelectionStatus` (`modules/events/types/venue-zone.types.ts`) no cambian. No se agrega ningún campo de disponibilidad granular (ej. "pocas disponibles") porque el dato no existe hoy — solo hay `available`/`sold-out` (+`selected` derivado); la "intensidad" pedida por el usuario se aplica al **feedback de hover/selección** (más notorio), no a un estado de disponibilidad que no existe en los datos.
- Asientos individuales / mapa de butacas numeradas: descartado explícitamente por el usuario y por la decisión de arquitectura ya aprobada. Ningún archivo de esta spec introduce un concepto de asiento.
- Lógica de `useTicketSelection.ts` (`selectZone`, `increment`, `decrement`, `getZoneStatus`, cálculo de `lines`/`totalQuantity`/`totalAmount`): no se toca ni se modifica su firma. La UI solo consume lo que ya expone (incluido `activeZoneId`, que ya existe y hoy no se usa en `TicketSummary`).
- `venue-zone.service.ts` (`MAX_TICKETS_PER_ZONE`, `isZoneSoldOut`, `getZoneMaxQuantity`, `getVenueZones`): sin cambios.
- Checkout, `BuyerInfoForm`, `PaymentMethodSection`, `CheckoutPaymentStep`, `CheckoutConfirmationStep` o cualquier archivo de `modules/checkout/`: fuera de alcance total, ya resuelto en otra spec (`checkout-calendar-pdf.md`) sin relación con esta.
- `ZoneSelectorList.tsx`: no se modifica. Ya es, sin cambios, la "vista resumen fuera del SVG" que el punto 1 del requerimiento pregunta si hace falta: lista cada zona con nombre, `formatPrice(price)` y un stepper de `Button` grandes (`size="icon-sm"`) fácil de tocar en mobile, sin depender de precisión de click sobre el SVG. Agregar una tabla/lista nueva con la misma información sería duplicar esta responsabilidad (DRY/YAGNI) — se documenta la decisión aquí en vez de construir nada nuevo.
- Reemplazar el SVG propio por una librería de terceros de seat-map: se evaluaron `@alisaitteke/seatmap-canvas-react` (fija `react@18` como peer, incompatible con React 19.2.8 del proyecto), `seat-picker` (versión `0.0.13`, API inestable/inmadura) y `@kerusiweb/react` (compatible con React 19 pero publicada hace solo 2 semanas, un único mantenedor, sin historial que respalde su estabilidad). Las tres se descartan a favor de mejorar el SVG propio (ya accesible) + sumar `react-zoom-pan-pinch` solo para la capa de zoom/pan, igual que se decidió en una sesión de investigación previa con el usuario.
- Disponibilidad en tiempo real, persistencia de la selección en URL/`localStorage`/store, o zonas distintas por evento: excluidos ya en `ticket-selection.md`, siguen excluidos aquí sin cambios.
- Accesibilidad avanzada nueva (anuncios `aria-live` de cambios de cantidad, navegación con flechas entre zonas): fuera de alcance; el objetivo de esta spec sobre accesibilidad es exclusivamente **no romper** lo que `VenueZoneMap.tsx` ya tiene (teclado, `role="button"`, `aria-label`, foco visible) al envolverlo con la librería de zoom, no ampliarlo.

## Reutilización
- Existente que se reutiliza:
  - `components/ui/button.tsx` (variante `outline`, tamaño `icon-sm`) — mismos botones que ya usa el stepper de `ZoneSelectorList.tsx`, ahora también para los controles de zoom (+/-/reset), por consistencia visual y porque ya cubren el caso de "botón icono pequeño".
  - `lib/utils.ts` (`cn`) — merge de clases condicionales en los nuevos estados de hover/selección y en el resaltado de la línea activa de `TicketSummary`.
  - `lib/format-currency.ts` (`formatPrice`): sin cambios, ya usado por `VenueZoneMap`/`TicketSummary`.
  - `modules/events/hooks/useTicketSelection.ts`: se consume `activeZoneId` (ya expuesto, hoy sin usar fuera de `ZoneSelectorList`) para conectar visualmente el mapa con el resumen. No se modifica el hook.
  - `modules/events/components/ZoneSelectorList.tsx`: ya cubre la "vista lista" para mobile (ver Fuera de alcance), se reutiliza tal cual, sin tocarlo.
  - `lucide-react` (ya instalado, v1.47.0): íconos `ZoomIn`, `ZoomOut`, `RotateCcw` para los controles de zoom (confirmado que existen en el paquete instalado).
- Existente que se extiende:
  - `modules/events/components/VenueZoneMap.tsx` — se exportan `ZONE_STATUS_CLASSNAMES` (ya existe, pasa de constante privada a exportada), un nuevo `ZONE_STATUS_LABELS: Record<ZoneSelectionStatus, string>` (`"Disponible"`/`"Seleccionado"`/`"Agotado"`) y el tipo `VenueZoneMapZone` (ya existe como interfaz privada, pasa a exportada) para que la leyenda (T3) y el wrapper de zoom (T4) reutilicen exactamente la misma fuente de verdad en vez de duplicar literales de clases/labels (DRY). Las clases de `"available"`/`"selected"` ganan una transición más notoria (scale/shadow en hover y en estado seleccionado). **No cambia**: la lógica de accesibilidad (`role="button"`, `tabIndex`, `onKeyDown` de Enter/Space, `aria-label`, `aria-disabled`, `focus-visible:stroke-ring`) ni la firma de `VenueZoneMapProps`.
  - `modules/events/components/TicketSummary.tsx` — gana una prop opcional `activeZoneId?: string | null` para resaltar la línea del resumen que corresponde a la zona activa en el mapa (mismo patrón visual `border-primary bg-primary/5` que ya usa `ZoneSelectorList` para su fila activa), reforzando la conexión mapa↔resumen pedida por el usuario sin necesidad de un hover-state nuevo ni de tocar el hook.
  - `modules/events/components/TicketSelectionView.tsx` — reemplaza el uso directo de `VenueZoneMap` por el nuevo `VenueZoneMapViewer` (T4), agrega `VenueZoneMapLegend` (T3) junto al mapa, y pasa `activeZoneId` a `TicketSummary`. El layout `grid-cols-1 ... lg:grid-cols-3` de `ticket-selection.md` (AC-15) no cambia.
- Nuevo (y por qué no sirve nada existente):
  - `modules/events/components/VenueZoneMapLegend.tsx`: no existe ningún componente de leyenda; es una responsabilidad propia (mostrar el significado de los colores) que no pertenece ni a `VenueZoneMap` (dibuja el SVG) ni a `TicketSummary` (resume precios) — SRP.
  - `modules/events/components/VenueZoneMapViewer.tsx`: no existe ningún wrapper de zoom/pan; es la única pieza que depende de la librería nueva, aislada del SVG puro (`VenueZoneMap`) para que este último siga siendo testeable/legible sin la librería de terceros mezclada en su JSX (SRP, Dependency Inversion: `VenueZoneMap` no sabe que existe `react-zoom-pan-pinch`).
- Dependencias nuevas a instalar antes de implementar: **`react-zoom-pan-pinch@^4.2.0`** (`npm install react-zoom-pan-pinch@^4.2.0`).
  - Se evaluaron, y se descartaron, las tres librerías de seat-map listadas en "Fuera de alcance" (`@alisaitteke/seatmap-canvas-react`, `seat-picker`, `@kerusiweb/react`): todas intentan reemplazar el SVG completo (modelo de asiento o inmaduras/incompatibles), y el usuario ya confirmó mantener el SVG propio. Para zoom/pan puro (sin reemplazar el mapa) se evaluó:
    1. CSS `transform: scale()` + `overflow: auto`/drag manual con `pointermove`: no requiere dependencia nueva, pero implica reimplementar a mano el manejo de gestos táctiles (pinch, inercia), límites de paneo y el estado de escala — bastante más código propio y más superficie de bugs que una librería madura, para un problema (zoom/pan con gestos) ya resuelto de forma estándar.
    2. `react-zoom-pan-pinch@^4.2.0`: expone `TransformWrapper`/`TransformComponent` y controles imperativos (`zoomIn`, `zoomOut`, `resetTransform`) vía children como función (render-prop) o el hook `useControls`. Se confirmó con `npm view`:
       - `peerDependencies`: `{ "react": "*", "react-dom": "*" }` — sin pin de versión, compatible con React 19.2.8 del proyecto.
       - Última versión publicada (`4.2.0`) el `2026-09-03` (hace semanas respecto a hoy), sin reportes de incompatibilidad conocida.
       - `main`/`module`/`types` apuntan a `dist/index.cjs.js` / `dist/index.esm.js` / `dist/index.d.ts` respectivamente — build ESM disponible para que Next.js/Turbopack lo bundlee sin fricción.
       - Soporta gestos táctiles (pinch-to-zoom, drag-to-pan) de forma nativa sin configuración adicional; no se encontró necesidad de código específico para mobile más allá de no deshabilitar esos gestos por defecto.
    - Se eligió la opción 2 por KISS (un problema ya resuelto por una librería madura y activamente mantenida, en vez de reimplementarlo) y porque el usuario ya la validó explícitamente en la investigación previa.
  - Riesgo documentado (no se asume resuelto, se valida en T4): `TransformWrapper` envuelve al SVG de `VenueZoneMap`, que depende de que sus `<g role="button" tabIndex={0}>` reciban foco de teclado y `onKeyDown` normalmente. No hay evidencia confirmada de que `react-zoom-pan-pinch` intercepte o interfiera con el foco/teclado de sus hijos (su objetivo es gestos de puntero/rueda, no teclado), pero tampoco se verificó en runtime en este proyecto. T4 debe comprobarlo manualmente (Tab hasta una zona + Enter/Espacio) y, si hay conflicto, mitigarlo (ej. ajustando qué elementos participan del paneo) dejando un comentario en el código explicando el ajuste.

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con `react-zoom-pan-pinch` instalado e integrado.
- AC-2: `npx vitest run` pasa sin regresiones en los tests ya existentes del proyecto (esta spec no agrega archivos de test nuevos — ver justificación por tarea en "Tareas").
- AC-3: `modules/events/components/VenueZoneMap.tsx` exporta `ZONE_STATUS_CLASSNAMES: Record<ZoneSelectionStatus, string>`, `ZONE_STATUS_LABELS: Record<ZoneSelectionStatus, string>` (con los valores `"Disponible"`, `"Seleccionado"`, `"Agotado"` para `"available"`, `"selected"`, `"sold-out"` respectivamente) y el tipo `VenueZoneMapZone`; `ZONE_STATUS_CLASSNAMES["available"]` y `["selected"]` incluyen, además de las clases de color ya existentes, al menos una clase de transición/feedback adicional a `transition-colors` (ej. `transition-transform`, `hover:scale-[1.01]`, o una clase de sombra) — verificable leyendo el código.
- AC-4: La lógica de accesibilidad de `VenueZoneMap.tsx` (`role="button"`, `tabIndex={isSoldOut ? -1 : 0}`, `onClick`/`onKeyDown` con Enter/Espacio, `aria-label`, `aria-disabled`, `focus-visible:stroke-2 focus-visible:stroke-ring`) es idéntica a la de `ticket-selection.md` AC-11 — ningún cambio de esta spec toca esas líneas más allá de lo descrito en AC-3 (clases visuales y exports) — verificable comparando el diff contra la versión actual del archivo.
- AC-5: `modules/events/components/VenueZoneMapLegend.tsx` (sin props) renderiza exactamente 3 ítems, cada uno con un swatch que usa la clase de color correspondiente de `ZONE_STATUS_CLASSNAMES` (o el subconjunto de color de esa clase) y el label correspondiente de `ZONE_STATUS_LABELS`, en el orden `"available"`, `"selected"`, `"sold-out"` — verificable leyendo el código (sin literales de color/label duplicados a mano).
- AC-6: `modules/events/components/VenueZoneMapViewer.tsx` tiene `"use client"` como primera línea, recibe `{ zones, onZoneSelect }` con el mismo tipo de props que `VenueZoneMap` (reutilizando `VenueZoneMapZone`), y renderiza `<VenueZoneMap zones={zones} onZoneSelect={onZoneSelect} />` dentro de `TransformComponent`, a su vez dentro de `TransformWrapper` de `react-zoom-pan-pinch`, con `minScale`/`maxScale` configurados (ej. `1` y `4`) y `limitToBounds` activo — verificable leyendo el código.
- AC-7: `VenueZoneMapViewer.tsx` renderiza 3 botones visibles (no solo gestos) — acercar, alejar, restablecer — cada uno con un `aria-label` distinto y explícito (ej. `"Acercar mapa"`, `"Alejar mapa"`, `"Restablecer zoom"`), conectados a `zoomIn`/`zoomOut`/`resetTransform` expuestos por `TransformWrapper` (vía children como función o `useControls`) — verificable leyendo el código.
- AC-8: `VenueZoneMapViewer.tsx` no deshabilita los gestos táctiles por defecto de la librería (no hay props `pinch={{ disabled: true }}`, `panning={{ disabled: true }}` ni `doubleClick={{ disabled: true }}` en el `TransformWrapper`) — verificable leyendo el código.
- AC-9: Navegación por teclado manual verificada sobre `VenueZoneMapViewer` montado en la app (Tab hasta una zona disponible + Enter/Espacio dispara `onZoneSelect`): si durante la implementación de T4 se detecta que `TransformWrapper` interfiere con el foco o el `onKeyDown` de las zonas, el ajuste de mitigación queda documentado con un comentario en `VenueZoneMapViewer.tsx` explicando el problema y la solución aplicada (si no hay conflicto, no se requiere ningún comentario adicional, pero la verificación manual sigue siendo parte de completar la tarea).
- AC-10: `modules/events/components/TicketSummary.tsx` acepta la nueva prop opcional `activeZoneId?: string | null`; cuando se pasa y `line.zoneId === activeZoneId`, esa fila renderiza con una clase visual distinta a las demás (ej. `border-primary bg-primary/5`, consistente con el resaltado de fila activa ya usado en `ZoneSelectorList`); sin esa prop, o cuando ninguna línea coincide, el comportamiento es idéntico al actual (`ticket-selection.md` AC-13) — verificable leyendo el código.
- AC-11: `TicketSelectionView.tsx` reemplaza el render de `VenueZoneMap` por `VenueZoneMapViewer` (mismos `zonesWithStatus`/`selectZone` ya calculados, sin cálculo nuevo), renderiza `VenueZoneMapLegend` junto al mapa, y pasa `activeZoneId={selection.activeZoneId}` a `TicketSummary`; el resto del layout (`grid-cols-1 ... lg:grid-cols-3`, `lg:col-span-2`/`lg:col-span-1`, `pb-28`/`pb-32`) permanece igual a `ticket-selection.md` AC-15 — verificable leyendo el código.

## Tareas

### T1 — Mejoras visuales y exports de `VenueZoneMap`
Agrega feedback de hover/selección más notorio y exporta la fuente de verdad de colores/labels/tipo que reutilizarán la leyenda (T3) y el wrapper de zoom (T4), sin tocar la lógica de accesibilidad existente.
- Archivos:
  - `modules/events/components/VenueZoneMap.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4
- Tests: no aplica (componente presentacional, el cambio es de clases/exports, sin lógica nueva no trivial — SETUP.md 3.2)
- [ ] Completada

### T2 — Resaltado de línea activa en `TicketSummary`
Conecta visualmente la zona activa del mapa con su línea en el resumen de compra.
- Archivos:
  - `modules/events/components/TicketSummary.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-10
- Tests: no aplica (componente presentacional, rama condicional simple sobre props ya tipadas — SETUP.md 3.2)
- [ ] Completada

### T3 — Leyenda de colores (`VenueZoneMapLegend`)
Nuevo componente que muestra el significado de cada color/estado, reutilizando exactamente las clases y labels exportados por T1.
- Archivos:
  - `modules/events/components/VenueZoneMapLegend.tsx` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5
- Tests: no aplica (componente presentacional sin props ni lógica — SETUP.md 3.2)
- [ ] Completada

### T4 — Wrapper de zoom/pan (`VenueZoneMapViewer`)
Nuevo componente que envuelve el SVG existente con `react-zoom-pan-pinch` y agrega controles de zoom visibles, validando que no rompa la navegación por teclado de las zonas.
- Archivos:
  - `modules/events/components/VenueZoneMapViewer.tsx` (crear)
- Depende de: ninguna (consume la interfaz pública ya existente de `VenueZoneMap`, que no cambia de forma en T1)
- Grupo paralelo: G1
- Cubre: AC-6, AC-7, AC-8, AC-9
- Tests: no aplica (componente de integración con una librería de terceros; el estado de zoom lo gestiona la librería, sin lógica propia testeable — SETUP.md 3.2). Incluye verificación manual de teclado descrita en AC-9.
- [ ] Completada

### T5 — Integración en `TicketSelectionView`
Compone T1 (vía T4)+T2+T3+T4 en la vista final: reemplaza el mapa por el viewer con zoom, agrega la leyenda y conecta `activeZoneId` al resumen.
- Archivos:
  - `modules/events/components/TicketSelectionView.tsx` (modificar)
- Depende de: T1, T2, T3, T4
- Grupo paralelo: G3
- Cubre: AC-1, AC-2, AC-11
- Tests: no aplica (componente de composición, la lógica ya está cubierta/eximida en T1-T4 y en `useTicketSelection.test.ts` existente — SETUP.md 3.2)
- [ ] Completada
