# Estado real de las entradas en /mis-entradas

Estado: approved

## Objetivo

Hoy `TicketDetailPanel` calcula `Estado` con `getOrderStatus(order.startDate) === "upcoming" ? "Válida" : "Usada"`: depende de la fecha del evento, no del ticket. La tarea 04 (`docs/specs/organizer-check-in.md`, PR #10) ya escribe `tickets.status = 'used'` y `tickets.checked_in_at` de forma atómica al admitir una entrada. Esta spec (tarea 05) hace que `/mis-entradas` lea ese estado real por entrada (Válida / Usada + hora de ingreso en Lima). Es solo lectura: no hay check-in manual ni cambios en la lógica de check-in.

Datos: sin migración (`lib/db/schema.ts` ya tiene `tickets.status` `valid|used` y `tickets.checked_in_at`, `timestamptz` nullable). No toca auth/pagos/roles; no requiere sección de `system-design.md`.

## Alcance

- Incluye:
  - `ConfirmedOrder` gana `tickets` (por entrada: `qrCode`, `status`, `checkedInAt`) y reemplaza a `ticketQrCodes`.
  - `getPaidOrdersForUser` devuelve `status`/`checkedInAt` reales por ticket.
  - `TicketDetailPanel`: `Estado` real; entrada usada = QR atenuado + etiqueta "Usada" + hora de ingreso (Lima) + "Descargar PDF" deshabilitado.
  - `TicketOrderListItem`: resumen agregado "N de M usadas" cuando hay al menos una usada.
- No incluye:
  - Botón de check-in manual, cambios en `check-in.service` / escáner del organizador.
  - Reembolsos, anulaciones, estado "Vencida/Expirada" por evento pasado.
  - Cambiar el agrupamiento Próximas/Pasadas (sigue por fecha del evento) ni renombrar `getOrderStatus`.
  - Filtrar o marcar eventos `cancelled`/`suspended` (ver Preguntas abiertas).
  - Cambios a `generate-tickets-pdf.ts`, `build-ticket-stubs.ts`, `MyTicketsView.tsx`, `app/(public)/mis-entradas/page.tsx`.

## Reutilizar

- `modules/my-tickets/services/get-user-orders.service.ts` (+ test con `createTestDb`/PGlite): se extiende, no se crea servicio nuevo. Ya filtra `orders.status = 'paid'` y `customerId = userId`, así que órdenes `pending`/`expired`/`cancelled` o ajenas no aparecen (cubierto por el test existente "returns only paid orders of the given user", que debe seguir pasando).
- `modules/checkout/utils/build-ticket-stubs.ts`: sin cambios. La numeración de stubs (por orden de `lines`, `quantity` consecutivo) sigue alineada con `tickets[n-1]` porque el servicio conserva el mismo orden de tickets que hoy (`order_items.id`, luego `tickets.createdAt, tickets.qrCode`).
- `modules/my-tickets/utils/get-order-status.ts`: sin cambios; queda solo para el agrupamiento Próximas/Pasadas de `MyTicketsView` (único consumidor tras esta spec). El nombre `OrderStatus = "upcoming" | "past"` sigue siendo coherente con ese uso (es el estado del pedido por fecha, no de la entrada).
- Zona horaria Lima: `modules/organizer/utils/lima-time.ts` solo expone `parseLimaDateTime`/`formatLimaDateTime` (formato `datetime-local` `YYYY-MM-DDTHH:mm`, no apto para mostrar). `modules/users/utils/format-date.ts` usa el patrón `Intl.DateTimeFormat` con `timeZone: "America/Lima"`; se replica ese patrón en un util nuevo de `my-tickets` (no se importa de `users` ni de `organizer` para no acoplar módulos). `formatEventTime` de `events` no fija zona (usa la del runtime), por eso no se reutiliza para `checkedInAt`.
- UI: `Button` (`disabled`), `cn`, clases Tailwind existentes. Sin `shadcn add` (un texto/`Badge` simple basta; no se agrega componente).

Consumidores de `ticketQrCodes` (grep verificado): `modules/checkout/types/checkout.types.ts` (definición), `get-user-orders.service.ts`, `get-user-orders.service.test.ts` (1 test), `TicketDetailPanel.tsx` (2 usos, líneas 60 y 130). No hay mocks ni otros tests que lo usen (`generate-calendar-file.test.ts` arma `ConfirmedOrder` sin él). Por eso se reemplaza en vez de mantener dos campos duplicados.

## Archivos

Nuevos:
- `modules/my-tickets/utils/ticket-status.ts`
- `modules/my-tickets/utils/ticket-status.test.ts`

Modificados:
- `modules/checkout/types/checkout.types.ts`
- `modules/my-tickets/services/get-user-orders.service.ts`
- `modules/my-tickets/services/get-user-orders.service.test.ts`
- `modules/my-tickets/components/TicketDetailPanel.tsx`
- `modules/my-tickets/components/TicketOrderListItem.tsx`

### Contrato de datos

```ts
// modules/checkout/types/checkout.types.ts
export interface OrderTicket {
  qrCode: string
  status: "valid" | "used"
  checkedInAt: string | null // ISO UTC (timestamptz); null si status = "valid"
}

export interface ConfirmedOrder {
  // ...campos existentes sin cambios...
  tickets?: OrderTicket[] // reemplaza a ticketQrCodes; tickets[n-1] <-> stub n de buildTicketStubs
}
```

`tickets` sigue opcional (el tipo también lo arman tests/mocks sin tickets reales). Si falta el ticket `n` (`tickets?.[n-1]` undefined), la UI usa el fallback actual de código/QR (`TICKETERA-<orderNumber>-<n>`) y lo trata como Válida sin hora.

### Utils (`ticket-status.ts`)

```ts
export function formatCheckedInAt(iso: string): string
// "dd/MM/yyyy HH:mm" en America/Lima (UTC-5, sin DST). Intl.DateTimeFormat con formatToParts, hourCycle "h23" (evita "24:xx"), mismo patrón que users/utils/format-date.ts.

export function summarizeTickets(tickets: { status: "valid" | "used" }[] | undefined): { total: number; used: number }
// undefined o [] -> { total: 0, used: 0 }
```

Parámetros estructurales (no importan el tipo de `checkout.types`) para que T2 sea independiente de T1.

## Criterios de aceptación

- AC1: `getPaidOrdersForUser` devuelve `order.tickets` con un objeto `{ qrCode, status, checkedInAt }` por cada ticket de la orden, con `status` = `tickets.status` y `checkedInAt` = `tickets.checked_in_at.toISOString()` (o `null` si es `valid`). `ticketQrCodes` deja de existir en el tipo y en el servicio.
- AC2: El orden de `order.tickets` es el mismo que tenía `ticketQrCodes` (agrupado por línea en el orden de `order_items.id`, dentro de cada línea por `createdAt, qrCode`), de modo que `tickets[n-1]` corresponde al stub `n` de `buildTicketStubs(order.lines)`; el status/checkedInAt viaja junto al `qrCode` (misma fila), no en un arreglo paralelo.
- AC3: Solo aparecen órdenes `paid` del usuario; `pending`, `expired`, `cancelled` y órdenes de otro usuario siguen sin aparecer (sin regresión).
- AC4: En `TicketDetailPanel`, `Estado` muestra "Usada" si `tickets[n-1].status === "used"` y "Válida" si es `valid`; ya no depende de `getOrderStatus` ni de `order.startDate`. Un evento ya pasado con ticket `valid` muestra "Válida"; un evento futuro con ticket `used` muestra "Usada".
- AC5: Para una entrada usada, el panel muestra además "Ingresó: dd/MM/yyyy HH:mm (hora de Lima)" usando `formatCheckedInAt`; para una válida no se muestra esa línea. El QR de la usada sigue visible pero atenuado (`opacity-40`) y la etiqueta "Usada" es visible junto al QR; el botón "Descargar PDF" queda `disabled` (texto "Descargar PDF"; con título/nota "Entrada ya utilizada"). "Agregar al calendario" y "Ver factura" no cambian.
- AC6: `formatCheckedInAt("2026-12-01T20:05:00.000Z")` devuelve `"01/12/2026 15:05"`; `"2026-12-02T05:00:00.000Z"` (medianoche Lima) devuelve `"02/12/2026 00:00"` (no `24:00`); `"2026-12-02T04:59:00.000Z"` devuelve `"01/12/2026 23:59"` (cruce de día en Lima).
- AC7: `summarizeTickets` cuenta `total` y `used`; `undefined` o `[]` devuelven `{ total: 0, used: 0 }`.
- AC8: `TicketOrderListItem` muestra "N de M usadas" (ej. "2 de 5 usadas"; "1 de 1 usada" en singular; "Todas usadas" cuando `used === total` y `total > 1`) solo si `used > 0`; con `used === 0` o sin `tickets` no muestra nada extra. El resto del item no cambia.
- AC9: Las pestañas Próximas/Pasadas siguen agrupando por `getOrderStatus(order.startDate)` (sin cambios en `MyTicketsView`). Una orden con entradas mixtas (algunas usadas, otras válidas) es una sola fila; el detalle recorre las entradas con los botones anterior/siguiente y cada una muestra su propio estado.
- AC10: `npm run test`, `npm run lint` y `npm run build` pasan; los tests existentes (`get-order-status.test.ts`, `build-ticket-stubs.test.ts`, `generate-calendar-file.test.ts`) pasan sin modificarse.

### Casos límite

- Orden con todos los tickets usados: aparece en su pestaña por fecha, fila con "Todas usadas".
- Orden mixta: fila "k de M usadas"; entradas válidas siguen descargables.
- Ticket `used` con `checked_in_at` nulo (dato inconsistente): mostrar "Usada" sin línea de hora (no romper).
- Orden `paid` sin tickets en DB (`tickets` vacío): `tickets = []`, se usa el fallback actual; estado "Válida"; sin resumen.
- `startDate` en el futuro con tickets usados / en el pasado con válidos: manda el estado del ticket (AC4).
- Hora de ingreso cercana a medianoche Lima: el día/hora se calcula en `America/Lima`, no en la zona del servidor/navegador.
- Evento `cancelled`/`suspended`: no cambia el comportamiento actual (ver pregunta 3).

## Tests requeridos

(Vitest, junto al archivo.)

- `modules/my-tickets/utils/ticket-status.test.ts`: `formatCheckedInAt` (AC6: hora normal, medianoche, cruce de día), `summarizeTickets` (AC7: mezcla, todos usados, ninguno, `undefined`, `[]`).
- `modules/my-tickets/services/get-user-orders.service.test.ts` (PGlite, `createTestDb`): adaptar el test "aligns ticketQrCodes..." a `tickets` (mismos asserts de alineación con `buildTicketStubs`, usando `tickets.map(t => t.qrCode)`); nuevo caso con un ticket marcado `used` vía `db.update(tickets)` con `checkedInAt` fijo: devuelve `status: "used"` y `checkedInAt` ISO, los demás `valid`/`null`, y el `qrCode` usado conserva su posición (AC1, AC2); orden mixta en dos líneas; orden `paid` sin tickets -> `tickets: []`. El test "returns only paid orders..." se mantiene (AC3).
- Componentes (`TicketDetailPanel`, `TicketOrderListItem`): sin test (presentacionales, SETUP 3.2).

## Tareas

### T1 — Contrato de datos y servicio
- Archivos: `modules/checkout/types/checkout.types.ts`, `modules/my-tickets/services/get-user-orders.service.ts`, `modules/my-tickets/services/get-user-orders.service.test.ts`
- Depende de: —
- Paralelizable: sí (grupo A, con T2)
- Cubre: AC1, AC2, AC3
- Nota: el servicio agrega `tickets.status` y `tickets.checkedInAt` al select de tickets y arma `{ qrCode, status, checkedInAt }` en lugar de `string[]`. Mantiene el mismo `orderBy`. Tras T1, `TicketDetailPanel` deja de compilar (usa `ticketQrCodes`) hasta T3; `npm run build` global se valida al final.

### T2 — Utils de estado de entrada
- Archivos: `modules/my-tickets/utils/ticket-status.ts`, `modules/my-tickets/utils/ticket-status.test.ts`
- Depende de: —
- Paralelizable: sí (grupo A, con T1)
- Cubre: AC6, AC7

### T3 — Detalle de entrada con estado real
- Archivos: `modules/my-tickets/components/TicketDetailPanel.tsx`
- Depende de: T1, T2
- Paralelizable: sí (grupo B, con T4)
- Cubre: AC4, AC5
- Nota: quitar el import de `getOrderStatus`; leer `order.tickets?.[ticketNumber - 1]` una sola vez y derivar `qrValue`/`shownCode`/estado de ese objeto (hoy lee el índice dos veces).

### T4 — Resumen agregado en la lista
- Archivos: `modules/my-tickets/components/TicketOrderListItem.tsx`
- Depende de: T1, T2
- Paralelizable: sí (grupo B, con T3)
- Cubre: AC8, AC9

### Verificación final
Reviewer corre `npm run test`, `npm run lint`, `npm run build` (AC10) con T1-T4 integradas. Sin tarea de código propia.

Grupos: A = {T1, T2}; B = {T3, T4} (tras A). Archivos disjuntos entre tareas; no hay `T0` (sin cambios compartidos ni `shadcn add`).

## Preguntas abiertas

1. QR y PDF de una entrada usada. Default de esta spec: el QR sigue visible pero atenuado con etiqueta "Usada" y hora de ingreso; el botón "Descargar PDF" (que baja solo la entrada seleccionada) se deshabilita para entradas usadas. Alternativas: (a) ocultar el QR de las usadas; (b) permitir el PDF marcado "USADA". No hay "PDF de toda la orden" hoy, por lo que no se define exclusión masiva.
2. Evento pasado con entrada aún `valid`: default, mostrar "Válida" (estado real, sin estado "Vencida"). Alternativa: agregar un tercer estado derivado por fecha; implicaría nueva regla y copy.
3. Eventos `cancelled`/`suspended`: el servicio hoy no filtra por `events.status` y la orden pagada sigue visible con su entrada "Válida". Default: sin cambios (reembolsos y mensajería fuera de alcance). Alternativa: mostrar un aviso "Evento cancelado/suspendido"; requiere agregar `events.status` al contrato.
4. Resumen en la lista: default, texto "N de M usadas" solo si hay alguna usada. Alternativa: `Badge` de color o mostrarlo siempre ("Válidas: k").
5. `ticketQrCodes` se elimina (reemplazado por `tickets`). Alternativa: mantener ambos campos en transición (duplica datos y riesgo de desalineación); se descarta por DRY al no haber otros consumidores.
6. Formato de la hora de ingreso: default `dd/MM/yyyy HH:mm` en 24 h, hora de Lima, con leyenda "(hora de Lima)". Confirmar.

## Próximas fases

- Estado "Vencida"/"Evento cancelado" derivado del evento (preguntas 2 y 3).
- Refresco en vivo del estado (polling o `revalidate`) tras un check-in mientras el cliente tiene `/mis-entradas` abierta; hoy se ve al recargar la página.
- Reembolsos / reasignación de entradas.
