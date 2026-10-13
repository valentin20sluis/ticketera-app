# Página Pagos del organizador (/organizador/pagos)

Estado: aprobada

## Objetivo

Reemplazar el stub `PanelComingSoon` de `/organizador/pagos` por una página centrada en **cobros**: totales del período (bruto, comisión de plataforma, neto) y listado de órdenes pagadas de los eventos del organizador, más un resumen compacto del estado de su cuenta Stripe con enlace a `/organizador/configuracion` (donde ya vive el CTA de onboarding). Tarjeta Trello 09.

No toca auth ni pagos más allá de leer datos (el rol lo verifica `requireRole`). Referencia de datos: `docs/specs/stripe-destination-charges.md` y `docs/specs/organizer-settings.md`.

Hallazgos de código (verificados):

- Comisión y neto **no se guardan**. `orders` solo tiene `total_amount` (numeric, 2 decimales), `currency` (default `PEN`), `stripe_payment_intent_id`, `created_at`; `order_items` tiene `quantity` y `unit_price`. La comisión se calcula en el checkout (`create-checkout-session.service.ts`) con `calculatePlatformFee(totalMinor, parsePlatformFeePercent(process.env.PLATFORM_FEE_PERCENT))` y se envía a Stripe como `application_fee_amount`. Por tanto aquí se **recalcula** con la misma función y el mismo env (ver pregunta 1).
- Moneda: PEN en todas las órdenes (columna con default `PEN`); se muestra con `formatPrice` (`lib/format-currency.ts`).
- Órdenes que cuentan: solo `orders.status = 'paid'` (mismo criterio que `get-organizer-summary.service.ts`).
- Propiedad: `order_items -> function_zones -> event_functions -> events.organizer_id = actor.id` (mismo join que el resumen). Admin/super_admin no tienen cuenta Connect; la página es solo para rol `organizer`.
- Estado de cuenta: `deriveConnectState(user)` (`not_connected` | `pending` | `active`) ya existe. `PaymentsSettingsSection` tiene el título fijo "2. Pagos" y es parte de la numeración de Configuración, por eso **no se reutiliza tal cual**: se muestra un resumen pequeño propio con enlace a configuración (sin duplicar el botón de onboarding).
- Express Dashboard (login link): **queda fuera**. La cuenta Connect usa la API v2 de Stripe; el login link clásico (`accounts.createLoginLink`) es de la API v1 de cuentas Express y no se ha verificado su equivalente en v2 en este repo. No cuesta poco, se deja en Próximas fases.

## Alcance

- Incluye:
  - Servicio `getOrganizerPayments(db, organizer, options)` con DB inyectada: totales del período y listado.
  - Selector simple de período (enlaces `?periodo=todo|30d`, default `todo`).
  - Resumen del estado de la cuenta (badge: sin conectar / pendiente / activa, y si no está activa un enlace "Ir a configuración").
  - Tabla de cobros: orden, evento, bruto, comisión, neto, fecha. Máximo 50, más recientes primero.
  - Estado vacío ("Aún no tienes cobros").
- No incluye:
  - Express Dashboard / login link de Stripe.
  - Guardar la comisión en la DB (migración) ni snapshot del porcentaje.
  - Paginación con navegación, filtros por evento, exportación, reembolsos/disputas, saldo o payouts de Stripe.
  - Cambios en checkout, onboarding, `PaymentsSettingsSection` o `PanelComingSoon` (queda en uso por otras páginas).

## Reutilizar

- `calculatePlatformFee`, `parsePlatformFeePercent` (`modules/payments/utils/platform-fee.ts`).
- `deriveConnectState` y tipo `ConnectState` (`modules/payments/utils/connect-status.ts`).
- `requireRole` (`modules/users/services/current-user.service.ts`).
- Patrón y joins de `modules/organizer/services/get-organizer-summary.service.ts`; `createTestDb` (`@/lib/db/test-helpers`) para los tests.
- `formatPrice` (`lib/format-currency.ts`), `lima-time.ts` en `modules/organizer/utils/` si ya ofrece formato de fecha (verificar antes de crear uno).
- shadcn existentes: `card`, `badge`, `button`. Para la tabla, `table` si ya está en `components/ui` (si no, `npx shadcn@latest add table` en la tarea T2, sin tarea base aparte porque solo T2 lo usa).
- Enlace/estilo como `OrganizerSummaryStats.tsx` para las tarjetas de totales.

## Archivos

Nuevos:
- `modules/organizer/services/get-organizer-payments.service.ts` y `.test.ts`
- `modules/organizer/components/OrganizerPaymentsView.tsx` (estado de cuenta, selector, totales y tabla; presentacional)

Modificados:
- `app/(panel)/organizador/pagos/page.tsx`

## Criterios de aceptación

