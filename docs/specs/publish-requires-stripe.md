# Bloquear la publicación de eventos sin Stripe conectado

Estado: approved

## Objetivo

Que un evento solo pueda pasar a `published` si su organizador (`events.organizer_id`) puede cobrar: `users.stripe_account_id` presente y `users.stripe_charges_enabled = true`. La regla se verifica en el servidor (`setEventStatus`), no solo en la UI.

Fuente: `docs/superpowers/specs/2026-09-30-ticketing-system-design.md`, secciones "Manejo de errores" ("bloqueado al intentar publicar un evento (draft -> published), verificado en el Server Action, no solo en la UI") y "Pagos" ("Sin `charges_enabled: true`, el organizador no puede publicar eventos"). Tarea 03 del tablero; depende de las tareas 01 (`docs/specs/stripe-connect-onboarding.md`) y 02 (`docs/specs/stripe-destination-charges.md`).

Hallazgo de código (verificado): `setEventStatus` en `modules/organizer/services/event-write.service.ts` es el **único** camino que deja un evento en `published`. `createEvent` inserta siempre `status: "draft"` y `updateEvent` no cambia el estado. Por eso el wizard (`CreateEventWizard`) no puede publicar y basta con una verificación en `setEventStatus`. Según `nextStatuses` (`event-permissions.ts`) solo hay dos transiciones a `published`: `draft -> published` (el organizador dueño) y `suspended -> published` (admin/super_admin).

## Decisiones de diseño

1. **Se valida al dueño del evento** (`events.organizer_id`), no al actor. Si un admin/super_admin reactiva un evento suspendido de un organizador sin Stripe, también se bloquea (el cobro iría a ese organizador).
2. **Solo se bloquea la transición hacia `published`.** `suspended -> published` cuenta como publicar. Los eventos ya publicados cuyo dueño no tiene Stripe (seed, o dueño que perdió `charges_enabled`) no se despublican; siguen pudiéndose editar, cancelar y suspender.
3. **Borradores libres.** `createEvent` y `updateEvent` no cambian.
4. **Predicado compartido** `canAcceptPayments({ stripeAccountId, stripeChargesEnabled })` en `modules/payments/utils/can-accept-payments.ts`. Dependencias: `organizer -> payments` y `checkout -> payments`; `payments` solo importa tipos de `users`. Sin ciclos. `resolveCheckoutDestination` pasa a usarlo para que checkout y publicación compartan la misma noción de "organizador listo". La regla es `stripeAccountId && stripeChargesEnabled` (igual que checkout), no exige `payouts` (a diferencia de `deriveConnectState` "active").
5. **Carrera.** El flag puede cambiar entre la lectura y el UPDATE. Se hace una verificación previa (para dar el mensaje claro) y además la condición se incluye **en el mismo `UPDATE`** (`WHERE ... AND EXISTS (SELECT 1 FROM users WHERE id = events.organizer_id AND stripe_account_id IS NOT NULL AND stripe_charges_enabled)`). Es atómico en una sola sentencia, sin transacción extra. Si el UPDATE afecta 0 filas se vuelve a leer al dueño: si ya no está listo se lanza el error de Stripe, si no, `STALE` (comportamiento actual). Ponytail: el flag viene del webhook, así que se confía en la DB; no se consulta Stripe al publicar.
6. **Orden de errores en `setEventStatus`:** permiso (`NOT_ALLOWED`) -> Stripe -> función futura. Un actor sin permiso nunca ve el mensaje de Stripe.
7. **UI solo anticipa.** La fuente de verdad es el servidor. El banner "Conectar con Stripe" ya está en `/organizador` (misma página donde está la tabla), por lo que el mensaje de error no necesita enlace.

## Alcance

- Incluye:
  - Predicado `canAcceptPayments` + refactor de `resolveCheckoutDestination` para usarlo.
  - Verificación en `setEventStatus` (previa + en el UPDATE) con mensajes seguros (`EventActionError`).
  - `getOrganizerSummary` expone `organizerPaymentsReady` por evento.
  - `EventRowActions` / `OrganizerEventsTable`: botón "Publicar" deshabilitado con motivo visible cuando el dueño no está listo.
  - Actualizar las fixtures de tests existentes para que los organizadores de prueba tengan Stripe conectado.
- No incluye:
  - Despublicar automáticamente al perder `charges_enabled`.
  - Página `/organizador/pagos` (tarea 09), onboarding (tarea 01), checkout (tarea 02).
  - Cambios en `CreateEventWizard` y `ConfirmEventActionDialog`: ninguno publica (el wizard solo crea/guarda borradores; el diálogo solo se usa para cancelar y eliminar). Ver pregunta 4.
  - Cambios en `event.actions.ts`: ya devuelve `error.message` de `EventActionError` y nada más (`run`); no necesita código nuevo.
  - Cambios en seed: `lib/db/seed/event-catalog.ts` inserta eventos `published` directo por `db.insert`, y `scripts/assign-events-to-organizers.ts` solo hace `UPDATE events SET organizer_id`. Ninguno pasa por `setEventStatus`, por lo que no se ven afectados (verificado). Consecuencia conocida, fuera de alcance: los eventos seed de un organizador sin Stripe quedan publicados pero el checkout responde 409 `organizer_payments_unavailable` (tarea 02).

