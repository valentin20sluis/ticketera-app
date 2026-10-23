# Job de expiración y reconciliación de órdenes pending

Estado: aprobada

## Objetivo

Hoy una orden `pending` solo sale de ese estado por los webhooks de Stripe (`checkout.session.completed` / `checkout.session.expired`). Si el webhook nunca llega, un cliente que pagó queda con orden `pending` y sin entradas, y una orden abandonada queda `pending` para siempre (la disponibilidad no se rompe porque `reservingOrderCondition` ignora las vencidas, pero el estado en BD es falso). Se quiere un job periódico que reconcilie cada orden `pending` vencida contra la Checkout Session real en Stripe.

Hallazgos verificados en el código (condicionan el diseño):

- `orders.stripe_checkout_session_id` (nullable) se llena con `attachCheckoutSession` tras crear la sesión. Índice `orders_status_expires_idx (status, expires_at)` ya existe: la consulta del job lo usa, sin migración.
- `markOrderPaid(db, {orderId, paymentIntentId})` es idempotente: solo actúa si `status = 'pending'`, si no devuelve `{updated:false}`; crea tickets con asiento (`order_item_seats`) o anónimos. `markOrderExpired(db, orderId)` solo actúa sobre `pending` y borra los `order_item_seats` (libera asientos). No hay que cambiarlos.
- `markOrderPaid` NO revisa `expires_at`: una orden `pending` vencida sigue pudiendo pagarse mientras nadie la haya pasado a `expired`. Quien la pasa a `expired` es el webhook de expiración, `releaseDeadSeats` (barrido perezoso dentro de `createPendingOrder`, cuando otro comprador pide asientos de la misma zona) o este job.
- Brecha documentada: `createCheckoutSession` fuerza `expires_at` de la sesión a >= 30 min (mínimo de Stripe) mientras la orden vence a los 15 (`ORDER_TTL_MS`). Entre el minuto 15 y 30 la sesión sigue `open` y se puede pagar.
- Cliente Stripe: `stripe` de `lib/stripe.ts` (clave `STRIPE_SECRET_KEY`, cuenta de plataforma). La sesión se crea sin `transfer_data`/`stripeAccount`, así que `stripe.checkout.sessions.retrieve(id)` sin opciones de Connect es suficiente. El `metadata.orderId` y `payment_intent` se leen como en el webhook (`idOf`).
- `proxy.ts` (Clerk) solo protege `/mis-entradas`, `/organizador`, `/super-admin`: `/api/cron/*` es público a nivel middleware, por lo que la autorización es responsabilidad del handler.
- No existe `vercel.json`. Vercel invoca crons con `GET` y, si existe la env `CRON_SECRET`, envía `Authorization: Bearer <CRON_SECRET>`.

### Política (decisiones)

Candidatas: órdenes `status = 'pending'` con `expires_at <= now - GRACE_MS`, orden `expires_at` asc, máximo `BATCH_SIZE` por corrida. Constantes en el service: `GRACE_MS = 2 min` (el webhook normal llega en segundos; la gracia evita competir con él), `BATCH_SIZE = 50`.

Por cada candidata (secuencial, aislada en `try/catch`):

| Estado real en Stripe | Acción |
|---|---|
| Orden sin `stripe_checkout_session_id` | `markOrderExpired` (nunca pudo pagarse) |
| `payment_status = 'paid'` | `markOrderPaid` con el `payment_intent` de la sesión (idempotente; `{updated:false}` = ya procesada) |
| `status = 'expired'` | `markOrderExpired` |
| `status = 'open'` (la sesión sigue pagable por la brecha 15/30 min) | `stripe.checkout.sessions.expire(id)` y luego `markOrderExpired`. Cierra la brecha: nadie puede pagar una orden que ya liberó sus asientos. Si `expire` falla (p. ej. justo se pagó), se registra el error y la próxima corrida la reconcilia como pagada |
| `status = 'complete'` con `payment_status` distinto de `paid` (pago asíncrono en curso) | No tocar; se reevalúa en la siguiente corrida |

