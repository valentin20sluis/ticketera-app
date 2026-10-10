# Stripe Real Data

Estado: approved

## Objetivo

`docs/specs/stripe-payments.md` está implementada, pero el flujo no se puede demostrar de
punta a punta: la página de entradas y el checkout usan `MOCK_EVENTS` + `getVenueZones()` (ids
como `campo-vip`) mientras `POST /api/checkout` exige `functionZoneId` UUID de `function_zones`,
y `/mis-entradas` usa `MOCK_TICKET_ORDERS`, por lo que nunca se ven las órdenes pagadas, los
tickets reales ni `orders.invoice_url`. Esta spec reemplaza esos dos mocks por datos reales de
la DB (modelo de `docs/superpowers/specs/2026-09-30-ticketing-system-design.md`) y limpia los
huérfanos que dejó el pago con Stripe.

## Fuera de alcance

- **Stripe Connect** (onboarding, `application_fee_amount`, destination charges): igual que en `stripe-payments.md`.
- **Reembolsos**: no hay (ventas finales).
- **Catálogo público con datos reales** (`/`, `/eventos`, `/eventos/[slug]`, `HeroCarousel`, `EventCard`, etc., que siguen leyendo `MOCK_EVENTS`/`MOCK_CATEGORIES`) y el flag `featured`/`priceFrom`/`status` derivados de DB: ver "Preguntas abiertas" 1 y "Fases siguientes".
- **Páginas del organizador** (`modules/organizer/*` usa `MOCK_CATEGORIES` y su propio mock).
- **Refresco automático de `/mis-entradas`** si el webhook aún no marcó la orden `paid` al volver de Stripe (ver pregunta 3).
- **Estado `used` del ticket** y check-in en la UI de `/mis-entradas` (sigue el estado por fecha de `getOrderStatus`).
- Mover `ConfirmedOrder` fuera de `modules/checkout/types/`.

## Reutilización

- Existente que se reutiliza:
  - `modules/ticketing/services/get-zone-availability.service.ts` (`getZoneAvailability`): `available` de cada zona.
  - `modules/users/services/current-user.service.ts` (`getCurrentUser`): usuario autenticado (`users.id`) para filtrar órdenes.
  - `lib/db/schema.ts`: `events`, `event_functions`, `function_zones`, `venue_zones`, `venues`, `orders`, `order_items`, `tickets` (sin cambios de schema ni migración).
  - `lib/db/seed/event-catalog.ts` + `scripts/seed-events.ts` (`npm run db:seed -- <email-organizador>`): ya cargan los `MOCK_EVENTS` en la DB conservando los **slugs**, así que `/eventos/[slug]` (mock) y `/eventos/[slug]/entradas` (DB) apuntan al mismo evento. Sin cambios.
  - `modules/events/hooks/useTicketSelection.ts`, `CheckoutFlow`, `CheckoutPaymentStep`, `useCheckoutPayment`: sin cambios. Como `VenueZone.id` pasará a ser el id de `function_zones`, `line.zoneId` ya es el `functionZoneId` que envía `useCheckoutPayment`.
  - `modules/events/types/venue-zone.types.ts` (`VenueZone`) y `event.types.ts` (`Event`): forma de salida del servicio nuevo.
  - `modules/checkout/utils/build-ticket-stubs.ts`, `generate-tickets-pdf.ts`, `generate-calendar-file.ts`, `modules/my-tickets/components/MyTicketsView.tsx` / `TicketOrderListItem.tsx`, `modules/my-tickets/utils/*`: se conservan (los usa `TicketDetailPanel`).
  - `TicketDetailPanel` ya renderiza "Ver factura" cuando `order.invoiceUrl` existe.
  - `lib/db/test-helpers.ts` (`createTestDb`) para los tests de servicio con PGlite.
