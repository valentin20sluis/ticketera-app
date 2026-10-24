# Selección de asientos por zona

Estado: aprobada

## Objetivo

Hoy la compra elige solo ZONA + cantidad (`useTicketSelection`: `quantities` por zona; `createPendingOrder` guarda `order_items.quantity`; `markOrderPaid` crea N tickets anónimos). Se quiere: elegir la zona en el mapa (ej. "Campo VIP"), que al hacer clic se abra SOLO esa zona mostrando su grilla de asientos, y elegir asientos concretos. Los asientos quedan retenidos 15 min con la orden `pending`, se confirman al pagar y se muestran en `/mis-entradas` y en el PDF.

Hallazgos verificados en el código (condicionan el diseño):

- No existe concepto de asiento. `venue_zones` (forma + `capacity`) y `function_zones` (precio + `capacity` por función). `tickets` cuelga de `order_items` (por `function_zone`, `quantity`). Sin migraciones aplicables a data real salvo 0000-0005 en `drizzle/`.
- Disponibilidad: `getZoneAvailability` = `capacity - sum(order_items.quantity)` de órdenes `reservingOrderCondition` (paid, o pending con `expiresAt > now`). **La expiración es perezosa**: una orden `pending` vencida simplemente deja de contar; nadie la barre. Solo el webhook `checkout.session.expired` llama `markOrderExpired`.
- `createPendingOrder` ya serializa por zona: `SELECT ... FOR UPDATE` sobre `function_zones` ordenado por id, dentro de una transacción. Esa es la base de concurrencia para asientos.
- Check-in: `app/(panel)/organizador/check-in/page.tsx` es solo `PanelComingSoon`; no hay lógica. Queda fuera (solo dejamos el dato del asiento disponible en `tickets`).
- La estructura (venue/zonas/capacidad) del evento se congela al existir pedidos (`getStructureLock` en `event-read.service.ts`, usado por `updateEvent`/`deleteEvent`), así que el layout de asientos nunca cambia con asientos ya vendidos.
- El repo no usa `src/`; las rutas son `modules/...`, `lib/...`, `app/...` desde la raíz.
- Brecha previa (no la crea esta spec): Stripe exige `expires_at` >= 30 min mientras la orden vence a los 15 min, y `markOrderPaid` no revisa `expiresAt`. Con asientos esto importa (ver Concurrencia y pregunta 5).

## Alcance

- Incluye (MVP):
  - Zonas **numeradas** opcionales: `venue_zones.seat_rows` y `seat_columns` (null = zona de pie / general admission, comportamiento actual intacto). Los asientos no se guardan como filas; el asiento es `(fila, número)` 1-based dentro de la zona, generado por la grilla filas x columnas.
  - Retención de asientos ligada a la orden: tabla `order_item_seats` con `UNIQUE (function_zone_id, seat_row, seat_number)`.
  - Ticket ↔ asiento: `tickets.order_item_seat_id` (nullable, unique).
  - Checkout: `items[]` acepta `seats` para zonas numeradas; validación server-side; error `seat_taken` (409).
  - UI de compra: clic en una zona numerada abre la vista de esa zona con grilla (disponible / ocupado / seleccionado), máximo de asientos, resumen y paso a pago con los asientos.
  - Organizador: por zona, interruptor "Asientos numerados" + filas + asientos por fila; la capacidad se calcula (filas x columnas).
  - `/mis-entradas` y PDF muestran el asiento (ej. "Fila B · Asiento 7").
- No incluye:
  - Editor visual de layout, pasillos/huecos, asientos bloqueados/cortesía, categorías o precios por asiento (precio sigue siendo por zona), asientos accesibles.
  - Convertir zonas existentes: se quedan de pie (columnas `null`); el organizador no puede cambiar el layout si ya hay pedidos (lock existente).
  - Realtime/WebSocket: el estado de ocupación se carga al abrir la página y se recarga al recibir `seat_taken`.
  - Check-in con asiento (la pantalla es "próximamente"); cron/barrido de órdenes vencidas; reembolso de pagos tardíos.
  - Elegir asiento "mejor disponible" automático.
  - Cambiar asientos de una orden ya pagada.