Un error de Stripe o de BD en una orden se registra (`console.error` con `orderId`, sin datos personales) y el job continúa con las demás. Una corrida con errores parciales responde 200 con el conteo; 500 solo si falla la consulta inicial.

Pago tardío sobre una orden que YA está `expired` (el pago llega después de que el webhook, el barrido perezoso o este job la expiraron): fuera de alcance. Con el cierre de sesión `open` de arriba la ventana se reduce a la que hay entre `expires_at` y la siguiente corrida del cron, y solo se pierde si un barrido perezoso expiró la orden en ese lapso. Ver pregunta 2.

## Alcance

- Incluye:
  - Service `reconcilePendingOrders` con la política de arriba, inyectando `db` y `stripe` (testeable sin red).
  - Route handler `GET /api/cron/reconcile-orders` protegido con `Authorization: Bearer ${CRON_SECRET}` (falla cerrado si `CRON_SECRET` no está configurada).
  - `vercel.json` con el cron.
  - `CRON_SECRET` en `.env.example` y nota de prueba local.
  - Log de resumen por corrida (`console.log` JSON con `scanned`, `paid`, `expired`, `closedOpen`, `alreadyProcessed`, `skipped`, `errors`).
- No incluye:
  - Reembolso o aviso de pagos tardíos sobre órdenes ya `expired` (pregunta 2).
  - Reconciliar órdenes `expired`/`cancelled` contra Stripe.
  - Paginación/cola, reintentos con backoff, métricas o alertas externas, reintento de `setOrderInvoiceUrl` (la URL de factura ya la cubre `invoice.paid`).
  - Cambios en `order.service.ts`, el webhook o `create-checkout-session.service.ts`.
  - Verificación contra Stripe real y activación del cron en Vercel: quedan como pendientes humanos (ver tarea 14 de despliegue).

## Reutilizar

- `markOrderPaid`, `markOrderExpired` (`modules/ticketing/services/order.service.ts`): sin cambios.
- `stripe` (`lib/stripe.ts`) y `getDb` (`lib/db/client.ts`).
- Helper `idOf` del webhook (`app/api/webhooks/stripe/route.ts`): es privado y de 1 línea; replicar 1 línea en el service (no extraer a `lib` por una sola reutilización, YAGNI).
- Patrón de test del webhook (`app/api/webhooks/stripe/route.test.ts`: `vi.hoisted` + `vi.mock`) para la ruta; `createTestDb` (`lib/db/test-helpers.ts`, PGlite) y el patrón de `order.service.test.ts` (seed de orden/zonas) para el service.
- Índice existente `orders_status_expires_idx`.

## Archivos

Contrato (fijado aquí para que T1 y T2 corran en paralelo):

```ts
// modules/ticketing/services/reconcile-orders.service.ts (T1)
export const RECONCILE_GRACE_MS = 2 * 60 * 1000;
export const RECONCILE_BATCH_SIZE = 50;
export interface ReconcileSummary {
  scanned: number; paid: number; expired: number; closedOpen: number;
  alreadyProcessed: number; skipped: number; errors: number;
}
// `stripe` se tipa como Pick<StripeClient["checkout"]["sessions"], "retrieve" | "expire"> envuelto: { checkout: { sessions: {...} } }
export async function reconcilePendingOrders(db: Db, stripe: StripeLike, now?: Date): Promise<ReconcileSummary>
```

Nuevos:

