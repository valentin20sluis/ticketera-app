# Stripe Connect: comisión de plataforma y pago al organizador (destination charge)

Estado: approved

## Objetivo

Que el checkout cobre en la plataforma pero deje el dinero en la cuenta conectada del organizador dueño del evento, reteniendo la comisión de la plataforma: la Checkout Session (`mode: payment`) lleva `payment_intent_data.transfer_data.destination = users.stripe_account_id` y `payment_intent_data.application_fee_amount = round(total * PLATFORM_FEE_PERCENT / 100)` en la unidad mínima de la moneda.

Antes de crear nada (orden ni sesión) el servidor valida que la compra sea de un solo evento y que su organizador pueda cobrar (`stripe_account_id` presente y `stripe_charges_enabled = true`).

Referencias:
- Diseño aprobado `docs/superpowers/specs/2026-09-30-ticketing-system-design.md`, secciones "Pagos (Stripe Connect)" (paso 2 del checkout) y "Testing" (test de `application_fee_amount`).
- Tarea 01 (`docs/specs/stripe-connect-onboarding.md`, done): cuentas Accounts v2 `recipient` con `stripe_transfers`; `users.stripe_charges_enabled` = `stripe_transfers` active, sincronizado por webhook.
- Guía del repo `.agents/skills/stripe-best-practices/references/connect.md` (destination charges + `application_fee_amount`; "Recommending `on_behalf_of` for standard marketplace flows" es un anti-patrón).
- Docs Stripe consultadas (`stripe docs /connect/destination-charges`): ver "Decisiones" 2 y 3.

### Decisiones de diseño (explícitas)

1. **Destination charge sin `on_behalf_of`** (la plataforma es merchant of record). Es el patrón de la guía del repo y de la tarea 01. Hallazgo de docs: `on_behalf_of` "is supported only for connected accounts with a payments capability such as `card_payments`; accounts under the recipient service agreement can't request `card_payments`". Las cuentas de la tarea 01 son solo `recipient`, así que `on_behalf_of` hoy fallaría. Adoptarlo exigiría rehacer el onboarding con `merchant`/`card_payments` (más largo, más KYC); queda fuera.
2. **Moneda y país: riesgo abierto, sin cambio de código por defecto.** La sesión sigue en PEN (`create-checkout-session.service.ts`) y las cuentas se crean en `STRIPE_CONNECT_ACCOUNT_COUNTRY` (default `us`). Docs: si plataforma y cuenta conectada no están en la misma región, el destination charge normalmente exige `on_behalf_of` (salvo las excepciones de cross-border transfers de `connect/account-capabilities#transfers-cross-border`, que aplican a recipients bajo ciertas combinaciones plataforma/país). Además, sin `on_behalf_of` el cobro se liquida en la moneda de liquidación de la plataforma y la cuenta conectada recibe el monto convertido; `application_fee_amount` se calcula siempre en la moneda de la transacción (PEN) y se liquida en la moneda de liquidación de la conectada. No se puede afirmar desde la documentación que "PEN -> cuenta `us`" sea válido para esta plataforma: depende del país de la plataforma Stripe y de los acuerdos cross-border. Esto es la pregunta abierta 1 y debe confirmarse en sandbox antes de aprobar la spec. Mientras tanto, si Stripe rechaza la combinación, el flujo ya está cubierto: la sesión falla, la orden se libera (ver "Fallo de la sesión") y el usuario ve un error genérico.
3. **Una orden = un solo evento (y por tanto un solo organizador).** Un destination charge admite un único destino; repartir un carrito entre organizadores exigiría separate charges and transfers (fuera de alcance). Se elige restringir por **evento** (más estricto que por organizador) porque además hace correcto el `cancelUrl` (hoy usa el slug del primer ítem) y evita carritos raros entre funciones de eventos distintos. La UI actual selecciona entradas dentro de `/eventos/[slug]/entradas` (un evento por vez), así que en la práctica la restricción solo se ve si alguien manipula el payload; aun así se valida en el servidor.
4. **Validación en servicio, no en el schema zod.** `checkoutSessionSchema` solo valida forma (uuid, cantidades); saber a qué evento/organizador pertenece cada zona requiere DB, así que vive en un servicio nuevo con DB inyectada. El schema no cambia.
5. **Validar antes de crear la orden.** El resolver corre antes de `createPendingOrder`: si falla, no existe orden `pending` ni stock retenido y no hay nada que liberar. La configuración de comisión (`PLATFORM_FEE_PERCENT`) también se lee antes de crear la orden.
6. **Comisión: función pura, falla segura.** `calculatePlatformFee(totalMinor, percent)` redondea half-up sobre enteros (el % se pasa a puntos básicos con `Math.round(percent * 100)` para evitar deriva de punto flotante). `PLATFORM_FEE_PERCENT` ausente, vacío, no numérico, negativo o > 100 lanza `InvalidPlatformFeeError`: nunca se cobra sin comisión por error de configuración. `0` es válido y significa comisión 0: se omite `application_fee_amount` (no se envía `0`). La comisión nunca supera el total.
7. **Facturas (`invoice_creation`) se mantienen.** Sin `on_behalf_of`, la factura y el PaymentIntent viven en la cuenta de la plataforma, por lo que `invoice.paid` sigue llegando al endpoint de plataforma `app/api/webhooks/stripe/route.ts` con la misma `metadata.orderId`; ese archivo no se toca. Las docs consultadas no detallan la interacción `invoice_creation` + `transfer_data`/`application_fee_amount`, por lo que se marca como verificación obligatoria en sandbox (AC15 y pregunta abierta 4).
8. **El flag de DB es la fuente de verdad en el momento del cobro.** Se valida `stripeAccountId` y `stripeChargesEnabled` de `users` (sincronizados por el webhook de la tarea 01). No se hace `retrieve` a Stripe en cada checkout (latencia); si la cuenta dejó de ser válida, Stripe rechaza la sesión y se aplica "Fallo de la sesión".