## Reutilizar

- `createPendingOrder`/`markOrderPaid`/`markOrderExpired` (`modules/ticketing/services/order.service.ts`): se extienden, no se duplican. Lock `FOR UPDATE` por `function_zones` y `ORDER_TTL_MS`.
- `reservingOrderCondition` (`get-zone-availability.service.ts`) para saber qué asientos están retenidos.
- `MAX_TICKETS_PER_ZONE` (6) y `getZoneMaxQuantity`/`isZoneSoldOut` (`modules/events/services/venue-zone.service.ts`); `MAX_QUANTITY_PER_ITEM` en `checkout-session.schema.ts`.
- `VenueZoneMapViewer`, `VenueZoneMapLegend`, `ZoneSelectorList`, `TicketSummary`, `useTicketSelection` (se extienden); `getStructureLock` (`event-read.service.ts`); `buildTicketStubs`, `generateTicketsPdf`, `getTicketCode`.
- `components/ui/button.tsx`, `switch.tsx`/`input.tsx`/`label.tsx` si ya existen en `components/ui` (verificar con `ls components/ui`; si falta `switch`, usar `checkbox` ya existente o `npx shadcn@latest add switch` en T0).
- `createTestDb` (`lib/db/test-helpers.ts`, PGlite) para tests de services.

## Archivos

Contratos (fijados aquí para que las tareas corran en paralelo):

```ts
// modules/ticketing/types/seat.types.ts (T0)
export interface SeatRef { row: number; number: number }          // 1-based
export interface SeatLayout { rows: number; columns: number }     // zona numerada
// modules/events/types/venue-zone.types.ts (T0): VenueZone suma
//   seatLayout?: SeatLayout            // undefined = de pie
//   takenSeats?: SeatRef[]             // retenidos/pagados al cargar
// modules/ticketing/utils/seat-label.ts (T0)
export function seatLabel(seat: SeatRef): string  // {row:2, number:7} -> "B7"; fila > 26 -> "AA"
export function formatSeat(seat: SeatRef): string // "Fila B · Asiento 7"

// POST /api/checkout (T1). Zona numerada: seats obligatorio, quantity ignorado/ausente.
// Zona de pie: quantity como hoy, seats prohibido.
items: Array<
  | { functionZoneId: string; quantity: number }
  | { functionZoneId: string; seats: SeatRef[] }
>
// errores: 400 invalid_payload | 401 unauthorized | 409 insufficient_stock | 409 seat_taken

// order.service.ts (T1)
export class SeatTakenError extends Error { functionZoneId: string }
export type PendingOrderInput = { customerId: string; items: Array<{ functionZoneId: string; quantity?: number; seats?: SeatRef[] }> }
```

Nuevos:
- `modules/ticketing/types/seat.types.ts` (T0)
- `modules/ticketing/utils/seat-label.ts`, `seat-label.test.ts` (T0)
- `drizzle/0006_<nombre>.sql` + `drizzle/meta/*` (T0, generado con `npx drizzle-kit generate`)
- `modules/ticketing/services/get-taken-seats.service.ts`, `get-taken-seats.service.test.ts` (T1)
- `modules/events/components/SeatPicker.tsx` (T3): grilla de una zona (botones por asiento, `aria-pressed`, `aria-label` con `formatSeat`, ocupados `disabled`)