- `modules/ticketing/services/reconcile-orders.service.ts` (T1)
- `modules/ticketing/services/reconcile-orders.service.test.ts` (T1)
- `app/api/cron/reconcile-orders/route.ts` (T2): `GET`, `export const maxDuration = 60` (verificar nombre/uso del segment config en `node_modules/next/dist/docs/01-app`), compara el header con `crypto.timingSafeEqual`, llama al service con `await getDb()` y `stripe`, loguea y responde el resumen JSON.
- `app/api/cron/reconcile-orders/route.test.ts` (T2)
- `vercel.json` (T3): `{"crons":[{"path":"/api/cron/reconcile-orders","schedule":"*/5 * * * *"}]}`
- `.env.example` (T3): sección `# --- Cron (Vercel) ---` con `CRON_SECRET=` y comentario (generar con `openssl rand -hex 32`; en Vercel se define en Environment Variables y Vercel la envía como Bearer).

## Criterios de aceptación

- AC1: `GET /api/cron/reconcile-orders` sin header, con esquema distinto de Bearer o con token incorrecto responde 401 y no consulta BD ni Stripe.
- AC2: Si `CRON_SECRET` no está definida, responde 500 (falla cerrado), aunque llegue un `Authorization` cualquiera; nunca se acepta `Bearer undefined`.
- AC3: Con token correcto responde 200 con el `ReconcileSummary` en JSON y registra una línea de resumen.
- AC4: Solo se consideran órdenes `pending` con `expires_at <= now - 2 min`; no se tocan `paid`, `expired`, `cancelled` ni `pending` aún vigentes o dentro de la gracia.
- AC5: Se procesan como máximo `RECONCILE_BATCH_SIZE` (50) órdenes por corrida, las de `expires_at` más antiguo primero; el resto queda para la siguiente.
- AC6: Sesión `payment_status = 'paid'` → la orden queda `paid` con `stripe_payment_intent_id` y se crean sus tickets (con asiento si había `order_item_seats`); cuenta en `paid`.
- AC7: Sesión `paid` sobre una orden que ya no está `pending` (p. ej. el webhook llegó antes) → no duplica tickets; cuenta en `alreadyProcessed`.
- AC8: Sesión `status = 'expired'` → la orden queda `expired` y sus `order_item_seats` se borran; cuenta en `expired`.
- AC9: Sesión `open` → se llama `sessions.expire(id)` y luego la orden queda `expired` con asientos liberados; cuenta en `closedOpen`. Si `expire` lanza, la orden sigue `pending`, cuenta en `errors` y no se la expira localmente.
- AC10: Orden sin `stripe_checkout_session_id` → queda `expired` sin llamar a Stripe.
- AC11: Sesión `complete` con `payment_status` no pagado → no se modifica la orden; cuenta en `skipped`.
- AC12: Si `retrieve` (o BD) falla para una orden, el job registra el error con su `orderId`, incrementa `errors` y continúa con las demás órdenes del lote.
- AC13: Idempotencia: ejecutar el job dos veces seguidas con los mismos datos produce el mismo estado final y la segunda corrida no crea tickets nuevos.
- AC14: `vercel.json` declara el cron `*/5 * * * *` hacia `/api/cron/reconcile-orders`; `.env.example` documenta `CRON_SECRET`.
- AC15: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

Vitest, junto al archivo. Stripe siempre mockeado (`retrieve`/`expire` como `vi.fn`), sin red.

- `reconcile-orders.service.test.ts` (PGlite con `createTestDb`; AC4–AC13): sesión pagada (con y sin asientos), expirada, abierta (se cierra y expira; y `expire` que falla), ya procesada (orden `paid` antes de `markOrderPaid`), pago asíncrono pendiente, orden sin sesión, orden dentro de la gracia / vigente / no pending ignoradas, batch size (51 candidatas → procesa 50, orden por antigüedad), error de `retrieve` en una orden sin frenar a las otras, segunda corrida idempotente.
- `route.test.ts` (service mockeado, patrón del webhook; AC1–AC3): sin header, token incorrecto, esquema no Bearer, `CRON_SECRET` ausente, token correcto devuelve el resumen.

## Tareas

### T1 — Service de reconciliación
- Archivos: `modules/ticketing/services/reconcile-orders.service.ts`, `modules/ticketing/services/reconcile-orders.service.test.ts`
- Depende de: —
- Paralelizable: sí (con T2 y T3)
- Cubre: AC4, AC5, AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13