### Contrato HTTP de `POST /api/checkout` (errores con cuerpo `{ error: <código> }`)

| Estado | `error` | Cuándo |
|---|---|---|
| 401 | `unauthorized` | sin sesión o suspendido (sin cambio) |
| 400 | `invalid_payload` | payload inválido o alguna `functionZoneId` inexistente |
| 422 | `multiple_events` | los ítems pertenecen a más de un evento |
| 409 | `organizer_payments_unavailable` | el organizador del evento no tiene `stripe_account_id` o `stripe_charges_enabled = false` |
| 409 | `insufficient_stock` | sin cupo (sin cambio) |
| 503 | `payments_misconfigured` | `PLATFORM_FEE_PERCENT` inválido o ausente |
| 502 | `checkout_unavailable` | Stripe falló al crear la sesión; la orden ya fue liberada |
| 200 | — | `{ url }` |

Los mensajes nunca incluyen ids de cuenta ni texto de errores de Stripe (se loguean en servidor).

## Alcance

- Incluye:
  - Util `calculatePlatformFee` y lector de `PLATFORM_FEE_PERCENT` con falla segura.
  - Servicio `resolveCheckoutDestination` (un evento, organizador listo para cobrar).
  - `createCheckoutSession` con `payment_intent_data` (`application_fee_amount` + `transfer_data.destination`).
  - `POST /api/checkout`: validaciones previas, códigos de error, liberación de la orden si la sesión falla, `cancelUrl` con el slug del evento resuelto.
  - Cliente (`requestCheckoutUrl` + `useCheckoutPayment`): mapear los nuevos errores a mensajes.
  - `.env.example` y nota "Estado de implementación" del diseño.
- No incluye:
  - Página de pagos del organizador (tarea 09), bloquear publicar sin Stripe (tarea 03; aquí solo se valida al cobrar), reembolsos (reverse transfer / refund de comisión), comisión por organizador o evento.
  - `on_behalf_of`, cobros multi-organizador (separate charges and transfers), cambio de moneda, cambios en onboarding/webhook de Connect.
  - Cambios en `app/api/webhooks/stripe/route.ts` ni en `lib/db/schema.ts` (no hay migración).
  - Validar que el evento esté `published` ni que el organizador no esté suspendido (no lo pide el requerimiento; hoy tampoco se valida).