Modificados:
- T0: `lib/db/schema.ts`, `lib/db/schema.test.ts`, `modules/events/types/venue-zone.types.ts`, `modules/checkout/types/checkout.types.ts` (`ConfirmedOrder.ticketSeats?: (string | null)[]` paralelo a `ticketQrCodes`, formato `formatSeat` o `null`)
- T1: `modules/ticketing/services/order.service.ts` (+ `.test.ts`), `modules/ticketing/services/get-event-checkout.service.ts` (+ `.test.ts`), `modules/checkout/schemas/checkout-session.schema.ts` (+ `.test.ts`), `app/api/checkout/route.ts`
- T2: `modules/organizer/schemas/create-event.schema.ts` (+ `.test.ts`), `modules/organizer/services/event-write.service.ts` (+ `.test.ts`), `modules/organizer/services/event-read.service.ts` (+ `.test.ts`), `modules/organizer/hooks/useCreateEventForm.ts` (+ `.test.ts`), `modules/organizer/components/FunctionZonesStep.tsx`
- T3: `modules/events/hooks/useTicketSelection.ts` (+ `.test.ts`), `modules/events/components/TicketSelectionView.tsx`, `modules/events/components/TicketSummary.tsx`, `modules/events/components/ZoneSelectorList.tsx`, `modules/checkout/hooks/useCheckoutPayment.ts` (+ `.test.ts`), `modules/checkout/services/request-checkout-url.service.ts` (+ `.test.ts`)
- T4: `modules/my-tickets/services/get-user-orders.service.ts` (+ `.test.ts`), `modules/my-tickets/components/TicketDetailPanel.tsx`, `modules/checkout/utils/build-ticket-stubs.ts` (+ `.test.ts`), `modules/checkout/utils/generate-tickets-pdf.ts`

### Modelo de datos (T0, requiere migración Drizzle 0006)

- `venue_zones`: `seat_rows integer null`, `seat_columns integer null`. CHECK: ambos null o ambos > 0 (`venue_zones_seat_layout_valid`), y si no son null `capacity = seat_rows * seat_columns`.
- `order_item_seats`: `id uuid pk`, `order_item_id uuid not null -> order_items`, `function_zone_id uuid not null -> function_zones`, `seat_row int not null`, `seat_number int not null`, `created_at`; CHECK `seat_row > 0 and seat_number > 0`; `UNIQUE (function_zone_id, seat_row, seat_number)`; índice por `order_item_id`.
- `tickets`: `order_item_seat_id uuid null unique -> order_item_seats`.
- Migración solo agrega columnas nullable y una tabla: no rompe datos; zonas y tickets existentes quedan de pie / sin asiento. No hay backfill. Verificar la migración generada contra `drizzle/meta/_journal.json`.
- `function_zones.capacity` se mantiene (para zonas numeradas es igual a filas x columnas; `getZoneAvailability` sigue válido porque `order_items.quantity` = número de asientos).

### Concurrencia y expiración (T1)

`createPendingOrder`, ya dentro de la transacción con `FOR UPDATE` por `function_zones` (serializa compradores de la misma zona):

1. Barrido perezoso, solo para las zonas pedidas: marcar `expired` las órdenes `pending` con `expires_at <= now` que tengan filas en `order_item_seats` de esas zonas; luego `DELETE FROM order_item_seats` de órdenes `expired`/`cancelled` de esas zonas. (Así la `UNIQUE` no depende del estado de la orden y la expiración perezosa existente sigue funcionando.)
2. Validar cada asiento contra el layout de la zona (rango `1..rows` / `1..columns`, sin duplicados en el pedido, máx `MAX_TICKETS_PER_ZONE`); en zona numerada `quantity = seats.length`; en zona de pie rechazar `seats`.
3. `INSERT ... order_item_seats`; si choca la `UNIQUE` (código `23505`) o devuelve menos filas de las pedidas, lanzar `SeatTakenError` y revertir toda la transacción (ninguna orden ni asiento a medias). La `UNIQUE` es la defensa de último recurso si el lock fallara.
4. `markOrderExpired` y cualquier cancelación borran las filas `order_item_seats` de la orden (misma transacción que el `UPDATE` a `expired`/`cancelled`, solo si la orden estaba `pending`).
5. `markOrderPaid`: por cada `order_item` con asientos, crear un ticket por asiento con `order_item_seat_id`; para zonas de pie, igual que hoy. Si la orden ya no está `pending` (porque el barrido la marcó `expired`), `updated: false` como hoy (pago tardío sin ticket: ver pregunta 5).