### T2 — Route handler protegido
- Archivos: `app/api/cron/reconcile-orders/route.ts`, `app/api/cron/reconcile-orders/route.test.ts`
- Depende de: — (solo del contrato de T1; en el test se mockea el service. Integración final la valida el reviewer cuando T1 y T2 estén)
- Paralelizable: sí (con T1 y T3)
- Cubre: AC1, AC2, AC3

### T3 — Cron de Vercel y variable de entorno
- Archivos: `vercel.json`, `.env.example`
- Depende de: —
- Paralelizable: sí (con T1 y T2)
- Cubre: AC14

AC15 lo valida el reviewer al final.

## Cómo probar localmente

1. Definir `CRON_SECRET=dev-secret` en `.env` y levantar `npm run dev`.
2. Crear una orden desde el checkout con `npm run stripe:listen` APAGADO (simula webhook perdido) y pagar con tarjeta de prueba; o dejar la sesión abierta.
3. Para no esperar 17 min, forzar `expires_at` al pasado en la BD (`UPDATE orders SET expires_at = now() - interval '5 minutes' WHERE id = '...'`).
4. `curl -H "Authorization: Bearer dev-secret" http://localhost:3000/api/cron/reconcile-orders` y comprobar el resumen y que la orden pasó a `paid` (entradas en `/mis-entradas`) o `expired`. Sin header debe dar 401.

## Pendientes humanos (fuera de las tareas)

- Verificar el flujo contra el sandbox real de Stripe (pagada con webhook apagado, abandonada, sesión `open`).
- Definir `CRON_SECRET` en Vercel y confirmar que el cron corre (Vercel > Settings > Cron Jobs). Coordinar con la tarea 14 (despliegue). Nota: el plan Hobby solo permite crons diarios; `*/5` requiere Pro (pregunta 1).
- Confirmar que la clave restringida `rk_` tenga permiso de lectura y escritura en Checkout Sessions (`retrieve` y `expire`).

## Preguntas abiertas

1. Plan de Vercel y frecuencia. Default: `*/5 * * * *` (requiere Pro). Si es Hobby, cambiar a `0 3 * * *` (diario): el job sigue sirviendo como red de seguridad, pero un cliente que pagó con webhook perdido esperaría hasta 24 h, y bajo riesgo de que un barrido perezoso expire su orden antes. Alternativa sin Vercel Pro: cron externo (Cloud Scheduler, ya que producción apunta a Cloud SQL) llamando al mismo endpoint con el Bearer.
2. Pago tardío sobre orden ya `expired` (no cubierto). Default: no hacer nada ahora y documentarlo; en una fase 2, que el job también revise órdenes `expired` de las últimas 24 h con sesión y, si la sesión está `paid`, registre el caso y reembolse (`refunds.create`) en vez de reactivarla (los asientos pudieron venderse a otro). ¿Se acepta ese default?
3. Cerrar sesiones `open` con `sessions.expire` al vencer la orden. Default: sí (cierra la brecha 15/30 min). Alternativa: solo expirar localmente y dejar abierta la sesión, aceptando pagos tardíos no atendidos.
4. Gracia 2 min y lote 50. Default según la tabla. Con tráfico alto, subir el lote o paralelizar Stripe con concurrencia 5; una orden que falla de forma permanente siempre queda al frente del lote (orden por `expires_at`): aceptable al volumen actual, revisar si el log muestra el mismo `orderId` repetido.
5. Si el handler debe además responder 200 con errores parciales (default propuesto) para evitar reintentos ruidosos de Vercel, o 500 si `errors > 0` para que aparezca en logs como fallo.

## Próximas fases

- Revisión de órdenes `expired` con pago tardío + reembolso/alerta (pregunta 2).
- Alerta externa si `errors > 0` varias corridas seguidas.
