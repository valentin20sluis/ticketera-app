# Stripe Connect: onboarding del organizador

Estado: done

## Objetivo

Que un usuario con rol `organizer` conecte su cuenta de cobro con Stripe: botón "Conectar con Stripe" -> se crea (una sola vez) su cuenta conectada -> se le redirige al onboarding alojado por Stripe (Account Link) -> `users.stripe_account_id` se guarda y los flags `stripe_charges_enabled` / `stripe_payouts_enabled` se mantienen sincronizados vía webhook.

Referencias: diseño aprobado `docs/superpowers/specs/2026-09-30-ticketing-system-design.md` sección "Pagos (Stripe Connect)"; guía del repo `.agents/skills/stripe-best-practices/references/connect.md`.

### Decisiones de diseño (explícitas)

1. **Accounts v2, no v1.** El diseño menciona `stripe.accounts.create` + webhook `account.updated`, pero la guía de best practices del repo prohíbe `type: 'express'` y `stripe.accounts.create({ type })` (v1 deprecado). Se usa `stripe.v2.core.accounts.create` con:
   - `dashboard: "express"` (Express Dashboard, equivale a "Connect Express" del diseño).
   - `defaults.responsibilities`: `fees_collector: "application"`, `losses_collector: "application"` (marketplace con destination charges, tarea 02).
   - `configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested: true` (necesaria para destination charges). NO se pide `merchant` / `card_payments`.
   - `contact_email` = email del usuario, `display_name` = `fullName`, `identity.country` = env `STRIPE_CONNECT_ACCOUNT_COUNTRY`.
   - Onboarding: `stripe.v2.core.accountLinks.create` con `use_case.type = "account_onboarding"`, `refresh_url` y `return_url` (stripe@23 no admite `configurations` en `account_onboarding`; el link usa la configuración de la cuenta, que solo tiene `recipient`).
2. **Webhook separado, con secret propio.** En v2 los cambios de cuenta llegan como *thin events* (`v2.core.account[...]`) a un *event destination* v2, no al endpoint v1 de `app/api/webhooks/stripe/route.ts` (que usa `constructEvent` y `STRIPE_WEBHOOK_SECRET`). Se crea `app/api/webhooks/stripe-connect/route.ts` con `stripe.parseEventNotification(body, signature, STRIPE_CONNECT_WEBHOOK_SECRET)`. El endpoint existente NO se toca. Evento escuchado: `v2.core.account[configuration.recipient].capability_status_updated`.
3. **Sincronización por estado absoluto (idempotente).** El webhook no aplica deltas: al recibir el evento hace `stripe.v2.core.accounts.retrieve(id, { include: ["configuration.recipient"] })`, calcula los flags desde las capabilities y hace `UPDATE users SET ... WHERE stripe_account_id = <id>`. Un evento duplicado o fuera de orden produce el mismo resultado.
4. **Mapeo a columnas existentes** (la guía prohíbe leer `charges_enabled`/`payouts_enabled` v1 de la API, pero las columnas de DB se conservan para no migrar):
   - `stripe_charges_enabled` = `configuration.recipient.capabilities.stripe_balance.stripe_transfers.status === "active"` (puede vender / recibir transferencias).
   - `stripe_payouts_enabled` = `configuration.recipient.capabilities.stripe_balance.payouts.status === "active"`.
   - **No hace falta migración Drizzle:** `stripe_payouts_enabled` ya existe en `lib/db/schema.ts` (tabla `users`) y en `drizzle/0000_blue_elektra.sql`. La migración 0006 no se crea.
5. **Dónde vive la UI:** banner (Card + Button existentes) arriba de `app/(panel)/organizador/page.tsx` ("Mis eventos"), visible solo para el rol `organizer` mientras no esté activo. Sin tocar `/organizador/pagos` (tarea 09).

## Alcance

- Incluye:
  - Servicio `stripe-connect.service.ts`: crear cuenta (sin duplicar), crear Account Link, sincronizar flags.
  - Server Action "Conectar / Continuar con Stripe" (redirige al onboarding).
  - Route handler GET para `return_url` (sincroniza y vuelve al panel) y `refresh_url` (genera link nuevo y redirige).
  - Webhook `stripe-connect` con verificación de firma.
  - Banner de estado en `/organizador` (no conectado / pendiente).
  - Variables de entorno nuevas en `.env.example` y script `stripe:listen` ampliado.