`route.ts` traduce `SeatTakenError` a `409 { error: "seat_taken" }`. El nombre del ítem para Stripe (`"<evento> - <zona>"`) no cambia; la cantidad es el número de asientos.

`getTakenSeats(db, functionZoneId): Promise<SeatRef[]>`: asientos de `order_item_seats` unidos a `orders` con `reservingOrderCondition()` (así los de órdenes vencidas aparecen libres aunque aún no se barran). `getCheckoutEventBySlug` adjunta `seatLayout` (de `venue_zones.seat_*`) y `takenSeats` a cada zona numerada.

### UI (T3)

- `useTicketSelection`: nuevo `seatsByZone: Record<zoneId, SeatRef[]>`; `toggleSeat(zoneId, seat)` (respeta máximo y asientos ocupados); para zona numerada `quantity = seats.length`, `lines[].seats` con los asientos (`TicketSelectionLine.seats?: SeatRef[]`); zonas de pie siguen con `increment/decrement`. `activeZoneId` ya existe: si la zona activa es numerada, `TicketSelectionView` muestra la vista de zona en lugar del mapa completo: título de la zona, botón "Volver al mapa" (`activeZoneId = null`, conserva lo elegido), indicador "ESCENARIO" opcional, `SeatPicker` y leyenda (disponible / ocupado / seleccionado). Clic en zona de pie: comportamiento actual.
- `SeatPicker`: grilla CSS `grid-template-columns: repeat(columns, ...)`, etiqueta de fila (A, B, ...), cada asiento es un `<button>` con `aria-pressed` y `aria-label` ("Fila B · Asiento 7, disponible/ocupado"); sin librerías nuevas.
- `ZoneSelectorList` marca "Elegir asientos" (en vez de contador +/-) para zonas numeradas y muestra los asientos elegidos como chips (`seatLabel`).
- `TicketSummary`: por línea muestra el listado de asientos; el CTA se habilita con >= 1 asiento/entrada.
- `useCheckoutPayment`/`request-checkout-url`: envían `{functionZoneId, seats}` para zonas numeradas y `{functionZoneId, quantity}` para las de pie; nuevo mensaje para `seat_taken`: "Alguien tomó uno de tus asientos. Elige otros." y `router.refresh()` para recargar `takenSeats`, conservando la selección no conflictiva.

### Organizador (T2)

- `zoneRowSchema` suma `seatRows`/`seatColumns` opcionales (enteros positivos, `rows <= 26`, `columns <= 40`, ambos o ninguno). En una zona numerada la `capacity` se fuerza a `rows * columns` (en el schema, no solo en la UI).
- `FunctionZonesStep`: por zona, checkbox/switch "Asientos numerados"; si está activo, aparecen filas y asientos por fila y el campo capacidad queda de solo lectura con el cálculo; si no, como hoy.
- `insertFunction` (event-write) guarda `seat_rows/seat_columns` en `venue_zones` y `capacity` calculada; `event-read.service` los devuelve para precargar el formulario de edición. Con estructura congelada (pedidos) no se editan.

### Mi entrada / PDF (T4)

- `getPaidOrdersForUser` une `tickets.order_item_seat_id -> order_item_seats` y llena `ticketSeats` (`formatSeat` o `null`, mismo orden que `ticketQrCodes`).
- `TicketDetailPanel` muestra el asiento de la entrada seleccionada si existe; `buildTicketStubs`/`generateTicketsPdf` agregan la línea "Fila B · Asiento 7" cuando el stub tiene asiento. Sin asiento, igual que hoy.

## Criterios de aceptación