- Existente que se extiende:
  - `modules/checkout/types/checkout.types.ts`: `ConfirmedOrder` gana `ticketQrCodes?: string[]` (T2); luego `CheckoutStep` pierde `"confirmation"` (T6).
  - `modules/my-tickets/components/TicketDetailPanel.tsx`: el QR usa `tickets.qr_code` real cuando está disponible.
  - `modules/events/services/venue-zone.service.ts`: se elimina `getVenueZones()` (queda sin usos); se conservan `MAX_TICKETS_PER_ZONE`, `isZoneSoldOut`, `getZoneMaxQuantity`.
  - `modules/checkout/components/CheckoutStepper.tsx`: pasa a 2 pasos.
- Nuevo (y por qué no sirve nada existente):
  - `modules/ticketing/services/get-event-checkout.service.ts`: `event.service.ts` solo filtra arrays en memoria y `getZoneAvailability` opera por un solo `functionZoneId`; no hay nada que lea evento + función + zonas con disponibilidad desde la DB.
  - `modules/my-tickets/services/get-user-orders.service.ts`: no existe lectura de órdenes/tickets del usuario.
- Se elimina (dead code verificado con grep, sin importadores fuera de sí mismos y sus tests/docs):
  - `modules/checkout/components/CheckoutConfirmationStep.tsx` (nadie lo importa; Stripe redirige a `/mis-entradas`).
  - `modules/checkout/components/TicketStubCard.tsx` (solo lo importa `CheckoutConfirmationStep`).
  - `modules/checkout/utils/generate-order-number.ts` + `.test.ts` (nadie lo importa; el número de pedido pasará a derivarse del `order.id`).
  - `modules/my-tickets/data/my-tickets.mock.ts` (`MOCK_TICKET_ORDERS`, reemplazado por DB).
  - Se **conservan** `build-ticket-stubs.ts`, `generate-tickets-pdf.ts`, `generate-calendar-file.ts` (los usa `TicketDetailPanel`) y `modules/events/data/venue-zones.mock.ts` (lo usa el seed).
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. Precondición operativa: DB migrada y sembrada con `npm run db:seed -- <email-organizador>`.

## Criterios de aceptación

- AC-1: `getCheckoutEventBySlug(db, slug)` devuelve `null` si el slug no existe, el evento no está `published` o no tiene función con `starts_at >= now`.
- AC-2: Para un evento válido devuelve `{ event, zones }` donde `event` cumple `Pick<Event, "title" | "slug" | "imageUrl" | "venueName" | "city" | "startDate">` (la función **próxima** más cercana; `startDate` en ISO) y cada `VenueZone` tiene `id` = `function_zones.id` (UUID), `name` del `venue_zones`, `price` numérico de `function_zones.price`, `capacity` de `function_zones.capacity`, `shape` de `venue_zones.shape_*` y `available` = `max(0, getZoneAvailability)`.
- AC-3: `/eventos/[slug]/entradas` ya no importa `MOCK_EVENTS` ni `getVenueZones`; llama a `getCheckoutEventBySlug`, hace `notFound()` si devuelve `null` y se renderiza por request (`await connection()` de `next/server`, para no cachear la disponibilidad).
- AC-4: `getVenueZones` ya no existe en `venue-zone.service.ts`; su test se actualiza y `npx vitest run modules/events` pasa.
- AC-5: Con la DB sembrada, el `functionZoneId` que `useCheckoutPayment` envía a `POST /api/checkout` es un UUID de `function_zones` y la API responde 200 con la URL de Stripe (verificable manualmente).
- AC-6: `getPaidOrdersForUser(db, userId)` devuelve solo órdenes `paid` de ese `customer_id`, ordenadas por `created_at` descendente, con la forma `ConfirmedOrder`: `orderNumber` = `TKT-` + primeros 8 caracteres del `order.id` en mayúsculas; `eventTitle`, `eventImageUrl`, `venueName`, `city`, `startDate` (ISO de `event_functions.starts_at`) del evento de la orden; `lines` (una por `order_item`: `zoneId` = `function_zone_id`, `zoneName` = nombre de `venue_zones`, `price` = `unit_price`, `quantity`, `subtotal`); `totalQuantity`, `totalAmount` = `orders.total_amount`; `invoiceUrl` = `orders.invoice_url` o `undefined` si es null.
- AC-7: `ticketQrCodes` contiene los `tickets.qr_code` de la orden en el mismo orden en que `buildTicketStubs(order.lines)` numera las entradas (agrupados por línea, en el orden de `lines`), de modo que `ticketQrCodes[n-1]` corresponde a la entrada `n`. Órdenes `pending`, `expired`, `cancelled` o de otro usuario no aparecen.
- AC-8: `/mis-entradas` ya no importa `MOCK_TICKET_ORDERS`; obtiene el usuario con `getCurrentUser()` (si es `null`, `redirect("/ingresar")`) y pasa las órdenes reales a `MyTicketsView`. `modules/my-tickets/data/my-tickets.mock.ts` no existe y `grep MOCK_TICKET_ORDERS` no devuelve resultados.
- AC-9: `TicketDetailPanel` codifica en el QR `order.ticketQrCodes?.[ticketNumber - 1]` y solo usa `TICKETERA-<orderNumber>-<n>` como fallback si no existe; "Ver factura" se muestra cuando `invoiceUrl` está presente (comportamiento ya existente, no se rompe).
- AC-10: Los 4 archivos huérfanos (Confirmation, StubCard, generate-order-number + test) quedan eliminados; `grep -r "CheckoutConfirmationStep\|TicketStubCard\|generate-order-number" --include=*.ts --include=*.tsx .` solo devuelve resultados en `docs/`.
- AC-11: `CheckoutStep` es `"tickets" | "payment"`; `CheckoutStepper` muestra 2 pasos y compila; `CheckoutFlow` y `CheckoutPaymentStep` siguen funcionando sin cambios.
- AC-12: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tareas