- No incluye:
  - Comisión / destination charge en Checkout (tarea 02).
  - Bloquear publicación de eventos sin `stripe_charges_enabled` (tarea 03).
  - Página `/organizador/pagos` (tarea 09), login link al Express Dashboard, embedded components (`notification_banner`).
  - Autoservicio customer -> organizer (tarea 06).
  - Onboarding de `admin` / `super_admin` (solo `organizer`).
  - Migración Drizzle (columnas ya existen).
  - Desconectar / eliminar cuenta conectada, manejo de `requirements` / `future_requirements`.

## Reutilizar

- `lib/stripe.ts` (`stripe`), `lib/db/client.ts` (`getDb`, tipo `Db`), `lib/db/schema.ts` (`users`), `lib/db/test-helpers.ts` (`createTestDb`, PGlite).
- `modules/users/services/current-user.service.ts` (`requireRole`, `getCurrentUser`, tipo `CurrentUser`).
- Patrón action + service con DB inyectada y error con mensaje seguro: `modules/organizer/actions/event.actions.ts`, `modules/users/services/user-account.service.ts` (`UserActionError`).
- Patrón de webhook y de su test: `app/api/webhooks/stripe/route.ts` y `route.test.ts`.
- UI: `components/ui/card.tsx`, `components/ui/button.tsx` (no hay `alert`; no se agrega).
- `scripts/stripe-listen.ts` (se amplía, no se reemplaza).

## Archivos

Nuevos:
- `modules/payments/utils/connect-status.ts` + `connect-status.test.ts`
- `modules/payments/services/stripe-connect.service.ts` + `stripe-connect.service.test.ts`
- `modules/payments/actions/connect.actions.ts` + `connect.actions.test.ts`
- `app/api/stripe/connect/callback/route.ts` + `route.test.ts`
- `app/api/webhooks/stripe-connect/route.ts` + `route.test.ts`
- `modules/payments/components/StripeConnectBanner.tsx`

Modificados:
- `.env.example`
- `scripts/stripe-listen.ts`
- `app/(panel)/organizador/page.tsx`

Variables de entorno nuevas (`.env.example`):
- `STRIPE_CONNECT_WEBHOOK_SECRET=whsec_xxxxxxxxxxxx` (secret del event destination v2 / de `stripe listen` para thin events).
- `STRIPE_CONNECT_ACCOUNT_COUNTRY=us` (código ISO del país de las cuentas conectadas; ver pregunta abierta 1).
- Nota en el comentario de `STRIPE_SECRET_KEY`: la restricted key necesita permisos de escritura en Accounts v2 / Account Links.

## Criterios de aceptación