## Reutilizar

- `modules/ticketing/services/order.service.ts`: `createPendingOrder`, `attachCheckoutSession`, `InsufficientStockError`, y `markOrderExpired` (libera el stock de una orden `pending` al instante, ya que `getZoneAvailability` solo cuenta `paid` y `pending` no vencidas). No se crea un `cancelOrder` nuevo.
- `modules/checkout/services/create-checkout-session.service.ts` (se amplía), `modules/checkout/schemas/checkout-session.schema.ts` (sin cambios).
- `modules/checkout/services/request-checkout-url.service.ts` y `modules/checkout/hooks/useCheckoutPayment.ts` (se amplían; tests existentes como base).
- `lib/db/schema.ts` (`users`, `events`, `eventFunctions`, `functionZones`), `lib/db/client.ts` (`Db`), `lib/db/test-helpers.ts` (`createTestDb`, PGlite), patrón de test de `create-checkout-session.service.test.ts` y `order.service.test.ts`.
- `modules/payments/` (carpeta de la tarea 01) para el util de comisión; no se reusa `connect-status.ts` (la regla de "listo" aquí es solo `stripeAccountId && stripeChargesEnabled`, no exige `payouts`).
- `lib/stripe.ts` (`stripe`).

## Archivos

Nuevos:
- `modules/payments/utils/platform-fee.ts` + `platform-fee.test.ts`
- `modules/checkout/services/resolve-checkout-destination.service.ts` + `resolve-checkout-destination.service.test.ts`
- `app/api/checkout/route.test.ts`

Modificados:
- `.env.example` (comentario de `PLATFORM_FEE_PERCENT`)
- `modules/checkout/services/create-checkout-session.service.ts` + `create-checkout-session.service.test.ts`
- `app/api/checkout/route.ts`
- `modules/checkout/services/request-checkout-url.service.ts` + `request-checkout-url.service.test.ts`
- `modules/checkout/hooks/useCheckoutPayment.ts` + `useCheckoutPayment.test.ts`
- `docs/superpowers/specs/2026-09-30-ticketing-system-design.md` (solo la nota "Estado de implementación" del paso 2 de Pagos)

Variables de entorno (`.env.example`): `PLATFORM_FEE_PERCENT=10` ya existe; se documenta: porcentaje de 0 a 100 (admite decimales) aplicado al total de cada compra; si falta o es inválido el checkout responde 503 y no cobra. No se agregan variables nuevas. `STRIPE_CONNECT_ACCOUNT_COUNTRY` ya existe (tarea 01).

Firmas propuestas (el developer puede ajustar nombres internos, no el contrato):
- `parsePlatformFeePercent(raw: string | undefined): number` (lanza `InvalidPlatformFeeError`) y `calculatePlatformFee(totalMinor: number, percent: number): number`.
- `resolveCheckoutDestination(db, functionZoneIds: string[])` -> `{ ok: true; eventSlug: string; stripeAccountId: string } | { ok: false; error: "zone_not_found" | "multiple_events" | "organizer_payments_unavailable" }`.
- `CreateCheckoutSessionInput` gana `destinationAccountId: string` y `feePercent: number` (obligatorios: todo checkout pasa por Connect).

## Criterios de aceptación

Comisión
- AC1: `calculatePlatformFee(total, percent)` = `round(total * percent / 100)` half-up en unidad mínima: `(10000, 10) = 1000`, `(1005, 10) = 101`, `(1004, 10) = 100`, `(1, 10) = 0`, `(10000, 7.5) = 750`, `(333, 33.33) = 111`, `(10000, 0) = 0`, `(10000, 100) = 10000`. Nunca devuelve más que `total` ni un valor negativo ni no entero.
- AC2: `parsePlatformFeePercent` acepta `"10"`, `"0"`, `"7.5"`, `"100"` y lanza `InvalidPlatformFeeError` para `undefined`, `""`, `"  "`, `"abc"`, `"NaN"`, `"-1"`, `"101"`, `"Infinity"`.

