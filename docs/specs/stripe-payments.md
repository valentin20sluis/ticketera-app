# Stripe Payments

Estado: approved

## Objetivo

Reemplazar el pago simulado del checkout por cobro real con **Stripe Checkout Sessions**
(`mode: payment`, moneda **PEN**), con **factura automática** (`invoice_creation`), tal como
define `docs/superpowers/specs/2026-09-30-ticketing-system-design.md` ("Pagos"). La orden
`pending` con `expires_at` es el hold de cupo; el webhook es la única fuente de verdad para
marcar `paid` y emitir tickets.

## Fuera de alcance

- **Stripe Connect Express** (onboarding del organizador, `application_fee_amount`,
  `transfer_data.destination`, webhook `account.updated`, bloqueo de publicar sin Stripe
  conectado): el system design lo pide, pero es un dominio aparte. Esta spec cobra en la
  cuenta de la plataforma. Ver "Preguntas abiertas".
- **Reembolsos**: no hay (ventas finales, según el system design).
- **Stripe Tax / `automatic_tax`**: no se activa sin registro fiscal activo en Stripe.
- **Job de reconciliación de órdenes `pending`**: red de seguridad, fase siguiente.
- **Facturas manuales o con vencimiento** (Invoicing API): basta la factura automática de Checkout.

## Reutilizar (no duplicar)

- `lib/db/schema.ts`: `orders`, `order_items`, `tickets` ya existen (incluye `stripe_checkout_session_id`, `stripe_payment_intent_id`, `expires_at`).
- `modules/ticketing/services/get-zone-availability.service.ts`: cálculo de cupo.
- `modules/checkout/utils/generate-order-number.ts`, `build-ticket-stubs.ts`, `generate-tickets-pdf.ts`.
- `app/api/webhooks/stripe/route.ts`: ya verifica firma (cuerpo crudo) y maneja `checkout.session.completed` / `async_payment_succeeded`; faltan los `TODO`.
- `app/api/webhooks/clerk/route.ts` + `lib/db/client.ts` (`getDb`): patrón de webhook + acceso a DB.
- `lib/format-currency.ts`.

## Criterios de aceptación

1. `POST /api/checkout` exige sesión Clerk, valida el payload con zod, y en **una transacción** verifica cupo (`SELECT ... FOR UPDATE` sobre `function_zones`), crea la `order` (`pending`, `expires_at` corto) y sus `order_items` con `unit_price` leído de la DB (nunca del cliente). Sin cupo suficiente no se crea la orden y responde 409.
2. Crea una Checkout Session `mode: payment`, `currency: pen`, `line_items` desde `order_items`, `invoice_creation: { enabled: true }`, `metadata.orderId`, `expires_at` alineado con la orden, **sin** `payment_method_types`, con `integration_identifier` (sufijo de 8 letras aleatorias), y devuelve la URL de Checkout. Guarda `stripe_checkout_session_id` en la orden.
3. El webhook, en `checkout.session.completed` y `checkout.session.async_payment_succeeded` con `payment_status === "paid"`, marca la orden `paid`, guarda `stripe_payment_intent_id` y genera un `ticket` (`qr_code` único) por unidad comprada.
4. El webhook es **idempotente**: si la orden ya está `paid` no crea tickets de nuevo; un evento para una orden inexistente responde 200 sin efectos.
5. `checkout.session.expired` pasa la orden a `expired`.
6. `CheckoutPaymentStep` redirige a Stripe Checkout en vez de simular el pago; `success_url` lleva a `/mis-entradas`, `cancel_url` de vuelta al checkout. La página de éxito **no** emite tickets.
7. `/mis-entradas` muestra el enlace a la factura (`hosted_invoice_url`) de cada orden pagada. *(Se obtiene del PaymentIntent/Invoice vía webhook `invoice.paid` y se guarda en la orden; requiere columna nueva `invoice_url`.)*
8. `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` se leen de env; el repo documenta usar una clave restringida (`rk_`) y un sandbox propio.
9. Tests Vitest para: servicio de creación de orden (cupo, precio desde DB), handler de eventos (idempotencia, `payment_status`), y schema zod del payload. `npm run lint`, `npm run test` y `npm run build` pasan.

## Tareas

| # | Tarea | Archivos | Grupo |
|---|-------|----------|-------|
| 1 | Migración: columna `orders.invoice_url` + tipos | `lib/db/schema.ts`, migración, `lib/db/schema.test.ts` | A |
| 2 | Servicio de órdenes: crear orden pending con validación de cupo y marcar paid/expired + emitir tickets (idempotente) | `modules/ticketing/services/order.service.ts`, `order.service.test.ts` | B (tras A) |
| 3 | Cliente Stripe y servicio de Checkout Session | `lib/stripe.ts`, `modules/checkout/services/create-checkout-session.service.ts` (+ test) | B (tras A) |
| 4 | Ruta `POST /api/checkout` + schema zod | `app/api/checkout/route.ts`, `modules/checkout/schemas/checkout-session.schema.ts` (+ test) | C (tras 2, 3) |
| 5 | Completar webhook: paid/expired/invoice.paid usando el servicio de órdenes | `app/api/webhooks/stripe/route.ts` (+ test) | C (tras 2) |
| 6 | UI: `CheckoutPaymentStep` redirige a Stripe; `/mis-entradas` muestra enlace de factura | `modules/checkout/components/CheckoutPaymentStep.tsx`, `modules/my-tickets/components/*` | D (tras 4) |

## Preguntas abiertas

1. **¿Stripe Connect en esta fase?** El system design reparte el dinero al organizador (destination charge + comisión). Esta spec cobra todo en la plataforma. Si Connect debe ir ya, hay que sumar una spec previa de onboarding.
2. **Cuenta Stripe:** ¿país de registro y soporte de PEN en la cuenta? Verificar en el Dashboard antes de implementar.