- AC1: `deriveConnectState(user)` devuelve `not_connected` si `stripeAccountId` es null, `pending` si hay cuenta pero `stripeChargesEnabled` o `stripePayoutsEnabled` es false, y `active` si ambos son true.
- AC2: `deriveFlagsFromAccount(account)` devuelve `chargesEnabled = true` solo si `stripe_transfers.status === "active"` y `payoutsEnabled = true` solo si `payouts.status === "active"`; ante capabilities ausentes o `restricted`/`pending`/`unsupported` devuelve `false` (nunca lanza).
- AC3: Un `organizer` sin `stripe_account_id` que pulsa "Conectar con Stripe" provoca exactamente una llamada a `stripe.v2.core.accounts.create` (dashboard express, recipient + `stripe_transfers`, fees/losses `application`), guarda `stripe_account_id` en `users` y redirige a la `url` del Account Link (`account_onboarding`).
- AC4: Si el usuario ya tiene `stripe_account_id`, NO se llama a `accounts.create`; solo se crea un Account Link nuevo con la cuenta existente (la acción es reintentable).
- AC5: Dos invocaciones concurrentes del alta para el mismo usuario no dejan dos cuentas asociadas: `accounts.create` lleva idempotency key estable por usuario y el guardado es condicional (`WHERE id = ? AND stripe_account_id IS NULL`); si otra ejecución ganó, se relee y se usa el `stripe_account_id` ya guardado.
- AC6: Si `accounts.create` falla, no se escribe nada en DB; si falla el guardado en DB tras crear la cuenta, el reintento reutiliza la misma cuenta por la idempotency key (no crea otra). El usuario ve un mensaje genérico ("No se pudo conectar con Stripe") y los detalles del error no se exponen.
- AC7: Un usuario con rol distinto de `organizer` (customer, admin, super_admin), suspendido o sin sesión no puede ejecutar la acción ni el callback: `requireRole(["organizer"])` redirige y no se llama a Stripe.
- AC8: `GET /api/stripe/connect/callback?type=refresh` (Account Link expirado/usado) crea un Account Link nuevo para la cuenta del usuario autenticado y responde con redirect a su `url`; sin cuenta guardada redirige a `/organizador`.
- AC9: `GET /api/stripe/connect/callback?type=return` sincroniza los flags (retrieve + update) y redirige a `/organizador`; si el onboarding quedó incompleto, el usuario sigue en estado `pending` y el banner ofrece "Continuar configuración" (no se rompe ni se marca como activo). Un `type` inválido redirige a `/organizador` sin llamar a Stripe. Si el sync falla, igual redirige a `/organizador` (el webhook corrige luego).
- AC10: El webhook `stripe-connect` responde 400 si falta el header `stripe-signature` o la firma es inválida (verificada con `STRIPE_CONNECT_WEBHOOK_SECRET` sobre el cuerpo crudo), sin tocar DB.
- AC11: Con un evento `v2.core.account[configuration.recipient].capability_status_updated` válido, el webhook recupera la cuenta (`related_object.id`) y actualiza `stripe_charges_enabled` / `stripe_payouts_enabled` del usuario con ese `stripe_account_id`, y responde 200.
- AC12: El mismo evento entregado dos veces (o fuera de orden) deja los mismos valores en DB (el sync lee el estado actual de Stripe, no aplica deltas).
- AC13: Evento de una cuenta sin usuario asociado, o de un tipo no manejado, responde 200 sin cambios en DB. Errores inesperados (Stripe/DB caídos) propagan 500 para que Stripe reintente, igual que el webhook existente.
- AC14: `app/api/webhooks/stripe/route.ts` queda sin cambios y su test existente sigue pasando.
- AC15: En `/organizador`, un `organizer` en estado `not_connected` ve el banner con botón "Conectar con Stripe"; en `pending` ve "Continuar configuración"; en `active` no ve banner. `admin` / `super_admin` nunca ven el banner.
- AC16: `.env.example` documenta `STRIPE_CONNECT_WEBHOOK_SECRET` y `STRIPE_CONNECT_ACCOUNT_COUNTRY`; `npm run stripe:listen` reenvía también los thin events de cuenta a `/api/webhooks/stripe-connect` (avisando si el `whsec_` no coincide, igual que hoy).
- AC17: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)
- `connect-status.test.ts` (AC1, AC2): tabla de estados y de capabilities (active / restricted / ausente).
- `stripe-connect.service.test.ts` (AC3-AC6, AC11-AC13) con `createTestDb()` y cliente `stripe` falso inyectado: alta nueva, cuenta ya existente (no duplica), carrera (guardado condicional), fallo de Stripe sin escritura, link de refresh, sync de flags, sync de cuenta desconocida (no-op), sync idempotente.
- `connect.actions.test.ts` (AC3, AC4, AC6, AC7): mock de `requireRole`, del service y de `next/navigation` `redirect`; rol no organizer no llama al service; error genérico.
- `app/api/stripe/connect/callback/route.test.ts` (AC8, AC9): `type` refresh / return / inválido, sin cuenta, fallo de sync.
- `app/api/webhooks/stripe-connect/route.test.ts` (AC10, AC11, AC13): sin firma, firma inválida, evento válido, tipo no manejado (mismo estilo que `app/api/webhooks/stripe/route.test.ts`).
- Sin test para `StripeConnectBanner` (presentacional); la lógica de estado ya está cubierta por `connect-status.test.ts`.

## Tareas

### T0 — Variables de entorno y listener local
- Archivos: `.env.example`, `scripts/stripe-listen.ts`
- Depende de: —
- Paralelizable: sí (con T1)
- Cubre: AC16

### T1 — Estado, mapeo de capabilities y service de Connect
- Archivos: `modules/payments/utils/connect-status.ts`, `modules/payments/utils/connect-status.test.ts`, `modules/payments/services/stripe-connect.service.ts`, `modules/payments/services/stripe-connect.service.test.ts`
- Depende de: —
- Paralelizable: sí (con T0)
- Cubre: AC1, AC2, AC3, AC4, AC5, AC6, AC11 (lógica de sync), AC12, AC13 (cuenta desconocida)