Sesión de Stripe
- AC3: `createCheckoutSession` envía `payment_intent_data: { application_fee_amount, transfer_data: { destination: destinationAccountId } }`, con la comisión calculada sobre el total en unidades mínimas de los mismos `line_items` enviados (suma de `unit_amount * quantity`), no sobre un total recalculado aparte.
- AC4: Si la comisión calculada es 0 (porcentaje 0 o monto chico), `payment_intent_data` conserva `transfer_data.destination` y NO incluye `application_fee_amount`.
- AC5: Sin `on_behalf_of`; `invoice_creation`, `metadata.orderId`, moneda `pen`, `expires_at` (mínimo 30 min), `integration_identifier` y ausencia de `payment_method_types` quedan como hoy (los tests existentes del servicio siguen pasando).

Resolver y reglas de organizador
- AC6: `resolveCheckoutDestination` con zonas de un solo evento cuyo organizador tiene `stripe_account_id` y `stripe_charges_enabled = true` devuelve `ok` con `eventSlug` y `stripeAccountId`; varias zonas/funciones del mismo evento cuentan como un evento; ids repetidos no rompen.
- AC7: Zonas de dos o más eventos (aunque sean del mismo organizador) devuelven `multiple_events`.
- AC8: Organizador sin `stripe_account_id`, o con cuenta pero `stripe_charges_enabled = false`, devuelve `organizer_payments_unavailable`. Una zona inexistente devuelve `zone_not_found`.

Ruta `POST /api/checkout`
- AC9: Con `multiple_events` responde 422 `{ error: "multiple_events" }`; con `organizer_payments_unavailable` responde 409 `{ error: "organizer_payments_unavailable" }`; con `zone_not_found` responde 400 `invalid_payload`. En los tres casos NO se llama a `createPendingOrder` ni a Stripe (no queda orden `pending` ni stock retenido).
- AC10: Con `PLATFORM_FEE_PERCENT` ausente/inválido responde 503 `payments_misconfigured` sin crear orden ni sesión, y no hay cobro sin comisión.
- AC11: Camino feliz: se crea la orden, se llama a `createCheckoutSession` con `destinationAccountId` = cuenta del organizador y `feePercent` configurado, se guarda la sesión con `attachCheckoutSession` y responde 200 `{ url }`; `cancelUrl` usa el slug del evento resuelto (`/eventos/<slug>/entradas`).
- AC12: Si `createCheckoutSession` lanza (Stripe caído, cuenta rechazada, total 0 o bajo el mínimo de Stripe, combinación moneda/país no válida), la orden recién creada se marca `expired` con `markOrderExpired` (stock liberado de inmediato, sin esperar los 15 min), la ruta responde 502 `{ error: "checkout_unavailable" }`, el cuerpo no contiene texto de Stripe y el error se registra en servidor (`console.error`). Si el fallo es al guardar `attachCheckoutSession` la orden queda `pending` y vence por TTL (comportamiento actual, sin cambios).
- AC13: `insufficient_stock` sigue respondiendo 409 con `{ error: "insufficient_stock" }`; 401 y 400 sin cambios.

Cliente
- AC14: `requestCheckoutUrl` devuelve `error: "multiple_events"` (422), `"organizer_payments_unavailable"` (409 con ese código) o `"insufficient_stock"` (409 con ese código o 409 sin código, compatibilidad), y `"unknown"` para el resto (incluye 502/503). `useCheckoutPayment` muestra un mensaje específico para `multiple_events` ("Solo puedes comprar entradas de un evento a la vez.") y para `organizer_payments_unavailable` ("La venta de este evento no está disponible por ahora."), libera el botón (`isLoading = false`) y no redirige.