- AC1: La migración 0006 aplica sobre una DB con datos de 0005 sin errores; zonas existentes quedan con `seat_rows/seat_columns = null` y siguen funcionando como de pie (compra por cantidad idéntica a hoy).
- AC2: `venue_zones` rechaza (CHECK) un solo `seat_rows` sin `seat_columns`, valores <= 0, o `capacity != rows*columns` en zonas numeradas; `order_item_seats` rechaza duplicados `(function_zone_id, seat_row, seat_number)`.
- AC3: `createPendingOrder` con asientos libres de una zona numerada crea la orden y las filas `order_item_seats`, con `order_items.quantity = seats.length` y total = precio de zona x asientos.
- AC4: Dos `createPendingOrder` concurrentes (`Promise.all`) que piden el mismo asiento: exactamente una tiene éxito, la otra lanza `SeatTakenError` y no deja orden ni asientos. Dos pedidos con asientos distintos de la misma zona tienen éxito ambos.
- AC5: Un asiento de una orden `pending` vencida (`expiresAt <= now`) puede ser tomado por otro comprador (el barrido marca esa orden `expired` y libera sus asientos); un asiento de una orden `pending` vigente o `paid` da `SeatTakenError`.
- AC6: `markOrderExpired` borra los asientos de la orden; `markOrderPaid` crea un ticket por asiento con `order_item_seat_id` y, para zonas de pie, N tickets sin asiento como hoy; `markOrderPaid` sobre una orden ya `expired` devuelve `{ updated: false }` y no crea tickets.
- AC7: Validación server-side: asiento fuera de rango, duplicado en el pedido, más de `MAX_TICKETS_PER_ZONE` asientos por zona, `seats` en zona de pie, ausencia de `seats` en zona numerada o `functionZoneId` inexistente -> el schema responde 400 `invalid_payload` o el service lanza error sin escribir nada (cada caso con test).
- AC8: `POST /api/checkout` devuelve 409 `{ error: "seat_taken" }` ante `SeatTakenError`; el 409 `insufficient_stock` actual no cambia.
- AC9: `getTakenSeats` devuelve asientos de órdenes `paid` y `pending` vigentes y no los de órdenes vencidas/`expired`; `getCheckoutEventBySlug` incluye `seatLayout` y `takenSeats` en zonas numeradas y los omite en las de pie.
- AC10: Al hacer clic en una zona numerada se abre solo esa zona con su grilla (filas x columnas); asientos ocupados no son seleccionables; "Volver al mapa" regresa conservando la selección; clic en zona de pie mantiene el contador actual.
- AC11: Seleccionar/deseleccionar asientos actualiza resumen y total; no se pueden elegir más de `MAX_TICKETS_PER_ZONE` por zona (el asiento extra no se marca); CTA deshabilitado sin selección.
- AC12: El pago envía los asientos elegidos; ante `seat_taken` se muestra el mensaje, se recargan los ocupados y se conserva la selección que no entró en conflicto.
- AC13: En el wizard del organizador, activar "Asientos numerados" muestra filas y asientos por fila y calcula la capacidad (solo lectura); el schema rechaza filas > 26, columnas > 40 o solo uno de los dos; guardar persiste el layout y al editar un evento sin pedidos se precarga. Con pedidos la estructura sigue congelada.
- AC14: `/mis-entradas` y el PDF muestran "Fila X · Asiento N" en entradas con asiento y nada extra en las de pie.
- AC15: `seatLabel`/`formatSeat` convierten `{row, number}` a "B7"/"Fila B · Asiento 7" (fila 27 -> "AA").
- AC16: `npm run lint`, `npm run build` y `npx vitest run` pasan.

## Tests requeridos

(Vitest, junto al archivo; services con `createTestDb`)