### T1 — Servicio de evento + zonas con disponibilidad desde la DB

- Archivos: `modules/ticketing/services/get-event-checkout.service.ts` (crear), `modules/ticketing/services/get-event-checkout.service.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1, AC-2
- Tests: `get-event-checkout.service.test.ts` con `createTestDb` + `seedEventCatalog` — slug inexistente → `null`; evento `draft` → `null`; sin función futura → `null`; zonas con ids UUID de `function_zones`; `available` descuenta una orden `paid` y una `pending` vigente pero no una `pending` vencida; con varias funciones elige la próxima.
- [x] Completada

### T2 — Servicio de órdenes pagadas del usuario + contrato `ticketQrCodes`

- Archivos: `modules/my-tickets/services/get-user-orders.service.ts` (crear), `modules/my-tickets/services/get-user-orders.service.test.ts` (crear), `modules/checkout/types/checkout.types.ts` (modificar: agregar `ticketQrCodes?: string[]` a `ConfirmedOrder`)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-6, AC-7
- Tests: `get-user-orders.service.test.ts` con PGlite — solo `paid` y solo del usuario; orden de más reciente a más antigua; `orderNumber`, `lines`, `totalQuantity`, `invoiceUrl` presente/ausente; correspondencia `ticketQrCodes` ↔ numeración de `buildTicketStubs` con 2 líneas de cantidades distintas. Supuesto: una orden pertenece a un solo evento (así la crea la UI); el mapeo toma el evento del primer `order_item`.
- [x] Completada

### T3 — Página de entradas con datos reales

- Archivos: `app/(public)/eventos/[slug]/entradas/page.tsx` (modificar), `modules/events/services/venue-zone.service.ts` (modificar: quitar `getVenueZones` y el import de `MOCK_VENUE_ZONES`), `modules/events/services/venue-zone.service.test.ts` (modificar: quitar el caso de `getVenueZones`)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-3, AC-4, AC-5
- Tests: actualizar el test existente de `venue-zone.service`; la página solo compone (SETUP.md 3.2).
- [x] Completada

### T4 — `/mis-entradas` con órdenes reales y QR real

- Archivos: `app/(public)/mis-entradas/page.tsx` (modificar), `modules/my-tickets/components/TicketDetailPanel.tsx` (modificar: valor del QR), `modules/my-tickets/data/my-tickets.mock.ts` (eliminar)
- Depende de: T2
- Grupo paralelo: G2
- Cubre: AC-8, AC-9
- Tests: no aplica (página y componente de presentación, SETUP.md 3.2).
- [x] Completada

### T5 — Eliminar huérfanos del checkout

- Archivos: `modules/checkout/components/CheckoutConfirmationStep.tsx` (eliminar), `modules/checkout/components/TicketStubCard.tsx` (eliminar), `modules/checkout/utils/generate-order-number.ts` (eliminar), `modules/checkout/utils/generate-order-number.test.ts` (eliminar)
- Depende de: ninguna (antes de borrar, el developer re-ejecuta el grep de AC-10 para confirmar que nadie los importa)
- Grupo paralelo: G1
- Cubre: AC-10
- Tests: no aplica (eliminación; el test de `generate-order-number` se borra junto con su util).
- [x] Completada

### T6 — Quitar el paso `confirmation` del tipo y del stepper

- Archivos: `modules/checkout/types/checkout.types.ts` (modificar: `CheckoutStep` sin `"confirmation"`), `modules/checkout/components/CheckoutStepper.tsx` (modificar: dejar solo `tickets` y `payment`; renombrar la etiqueta "Datos y pago" a "Pago" porque ya no hay formulario de datos)
- Depende de: T2, T5 (T2 también toca `checkout.types.ts`; T5 elimina el último consumidor de `"confirmation"`)
- Grupo paralelo: G2
- Cubre: AC-11, AC-12
- Tests: no aplica (tipo + componente presentacional).
- [x] Completada

## Grupos paralelos

- G1: T1, T2, T5 (archivos disjuntos).
- G2: T3 (tras T1), T4 (tras T2), T6 (tras T2 y T5) (archivos disjuntos).

## Preguntas abiertas

1. **Catálogo `/`, `/eventos`, `/eventos/[slug]` y seed.** Hoy leen `MOCK_EVENTS` y el seed (`lib/db/seed/event-catalog.ts`) copia esos mocks a la DB con los mismos slugs. Recomendación: en esta fase dejar el catálogo en mocks (los slugs coinciden con la DB sembrada) y migrarlo en una Fase 2, que requiere decidir cómo derivar `featured` (no existe columna), `priceFrom` (mín. de `function_zones.price`) y `status` (`available`/`last-tickets`/`sold-out` según disponibilidad). Riesgo asumido: un evento que se agregue a `MOCK_EVENTS` sin volver a sembrar da 404 en `/entradas`.
2. **Fechas del seed.** El seed usa `startDate` de los mocks; con hoy 2026-10-09, algunos eventos ya pasaron y `/entradas` dará 404 (AC-1). Recomendación: aceptarlo y, si se quiere demostrar todo el catálogo, actualizar fechas en `events.mock.ts` (fuera de esta spec).
3. **Carrera webhook vs. redirección.** `success_url` es `/mis-entradas`; si el webhook aún no marcó la orden `paid`, la compra no aparece hasta recargar. Recomendación: no resolverlo ahora (YAGNI); si molesta, Fase 2 con `router.refresh()` o un banner "procesando pago".
4. **Eventos con varias funciones.** La spec elige la próxima función; el sistema de diseño permite varias por evento pero la UI no tiene selector. Recomendación: no agregar selector hasta que haya eventos multifunción reales.

## Fases siguientes

- Fase 2: catálogo (`/`, `/eventos`, `/eventos/[slug]`) desde la DB; categorías fijas mapeadas por `event_categories.icon_key` = id de `MOCK_CATEGORIES`.
- Fase 3: estado real del ticket (`valid`/`used`) en `/mis-entradas` y aviso de pago en proceso.