Facturas, webhook y cierre
- AC15: Verificación manual en sandbox, documentada en el PR: con una compra real de prueba (a) el PaymentIntent muestra `transfer_data.destination` y `application_fee_amount`, (b) llega `invoice.paid` al endpoint de plataforma y `orders.invoice_url` se guarda y "Ver factura" funciona. Si (b) falla, el developer detiene la tarea y escala (no se desactiva la factura sin decisión humana).
- AC16: `app/api/webhooks/stripe/route.ts` queda sin cambios y su `route.test.ts` pasa; un `checkout.session.completed` duplicado sigue siendo idempotente (`markOrderPaid` solo actualiza órdenes `pending`).
- AC17: `.env.example` documenta `PLATFORM_FEE_PERCENT` (rango, 503 si inválido) y la nota "Estado de implementación" del diseño refleja que comisión y `transfer_data` ya están implementados, mantiene la salvedad de moneda/país según la decisión humana.
- AC18: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)
- `modules/payments/utils/platform-fee.test.ts` (AC1, AC2): tabla de montos/porcentajes (redondeo, 0%, 100%, decimales, montos chicos que dan 0) y de valores inválidos.
- `modules/checkout/services/resolve-checkout-destination.service.test.ts` (AC6-AC8) con `createTestDb()`: un evento listo, varias zonas del mismo evento, dos eventos del mismo organizador, dos organizadores, sin cuenta, `charges_enabled = false`, zona inexistente, ids repetidos.
- `modules/checkout/services/create-checkout-session.service.test.ts` (AC3-AC5): `payment_intent_data` con destino y comisión sobre los `line_items` (precio con decimales, p. ej. 10.1 x 2), comisión 0 sin `application_fee_amount`, ausencia de `on_behalf_of`, resto de aserciones actuales.
- `app/api/checkout/route.test.ts` (AC9-AC13), mockeando `getCurrentUser`, `getDb`, `stripe`/`createCheckoutSession`, resolver y servicios de orden (estilo de `app/api/webhooks/stripe/route.test.ts`): 422, 409 organizador, 400, 503, camino feliz (args a `createCheckoutSession`, `cancelUrl`), fallo de sesión (`markOrderExpired` llamado, 502, sin detalles), stock insuficiente, 401.
- `request-checkout-url.service.test.ts` (AC14): 422, 409 con y sin código, 502 -> unknown.
- `useCheckoutPayment.test.ts` (AC14): mensajes nuevos.
- Sin test para el webhook de Stripe (no cambia, AC16 reusa el existente).

## Tareas

### T1 — Comisión de plataforma y variable de entorno
- Archivos: `modules/payments/utils/platform-fee.ts`, `modules/payments/utils/platform-fee.test.ts`, `.env.example`
- Depende de: —
- Paralelizable: sí (con T2, T5)
- Cubre: AC1, AC2, AC17 (parte `.env.example`)

### T2 — Resolver de destino de cobro (un evento, organizador listo)
- Archivos: `modules/checkout/services/resolve-checkout-destination.service.ts`, `modules/checkout/services/resolve-checkout-destination.service.test.ts`
- Depende de: —
- Paralelizable: sí (con T1, T5)
- Cubre: AC6, AC7, AC8

### T3 — Checkout Session con destination charge
- Archivos: `modules/checkout/services/create-checkout-session.service.ts`, `modules/checkout/services/create-checkout-session.service.test.ts`
- Depende de: T1 (usa `calculatePlatformFee`)
- Paralelizable: no (espera a T1; puede correr junto a T5)
- Cubre: AC3, AC4, AC5

### T4 — Ruta de checkout, nota de diseño y verificación en sandbox
- Archivos: `app/api/checkout/route.ts`, `app/api/checkout/route.test.ts`, `docs/superpowers/specs/2026-09-30-ticketing-system-design.md`
- Depende de: T1, T2, T3
- Paralelizable: no
- Cubre: AC9, AC10, AC11, AC12, AC13, AC15, AC16, AC17 (nota), AC18

### T5 — Errores nuevos en el cliente de checkout
- Archivos: `modules/checkout/services/request-checkout-url.service.ts`, `modules/checkout/services/request-checkout-url.service.test.ts`, `modules/checkout/hooks/useCheckoutPayment.ts`, `modules/checkout/hooks/useCheckoutPayment.test.ts`
- Depende de: — (consume el contrato HTTP de esta spec, no el código de T4)
- Paralelizable: sí (con T1, T2, T3)
- Cubre: AC14