- `seat-label.test.ts`: AC15.
- `lib/db/schema.test.ts`: AC1, AC2 (constraints).
- `order.service.test.ts`: AC3 a AC7 (concurrencia con `Promise.all`; órdenes vencidas con `expiresAt` pasado; tickets con asiento).
- `get-taken-seats.service.test.ts`: AC9.
- `get-event-checkout.service.test.ts`: AC9.
- `checkout-session.schema.test.ts`: AC7 (válido: zona numerada con seats, zona de pie con quantity; inválido: ambos, ninguno, duplicados, > máximo, fila/número <= 0).
- `create-event.schema.test.ts`, `event-write.service.test.ts`, `event-read.service.test.ts`, `useCreateEventForm.test.ts`: AC13.
- `useTicketSelection.test.ts`: AC10, AC11 (toggle, máximo, ocupados, líneas con asientos, zona de pie intacta).
- `useCheckoutPayment.test.ts`, `request-checkout-url.service.test.ts`: AC12.
- `get-user-orders.service.test.ts`, `build-ticket-stubs.test.ts`: AC14.
- Sin test: `SeatPicker`, `TicketSelectionView`, `ZoneSelectorList`, `TicketSummary`, `FunctionZonesStep`, `TicketDetailPanel` (presentacionales; revisión manual de AC10, AC13, AC14). `app/api/checkout/route.ts`: AC8 se verifica manualmente o con test de ruta si ya existe patrón.

## Tareas

### T0 — Base: esquema, migración, tipos y utilidades de asiento
- Archivos: `lib/db/schema.ts`, `lib/db/schema.test.ts`, `drizzle/0006_*.sql` y `drizzle/meta/*` (generados), `modules/ticketing/types/seat.types.ts`, `modules/ticketing/utils/seat-label.ts`, `modules/ticketing/utils/seat-label.test.ts`, `modules/events/types/venue-zone.types.ts`, `modules/checkout/types/checkout.types.ts` (+ `npx shadcn@latest add switch` solo si se decide usar switch)
- Depende de: —
- Paralelizable: no (grupo base; arranca primero)
- Cubre: AC1, AC2, AC15

### T1 — Backend de órdenes y checkout con asientos
- Archivos: `modules/ticketing/services/order.service.ts` (+test), `modules/ticketing/services/get-taken-seats.service.ts` (+test), `modules/ticketing/services/get-event-checkout.service.ts` (+test), `modules/checkout/schemas/checkout-session.schema.ts` (+test), `app/api/checkout/route.ts`
- Depende de: T0
- Paralelizable: sí con T2, T3, T4 (grupo A; archivos disjuntos, T3 y T4 usan solo los contratos fijados arriba)
- Cubre: AC3, AC4, AC5, AC6, AC7, AC8, AC9

### T2 — Organizador define el layout
- Archivos: `modules/organizer/schemas/create-event.schema.ts` (+test), `modules/organizer/services/event-write.service.ts` (+test), `modules/organizer/services/event-read.service.ts` (+test), `modules/organizer/hooks/useCreateEventForm.ts` (+test), `modules/organizer/components/FunctionZonesStep.tsx`
- Depende de: T0
- Paralelizable: sí con T1, T3, T4 (grupo A)
- Cubre: AC13

### T3 — UI de selección de asientos y envío al checkout
- Archivos: `modules/events/hooks/useTicketSelection.ts` (+test), `modules/events/components/SeatPicker.tsx`, `modules/events/components/TicketSelectionView.tsx`, `modules/events/components/TicketSummary.tsx`, `modules/events/components/ZoneSelectorList.tsx`, `modules/checkout/hooks/useCheckoutPayment.ts` (+test), `modules/checkout/services/request-checkout-url.service.ts` (+test)
- Depende de: T0 (tipos); integración final con T1 (contrato de payload y `takenSeats`)
- Paralelizable: sí con T1, T2, T4 (grupo A); la verificación manual de AC10 a AC12 requiere T1 mergeado
- Cubre: AC10, AC11, AC12