## Reutilizar

- `deriveConnectState` / `StripeConnectBanner` (tarea 01): no se tocan; el banner ya está en `app/(panel)/organizador/page.tsx` para rol `organizer`.
- Patrón de `resolveCheckoutDestination` (join `users` por `events.organizer_id`).
- `EventActionError`, `loadEvent`, `nextStatuses`, el UPDATE guardado por `eq(events.status, event.status)` y `STALE` en `event-write.service.ts`.
- `createTestDb` (`@/lib/db/test-helpers`, PGlite) y el `setup()` de `event-write.service.test.ts`.
- La consulta `ownerRows` de `get-organizer-summary.service.ts`, que ya une `users` por evento.

## Archivos

Nuevos:
- `modules/payments/utils/can-accept-payments.ts`
- `modules/payments/utils/can-accept-payments.test.ts`

Modificados (algunos ya tienen cambios sin commit de tareas anteriores; solo se edita lo indicado):
- `modules/checkout/services/resolve-checkout-destination.service.ts` (sin commit, tarea 02): solo reemplazar la condición `!first.stripeAccountId || !first.stripeChargesEnabled` por `!canAcceptPayments(first)`.
- `modules/organizer/services/event-write.service.ts` (limpio): `setEventStatus`.
- `modules/organizer/services/event-write.service.test.ts` (limpio): fixtures y casos nuevos.
- `modules/organizer/services/get-organizer-summary.service.ts` (limpio): `organizerPaymentsReady`.
- `modules/organizer/services/get-organizer-summary.service.test.ts` (limpio).
- `modules/organizer/components/OrganizerEventsTable.tsx` (limpio).
- `modules/organizer/components/EventRowActions.tsx` (limpio).

Verificar antes de implementar: si otros tests fuera de estos publican vía `setEventStatus` con usuarios reales de `createTestDb` (hoy solo `event-write.service.test.ts`; `event.actions.test.ts` mockea el servicio).

## Criterios de aceptación

- AC1: `canAcceptPayments` devuelve `true` solo con `stripeAccountId` no vacío y `stripeChargesEnabled === true`; `false` con cuenta nula, con cuenta y flag `false`, y con ambos ausentes.
- AC2: `resolveCheckoutDestination` mantiene exactamente su comportamiento actual; su test existente pasa sin modificarse.
- AC3: `setEventStatus(db, organizer, id, "published")` sobre un borrador del organizador **sin** `stripe_account_id` lanza `EventActionError` con el mensaje de Stripe y el evento sigue en `draft` (`updated_at` intacto).
- AC4: Igual que AC3 cuando hay `stripe_account_id` pero `stripe_charges_enabled = false`.
- AC5: Con `stripe_account_id` y `stripe_charges_enabled = true`, el organizador publica un borrador con función futura (comportamiento actual intacto).
- AC6: Un admin/super_admin que reactiva (`suspended -> published`) un evento cuyo dueño no está listo recibe `EventActionError` (mensaje que nombra al organizador, no a "tu cuenta") y el evento sigue `suspended`; si el dueño está listo, la reactivación funciona.
- AC7: Se valida al dueño y no al actor: un super_admin con Stripe conectado no puede publicar el evento de un organizador sin Stripe.
- AC8: Un actor sin permiso (otro organizador, customer, `null`) sobre un evento cuyo dueño no está listo recibe el error de permiso (`No puedes modificar este evento`), no el de Stripe.
- AC9: Con dueño no listo y sin función futura, el error es el de Stripe (precede a "función futura").
- AC10: Con dueño no listo, un evento **ya publicado** puede: editarse (`updateEvent`), cancelarse, suspenderse y destacarse (admin); no se despublica nada automáticamente.
- AC11: Con dueño no listo, `createEvent` y `updateEvent` sobre borradores funcionan igual que hoy.
- AC12 (carrera): si `stripe_charges_enabled` pasa a `false` después de la lectura del dueño y antes del UPDATE, el evento no cambia de estado y se lanza el error de Stripe (no `STALE`, no éxito silencioso). El UPDATE contiene la condición en la misma sentencia.
- AC13: `getOrganizerSummary` devuelve `organizerPaymentsReady` por evento, calculado con `canAcceptPayments` sobre el dueño de cada evento, también en el alcance de admin/super_admin (dueños distintos en la misma lista).
- AC14: En la tabla, cuando `canPublish` es `true` y `organizerPaymentsReady` es `false`, "Publicar" aparece deshabilitado con un texto visible (no solo `title`) que explica el motivo: "Conecta tu cuenta de Stripe para publicar" para el organizador, "El organizador aún no conectó Stripe" para admin/super_admin. Con `organizerPaymentsReady` `true` el botón funciona como hoy. Editar, Cancelar y Eliminar no cambian.
- AC15: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)