Grupos: [T1, T2, T5] en paralelo -> T3 -> T4 (T5 puede ir en cualquiera de los dos primeros pasos). Los archivos de cada tarea son disjuntos. `npm run lint/test/build` (AC18) se corre al cerrar T4.

## Preguntas abiertas

1. **Moneda y país (bloqueante para aprobar).** ¿En qué país está la plataforma Stripe y en qué país y moneda operan los organizadores? Hoy: sesión en PEN, cuentas conectadas en `STRIPE_CONNECT_ACCOUNT_COUNTRY` (default `us`). Hallazgos de docs: (a) con plataforma y conectada en regiones distintas, el destination charge normalmente exige `on_behalf_of`, salvo excepciones de cross-border transfers; (b) `on_behalf_of` no funciona con cuentas `recipient` (no admiten `card_payments`), que son las de la tarea 01; (c) sin `on_behalf_of` el cobro se liquida en la moneda de la plataforma y el organizador recibe el monto convertido, con riesgo de FX; (d) la comisión se calcula en PEN y se liquida en la moneda de liquidación de la conectada. Riesgo: un cobro rechazado (la sesión falla y se libera la orden, AC12) o una conversión no esperada. Opciones: A) mantener PEN + destination charge simple y probar en sandbox con una cuenta real (default de la spec); B) cobrar en la moneda del país de las cuentas; C) crear cuentas con `merchant`/`card_payments` y usar `on_behalf_of` (cambia la tarea 01). Recomendación: A, probar en sandbox antes de aprobar; si falla, decidir B o C.
2. **`on_behalf_of`.** Se propone NO usarlo (ver decisión 1). ¿Se confirma, sabiendo que implica que la plataforma figura como comercio en el estado de cuenta de la tarjeta y que las comisiones de Stripe son las del país de la plataforma?
3. **Política multi-organizador.** Se propone una orden por evento (422 `multiple_events`). ¿Se acepta? Alternativa: permitir varios eventos del mismo organizador (más permisivo, también un solo destino) o soportar varios organizadores con separate charges and transfers (más trabajo, otra arquitectura de comisión).
4. **Facturas.** Se propone mantener `invoice_creation` y que la factura quede en la plataforma (merchant of record) sin cambiar el webhook. Las docs consultadas no confirman la interacción con `transfer_data`/`application_fee_amount`; se verifica en sandbox (AC15). ¿Qué hacer si falla: deshabilitar la factura hospedada, o generar los datos de facturación de otra forma? También: ¿la factura debe mostrar a la plataforma o al organizador como emisor (impacto tributario en Perú; decisión fuera del código)?
5. **Compra gratuita o bajo mínimo.** `function_zones.price >= 0` permite total 0. Stripe puede rechazar sesiones por debajo de su mínimo; la spec lo trata como fallo de sesión (502 + orden liberada). ¿Se necesita un flujo para entradas gratuitas (confirmar sin Stripe)? Fuera de esta spec por defecto.
6. **Comisión vs. costo de Stripe.** La guía recomienda incluir el costo de Stripe si la comisión es < ~4%. Con `PLATFORM_FEE_PERCENT=10` no aplica; ¿se mantiene el 10% como valor por defecto del `.env.example`?
7. **Revalidación contra Stripe.** Se confía en `stripe_charges_enabled` de la DB (sincronizado por webhook). ¿Basta, o se hace `accounts.retrieve` en cada checkout (más latencia, más seguro)? Por defecto basta, y si Stripe rechaza se aplica AC12.
8. **Códigos HTTP.** Se usan 409 para "organizador sin cobro" y 422 para "varios eventos", con códigos en el cuerpo. El 409 previo (cupo) sigue igual; el cliente ahora distingue por `error` del cuerpo. ¿Algún cliente externo depende de que todo 409 signifique cupo?

## Próximas fases

- Tarea 03: bloquear `status: published` sin `stripe_charges_enabled`.
- Tarea 09: página de pagos del organizador (balances, comisión cobrada, login link).
- Reembolsos (`refund_application_fee`, `reverse_transfer`) y disputas de destination charges.
- Comisión por organizador/evento; carritos multi-organizador (separate charges and transfers).
- Flujo de entradas gratuitas sin Stripe, si se requiere.