- AC1: `getOrganizerPayments(db, organizer, { feePercent, since?, limit = 50 })` devuelve `{ totals: { gross, fee, net, orders }, payments }` donde cada pago es `{ orderId, eventTitle, gross, fee, net, paidAt }`. Montos en soles (número con 2 decimales). Solo cuenta órdenes `paid`.
- AC2: Solo incluye ventas de eventos con `organizer_id = organizer.id`; órdenes de otro organizador no aparecen ni suman. Eventos del organizador en cualquier estado (publicado, cancelado, etc.) sí cuentan.
- AC3: `gross` por orden = suma de `unit_price * quantity` de sus ítems del organizador; `fee = calculatePlatformFee(grossMinor, feePercent)` en unidades menores (redondeo half-up de esa función) y `net = gross - fee`. Con `feePercent = 0`, `fee = 0` y `net = gross`.
- AC4: `totals` suma sobre **todas** las órdenes del período (agregado, no depende del límite de 50); `payments` está limitado a `limit`, ordenado por fecha de creación descendente.
- AC5: Con `since`, solo cuentan órdenes con `created_at >= since`; sin `since`, todo el historial. Sin órdenes: totales en 0 y lista vacía.
- AC6: Una orden con ítems de varias funciones del mismo evento aparece como una sola fila (agrupada por orden).
- AC7: La página exige rol `organizer` (`requireRole(["organizer"])`), lee `searchParams.periodo` (`30d` -> `since = ahora - 30 días`; cualquier otro valor -> todo) y parsea `PLATFORM_FEE_PERCENT` con `parsePlatformFeePercent`.
- AC8: La vista muestra el estado de cuenta con texto accesible (Sin conectar / Pendiente / Activa) y, si no es `active`, un enlace "Ir a configuración" a `/organizador/configuracion`; muestra tarjetas de totales (Bruto, Comisión, Neto, Nº de cobros), el selector de período con el activo marcado (`aria-current`), la tabla con las columnas orden, evento, bruto, comisión, neto, fecha, y el estado vacío cuando no hay cobros.
- AC9: Importes con `formatPrice`; fechas en hora de Lima. El `orderId` se muestra abreviado (8 primeros caracteres).
- AC10: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo; `createTestDb`)

- `modules/organizer/services/get-organizer-payments.service.test.ts`: AC1 a AC6 (solo `paid`; excluye `pending/expired/cancelled`; aislamiento entre organizadores; cálculo de comisión/neto con 10% y con 0%; redondeo; totales con más órdenes que `limit`; filtro `since`; orden descendente; orden multi-función = una fila; vacío).
- Sin tests para la vista ni la página (presentacionales; la lógica está en servicio y utils ya testeados).

## Tareas

### T1 — Servicio de cobros
- Archivos: `modules/organizer/services/get-organizer-payments.service.ts`, `modules/organizer/services/get-organizer-payments.service.test.ts`
- Depende de: —
- Paralelizable: sí (archivos disjuntos de T2; T2 puede maquetarse contra el tipo de retorno de AC1)
- Cubre: AC1, AC2, AC3, AC4, AC5, AC6

### T2 — Vista y página
- Archivos: `modules/organizer/components/OrganizerPaymentsView.tsx`, `app/(panel)/organizador/pagos/page.tsx` (y `components/ui/table.tsx` solo si falta)
- Depende de: T1 (tipos y servicio)
- Paralelizable: no
- Cubre: AC7, AC8, AC9, AC10

## Pendientes humanos (fuera del código)

- Verificar en el navegador con órdenes **pagadas reales** (checkout de prueba de Stripe con una cuenta Connect activa): que la fila aparezca, que bruto/comisión/neto coincidan con el `application_fee_amount` del PaymentIntent en el dashboard de Stripe y que el selector 30 días / todo se comporte bien.
- Confirmar que `PLATFORM_FEE_PERCENT` del entorno es el mismo con el que se cobraron las órdenes que se prueban.

## Preguntas abiertas

1. **Comisión recalculada vs guardada.** Default: recalcular con el `PLATFORM_FEE_PERCENT` actual (sin migración, coherente con el demo). Limitación: si el porcentaje cambia, el histórico mostrado puede no coincidir con lo cobrado. Alternativa: columna `orders.platform_fee_amount` escrita en el checkout/webhook (migración + cambio en pagos).
2. **Período por defecto.** Default: todo el historial, con selector "Últimos 30 días / Todo". Alternativa: 30 días por defecto.
3. **Express Dashboard.** Default: fuera de esta fase (ver hallazgos). Si se quiere, spec aparte tras verificar el equivalente v2 del login link.

## Próximas fases

- Botón "Ver panel de Stripe" (Express Dashboard / login link).
- Persistir la comisión por orden y mostrar detalle de payouts/saldo.
- Paginación y filtro por evento; reembolsos.