### T2 — Server Action y callback return/refresh
- Archivos: `modules/payments/actions/connect.actions.ts`, `modules/payments/actions/connect.actions.test.ts`, `app/api/stripe/connect/callback/route.ts`, `app/api/stripe/connect/callback/route.test.ts`
- Depende de: T1
- Paralelizable: sí (con T3)
- Cubre: AC3, AC4, AC6, AC7, AC8, AC9

### T3 — Webhook de cuentas conectadas
- Archivos: `app/api/webhooks/stripe-connect/route.ts`, `app/api/webhooks/stripe-connect/route.test.ts`
- Depende de: T1
- Paralelizable: sí (con T2)
- Cubre: AC10, AC11, AC12, AC13, AC14

### T4 — Banner en el panel del organizador
- Archivos: `modules/payments/components/StripeConnectBanner.tsx`, `app/(panel)/organizador/page.tsx`
- Depende de: T2 (usa la action)
- Paralelizable: no
- Cubre: AC15, AC17

Grupos: [T0, T1] en paralelo -> [T2, T3] en paralelo -> T4. Los archivos de cada tarea son disjuntos. T0 no bloquea a las demás, pero debe estar lista antes de probar el flujo en local.

## Preguntas abiertas

1. **País de las cuentas conectadas.** La app cobra en PEN y usa hora de Lima; Stripe puede no soportar crear cuentas conectadas en Perú. ¿En qué país operan los organizadores y está habilitado en la plataforma Stripe? Default de la spec: env `STRIPE_CONNECT_ACCOUNT_COUNTRY` (valor de ejemplo `us`). Esto afecta también la moneda de los pagos de la tarea 02.
2. **Accounts v2 vs. el diseño (`stripe.accounts.create` v1 + `account.updated`).** La spec sigue la guía del repo (v2, thin events, endpoint y secret separados). Si se prefiere v1 por simplicidad o por soporte de SDK/API version, cambian T1, T3 y T0 (un solo endpoint con `account.updated` y `STRIPE_WEBHOOK_SECRET`). ¿Se confirma v2?
3. **Nombre de columnas.** Se conservan `stripe_charges_enabled` / `stripe_payouts_enabled` con el mapeo a capabilities v2 (`stripe_transfers` / `payouts`). ¿Se acepta, o se renombran (migración Drizzle 0006, tocaría también la tarea 03)? Nota: la columna `stripe_payouts_enabled` ya existe desde `0000`, el supuesto de que faltaba no aplica.
4. **Event destination en producción/sandbox.** Hay que crear en el Dashboard un event destination v2 (thin) para `v2.core.account[configuration.recipient].capability_status_updated` apuntando a `/api/webhooks/stripe-connect`. ¿Quién lo configura y en qué entornos? Además, verificar que la restricted key (`rk_`) tenga permisos de Accounts v2 / Account Links.
5. **Comportamiento de `admin` / `super_admin`.** La spec solo habilita el botón para `organizer`. ¿Los admin que crean eventos a nombre de un organizador deben poder iniciar el onboarding por él? (Por defecto no.)
6. **Ubicación del banner.** Se propone `/organizador` (Mis eventos). ¿Mejor en `/organizador/resumen` o en el layout del panel organizador para que se vea en todas las páginas?
7. **Verificación de forma del evento.** `fetchRelatedObject()` del SDK permite recuperar la cuenta desde la notificación; el developer debe confirmar con `stripe docs` y el CLI (`stripe listen --help`) la forma exacta de reenviar thin events en local, y que el SDK `stripe@23` fija una versión de API con soporte v2 estable (los ejemplos de docs usan `2026-09-30.preview`).

## Próximas fases

- Tarea 02: destination charge con `application_fee_amount` y `transfer_data.destination` usando `stripe_account_id`.
- Tarea 03: bloquear `status: published` si `stripe_charges_enabled` es false.
- Tarea 09: página `/organizador/pagos` (estado de cuenta, login link al Express Dashboard, `notification_banner`).
- Tarea 06: autoservicio customer -> organizer.
- Manejo de `requirements` / `future_requirements` (eventos `v2.core.account[requirements].updated`).