- `modules/payments/utils/can-accept-payments.test.ts`: AC1.
- `modules/organizer/services/event-write.service.test.ts`:
  - Cambio de fixture: `insertUser` crea a los organizadores con `stripeAccountId` y `stripeChargesEnabled: true` por defecto (parámetro opcional para crear uno sin Stripe). Si no, los tests existentes que publican fallarían.
  - Casos nuevos en `describe("setEventStatus")` (o un `describe` propio): AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12 (simular el cambio del flag entre lectura y UPDATE, p. ej. con `vi.spyOn` sobre `db.update` ejecutando antes el UPDATE de `users`, o equivalente que no dependa de timing).
- `modules/organizer/services/get-organizer-summary.service.test.ts`: AC13.
- `modules/checkout/services/resolve-checkout-destination.service.test.ts`: sin cambios (AC2).
- Sin test para `EventRowActions`/`OrganizerEventsTable` (presentacionales; la lógica es el servicio y el predicado).

## Tareas

### T0 — Predicado compartido y refactor de checkout
- Archivos: `modules/payments/utils/can-accept-payments.ts`, `modules/payments/utils/can-accept-payments.test.ts`, `modules/checkout/services/resolve-checkout-destination.service.ts`
- Depende de: —
- Paralelizable: no (base de T1 y T2)
- Cubre: AC1, AC2

### T1 — Verificación en `setEventStatus`
- Archivos: `modules/organizer/services/event-write.service.ts`, `modules/organizer/services/event-write.service.test.ts`
- Depende de: T0
- Paralelizable: sí (con T2; archivos disjuntos)
- Cubre: AC3, AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12

### T2 — `organizerPaymentsReady` en el resumen
- Archivos: `modules/organizer/services/get-organizer-summary.service.ts`, `modules/organizer/services/get-organizer-summary.service.test.ts`
- Depende de: T0
- Paralelizable: sí (con T1)
- Cubre: AC13

### T3 — UI: Publicar deshabilitado con motivo
- Archivos: `modules/organizer/components/OrganizerEventsTable.tsx`, `modules/organizer/components/EventRowActions.tsx`
- Depende de: T2 (tipo `OrganizerEventSummary`)
- Paralelizable: no
- Cubre: AC14, AC15 (junto con el resto)

Grupos: T0 -> {T1, T2} en paralelo -> T3.

## Casos límite

- Dueño pierde `charges_enabled` con eventos publicados: siguen publicados (AC10). Si luego se suspenden, no podrán reactivarse hasta reconectar.
- Dueño con cuenta creada pero onboarding incompleto (`charges_enabled = false`): bloqueado (AC4).
- `stripe_account_id` como cadena vacía: se trata como no conectado (AC1).
- Doble clic en "Publicar": el segundo intento falla por `STALE` o por estado, igual que hoy.
- Dueño suspendido o eliminado (`is_suspended`, `deleted_at`): fuera de alcance; el predicado no los considera.
- Cambio de estado a `published` ya publicado: `nextStatuses` lo rechaza antes de llegar a la verificación.

## Preguntas abiertas

1. **Admin que reactiva un evento de un organizador sin Stripe.** Default: se bloquea (decisión 1).
2. **`suspended -> published` cuenta como publicar.** Default: sí; si el dueño perdió Stripe durante la suspensión, no se puede reactivar hasta reconectar.
3. **Definición de "listo".** Default: `stripeAccountId && stripeChargesEnabled`, como checkout (no exige `payouts`). Consecuencia: un organizador en estado `pending` del banner (charges sí, payouts no) puede publicar. ¿Se prefiere exigir también `payouts` (alinear con `deriveConnectState === "active"`)? Tocaría checkout también.
4. **Wizard y diálogo de confirmación sin cambios.** El requerimiento los menciona, pero ninguno publica (wizard crea borradores; diálogo cancela/elimina). Default: no se modifican. Alternativa: un aviso informativo en `CreateEventWizard` para organizadores sin Stripe ("podrás guardar borradores, pero necesitas conectar Stripe para publicar"); requeriría pasar un prop desde `app/(panel)/organizador/eventos/nuevo/page.tsx` y `.../[id]/editar/page.tsx`.
5. **Editar un evento ya publicado de un dueño sin Stripe.** Default: permitido.
6. **Textos de error.** Propuesta: organizador dueño: "Conecta tu cuenta de Stripe para publicar eventos" ; admin: "El organizador de este evento aún no conectó su cuenta de Stripe". Confirmar redacción.
7. **Eventos del seed** de organizadores sin Stripe quedan publicados pero no vendibles (checkout 409). Default: no se toca el seed; para pruebas, conectar Stripe a los organizadores de desarrollo. ¿Se quiere que el seed marque `stripe_charges_enabled` en el organizador de prueba?

## Próximas fases

- Despublicar o avisar cuando un organizador pierde `charges_enabled` (webhook).
- Aviso en el wizard (pregunta 4) y estado de pagos en `/organizador/pagos` (tarea 09).