### T4 — Mostrar el asiento en /mis-entradas y PDF
- Archivos: `modules/my-tickets/services/get-user-orders.service.ts` (+test), `modules/my-tickets/components/TicketDetailPanel.tsx`, `modules/checkout/utils/build-ticket-stubs.ts` (+test), `modules/checkout/utils/generate-tickets-pdf.ts`
- Depende de: T0
- Paralelizable: sí con T1, T2, T3 (grupo A; los tests insertan `order_item_seats` a mano)
- Cubre: AC14

Orden: T0 -> (T1 || T2 || T3 || T4). AC16 al final, con todo integrado. Cinco tareas.

## Preguntas abiertas

1. Zonas existentes y de pie: ¿quedan de pie sin migrar? Default recomendado: sí; solo las zonas nuevas pueden ser numeradas (opt-in por zona).
2. Máximo de asientos: ¿por zona o por compra? Default recomendado: 6 por zona (reusa `MAX_TICKETS_PER_ZONE`), sin tope global nuevo (YAGNI).
3. Tamaño del layout: default recomendado `filas <= 26`, `columnas <= 40` (máx 1040 asientos por zona). ¿Hace falta más?
4. Cómo se ve la grilla si la zona tiene muchas columnas en móvil: default recomendado: contenedor con scroll horizontal; sin zoom/pan en esta fase.
5. Pago que llega después de vencer la orden (Stripe exige >= 30 min, la orden dura 15 min; hoy ya ocurre con cantidades): default recomendado: fuera de alcance; con asientos la orden se marca `expired` solo si otro comprador necesita el asiento, el pago tardío no genera tickets y se resuelve manualmente (reembolso desde Stripe). Alternativa posterior: alinear TTL de orden con el mínimo de Stripe (30 min).
6. Etiquetado: filas con letras (A, B, ..., AA) y asientos con números. Default recomendado: sí.
7. Organizador con eventos ya publicados y sin pedidos: puede convertir una zona de pie a numerada al editar (la estructura no está congelada). Default recomendado: sí, sin restricciones extra.
8. Refresco del estado de ocupación: default recomendado: al cargar la página y tras `seat_taken` (sin polling). ¿Se quiere polling cada N segundos?
9. Check-in: la pantalla aún es "próximamente". Default recomendado: no tocarla; cuando exista, leerá el asiento desde `tickets.order_item_seat_id`.

## Próximas fases

- Editor visual de layout (pasillos, huecos, secciones curvas, asientos bloqueados/accesibles).
- Precio por fila/asiento y "mejor disponible" automático.
- Realtime de ocupación (polling/SSE) y zoom/pan del mapa de asientos.
- Barrido periódico de órdenes vencidas y reembolso automático de pagos tardíos.
- Mostrar asiento en el escáner de check-in cuando se implemente.
- Seed de demo con una zona numerada (ej. "Campo VIP").

## Enmienda 2026-10-12 (pedido directo del usuario): layout fijo para todas las zonas

Decisión humana que reemplaza las preguntas abiertas 1, 3 y 7 y el control del organizador (T2/AC13):
- **Todas** las zonas (existentes y nuevas) son numeradas con el mismo layout por defecto: **10 filas × 10 asientos = 100** (`DEFAULT_SEAT_LAYOUT`, constante única).
- El formulario de crear/editar evento **no** pide filas, asientos ni capacidad: se quita el switch "Asientos numerados", los inputs de layout y el input de capacidad de `FunctionZonesStep`. El servidor fuerza el layout y `capacity = 100` al guardar.
- Migración de datos `0007` (SQL a mano, `drizzle-kit generate --custom`): `UPDATE venue_zones SET seat_rows = 10, seat_columns = 10, capacity = 100` para todas las zonas; incluye eventos publicados y borradores. Los tickets ya vendidos (sin asiento) se conservan y siguen contando contra la capacidad; los asientos concretos no se les asignan.
- Las zonas de pie dejan de crearse; el código de pie se mantiene por compatibilidad (columnas nullable) pero no se alcanza desde el formulario.
- AC13 pasa a: crear un evento deja cada zona con 10×10 sin que el organizador lo configure.
