# System Design + MER: Ticketera

Estado: draft

## Objetivo

Definir la arquitectura de sistema (ambientes, auth, pagos) y el Modelo
Entidad-Relación (MER) de la base de datos para Ticketera, una plataforma de
venta de entradas para eventos con reserva de espacio por zonas. La UI
(landing, catálogo, detalle de evento, selección de entradas) ya está
construida sobre datos mock (ver `docs/specs/landing-design-foundation.md`,
`events-catalog.md`, `event-detail.md`, `ticket-selection.md`); este
documento define cómo pasa de datos mock a una base de datos real con auth y
pagos reales.

No incluye el design system visual (tokens de color/tipografía/componentes)
— eso se retoma en un documento aparte cuando haya una referencia de UI real
que compartir (fuera de alcance explícito de esta sesión, no de esta spec
indefinidamente).

## Contexto de negocio (acordado en brainstorming)

- Plataforma de eventos con reserva de espacio por **zonas de cupo**
  (ej. "Campo VIP", "Tribuna Norte"), sin asientos individuales numerados —
  coincide con lo ya construido en `ticket-selection.md`.
- Un `Evento` agrupa una o más `Función` (fecha/hora); cada función tiene su
  propia disponibilidad y precios por zona.
- 4 roles: `super_admin` y `admin` (mismo nivel de permisos, Super Admin es
  solo la cuenta raíz simbólica), `organizer` (crea venues/eventos/funciones,
  hace su propio check-in), `customer` (compra entradas).
- Organizador: cuenta individual (no equipo), autoservicio sin aprobación
  manual, crea sus propios venues.
- Pagos: Stripe Connect (Express), comisión de plataforma fija vía config,
  resto va directo al organizador. Ventas finales, sin reembolsos.
- Check-in: QR por entrada, escaneado por el propio organizador.
- Auth: Clerk (email/password + Google).
- Google Maps: solo mostrar el pin del venue, sin autocompletado de
  direcciones.

## Arquitectura y ambientes

**Componentes:**
- Next.js (App Router) como frontend + backend (API routes / Server
  Actions), un solo codebase — sin servicio separado.
- Base de datos Postgres vía **Drizzle ORM** (`drizzle-orm` + `drizzle-kit`
  para migraciones), un solo `schema.ts` compartido entre ambientes.
- Auth: Clerk, sincronizado a una tabla `users` propia vía webhook.
- Pagos: Stripe + Stripe Connect Express.
- Mapas: Google Maps JS API, solo para mostrar el pin del venue.

**Ambientes:**

| | Local | Producción |
|---|---|---|
| App | Next.js en `localhost:3000` | Next.js en Vercel |
| DB | Neon Postgres | Google Cloud SQL (Postgres) |
| Driver Drizzle | `@neondatabase/serverless` (HTTP) | `node-postgres` (`pg`) + `@google-cloud/cloud-sql-connector` |
| Auth | Clerk (dev instance) | Clerk (prod instance) |
| Pagos | Stripe modo test | Stripe modo live |

El driver de Drizzle se selecciona por variable de entorno
(`DATABASE_DRIVER=neon|pg`); no hay ramas de lógica de negocio distintas por
ambiente, solo configuración de conexión.

```
Local:  Browser → Next.js (localhost) → Drizzle (neon-http) → Neon Postgres
                              ↘ Clerk (dev)
                              ↘ Stripe (test)

Prod:   Browser → Next.js (Vercel) → Drizzle (pg + Cloud SQL Connector) → Cloud SQL Postgres
                              ↘ Clerk (prod)
                              ↘ Stripe (live) + Stripe Connect
                              ↘ Google Maps API
```

## Roles y permisos

Un campo `role` (enum) en `users`, sin tabla de permisos granular.

| Rol | Puede |
|---|---|
| `super_admin` | Todo lo de `admin`; es la cuenta raíz (no se puede auto-degradar/eliminar desde el panel). |
| `admin` | Ver/moderar todos los eventos, venues y usuarios; suspender organizadores o eventos; ver reportes globales. No crea eventos ni vende entradas. |
| `organizer` | CRUD de sus propios venues/zonas/eventos/funciones; ver sus ventas; check-in (QR) de sus propios eventos; conectar su cuenta Stripe Connect. |
| `customer` | Comprar entradas, ver sus propios tickets/QR e historial. |

Reglas de autorización en cada Server Action/API route (no RLS de Postgres):
`organizer` solo opera filas donde `owner_id = su propio user.id`;
`admin`/`super_admin` sin esa restricción; `customer` solo ve sus propias
`orders`/`tickets`.

Alta de roles: todo usuario nuevo entra como `customer` (webhook
`user.created` de Clerk). Pasar a `organizer` es autoservicio (un botón que
solo actualiza `role`, sin aprobación). `admin`/`super_admin` se asignan
manualmente, sin flujo de autoservicio.

## Autenticación (Clerk)

- Clerk gestiona login/registro (email/password + Google) y la sesión.
  Reemplaza la UI mock de login/registro de la Fase 6 del roadmap de UI.
- La tabla `users` no duplica credenciales de Clerk: guarda `clerk_user_id`,
  `role` y datos de negocio (Stripe Connect, suspensión).
- Sincronización vía webhook (`app/api/webhooks/clerk/route.ts`) en
  `user.created` / `user.updated` / `user.deleted` → upsert en `users`.
- `clerkMiddleware` protege rutas privadas (`/dashboard`, `/mis-entradas`,
  `/organizador/*`).
- El rol de negocio se resuelve consultando `users` por `clerk_user_id`
  (no vive en `publicMetadata` de Clerk, para no duplicar fuente de verdad).

## Pagos (Stripe Connect)

- **Stripe Connect Express**: Stripe aloja el onboarding (KYC, datos
  bancarios), evita construir esa UI.
- **Onboarding organizador**: al pasar a `organizer`, botón "Conectar con
  Stripe" → `stripe.accounts.create` + Account Link de onboarding →
  `stripe_account_id` se guarda en `users`. Webhook `account.updated`
  actualiza `stripe_charges_enabled`/`stripe_payouts_enabled`. Sin
  `charges_enabled: true`, el organizador no puede publicar eventos
  (`status: draft` únicamente).
- **Checkout del cliente**:
  1. El cliente arma su selección de zonas/cantidades (UI ya construida) →
     confirma → se crea una `order` (`status: pending`, `expires_at` corto)
     + sus `order_items`, dentro de una transacción que valida capacidad
     disponible (`SELECT ... FOR UPDATE` sobre `function_zones`).
  2. Se crea un Stripe Checkout Session (`mode: payment`) con
     `line_items` desde `order_items`,
     `payment_intent_data.application_fee_amount` (comisión fija vía
     `PLATFORM_FEE_PERCENT`), y
     `payment_intent_data.transfer_data.destination` = `stripe_account_id`
     del organizador (destination charge — sin pasos manuales de transfer).
  3. Redirige al Checkout hospedado por Stripe.
  4. Webhook `checkout.session.completed` marca `order.status = paid` y
     genera un `ticket` (con `qr_code` único) por cada unidad comprada.
  5. `checkout.session.expired` (o el cálculo de disponibilidad que ignora
     `pending` vencidos) libera la zona sin acción manual.
- **No hay reembolsos**: ventas finales, sin endpoint ni UI de refund.
- **La orden `pending` con `expires_at` ES el mecanismo de hold** (ver
  siguiente sección) — no existe una tabla de "hold" separada.

## MER (Modelo Entidad-Relación)

### Entidades

**`users`** — una fila por persona, cualquier rol.
`id, clerk_user_id (unique), email, full_name, role (super_admin|admin|organizer|customer), stripe_account_id (nullable), stripe_charges_enabled (bool), stripe_payouts_enabled (bool), is_suspended (bool), created_at, updated_at`

**`event_categories`** — catálogo fijo (hoy `MOCK_CATEGORIES`).
`id, name, icon_key (string, mapeado a un ícono Lucide en frontend), color_key`

**`venues`** — creados por el organizador.
`id, organizer_id → users.id, name, address, city, lat, lng, created_at, updated_at`

**`venue_zones`** — layout físico del venue (reutilizable entre funciones del mismo venue).
`id, venue_id → venues.id, name, shape_x, shape_y, shape_width, shape_height (coords 0-100, igual que el SVG ya construido), capacity, created_at`

**`events`** — el concepto general (ej. "Hamlet").
`id, organizer_id → users.id, category_id → event_categories.id, venue_id → venues.id, slug (unique), title, description, image_url, doors_open_time, show_start_time, minimum_age, admission_type, status (draft|published|cancelled|suspended), created_at, updated_at`

**`event_functions`** — cada fecha/hora concreta de un evento.
`id, event_id → events.id, starts_at (timestamptz), created_at`

**`function_zones`** — precio y cupo de una zona para una función específica (puede variar entre funciones del mismo venue).
`id, function_id → event_functions.id, venue_zone_id → venue_zones.id, price, currency, capacity (snapshot, normalmente = venue_zones.capacity), created_at`

**`orders`** — también actúa como el "hold" mientras está `pending`.
`id, customer_id → users.id, status (pending|paid|expired|cancelled), total_amount, currency, stripe_checkout_session_id, stripe_payment_intent_id, expires_at, created_at, updated_at`

**`order_items`** — líneas de la orden (una por zona elegida).
`id, order_id → orders.id, function_zone_id → function_zones.id, quantity, unit_price (precio congelado al momento de comprar)`

**`tickets`** — una fila por entrada individual (QR/check-in), generadas al confirmar el pago.
`id, order_item_id → order_items.id, qr_code (unique), status (valid|used), checked_in_at (nullable), created_at`

### Relaciones

```
users (organizer) ─< venues ─< venue_zones
users (organizer) ─< events >─ event_categories
events ─< event_functions ─< function_zones >─ venue_zones
users (customer)  ─< orders ─< order_items >─ function_zones
order_items ─< tickets
```

### Disponibilidad (cálculo, no columna almacenada)

```
disponible(function_zone) = function_zones.capacity
  - SUM(order_items.quantity)
    WHERE order_items.function_zone_id = function_zone.id
    AND orders.status = 'paid'
       OR (orders.status = 'pending' AND orders.expires_at > now())
```

### Índices/constraints clave
- `UNIQUE`: `users.clerk_user_id`, `events.slug`, `tickets.qr_code`.
- Índice en `orders(status, expires_at)` para el job de reconciliación/expiración.
- Índice en `order_items(function_zone_id)` (consultado en cada cálculo de disponibilidad).
- Ownership de `organizer` verificado por `venues.organizer_id` / `events.organizer_id` en cada Server Action.

## Manejo de errores

- **Carrera de disponibilidad**: la verificación de cupo y el `INSERT` de
  `order_items` corren en una misma transacción con `SELECT ... FOR UPDATE`
  sobre `function_zones`; si no alcanza, la orden no se crea.
- **Webhook de Stripe no llega**: job periódico reconcilia `orders.pending`
  contra el estado real en Stripe (red de seguridad, no el camino feliz).
- **Orden `pending` expirada**: se ignora automáticamente en el cálculo de
  disponibilidad (no requiere borrado activo); un job la pasa a `expired`
  solo por prolijidad de reportes.
- **Webhook duplicado** (reintentos de Stripe): idempotente — si la orden ya
  está `paid`, no se vuelven a crear tickets.
- **Organizador sin Stripe conectado**: bloqueado al intentar publicar un
  evento (`draft → published`), verificado en el Server Action, no solo en
  la UI.

## Testing

Mismo patrón que ya usa el proyecto (Vitest; lógica pura con test,
composición sin test — `docs/SETUP.md` 3.2):
- Cálculo de disponibilidad (`capacity - SUM(quantity)`): holds vencidos,
  pagados y mixtos.
- Cálculo de `application_fee_amount` con distintos montos y el % de config.
- Resolución de rol/ownership (`organizer` solo ve lo suyo).
- Webhooks de Clerk y Stripe con payloads mockeados (creación de usuario,
  pago confirmado, pago duplicado).

## Fuera de alcance

- Reembolsos/cancelaciones de compra.
- Asientos individuales numerados (solo zonas de cupo).
- Multi-tenant/equipo por organizador (un organizador = un usuario).
- Aprobación manual de organizadores.
- Comisión configurable por evento/organizador (un único % global).
- Autocompletado de direcciones con Google Places (solo se muestra el pin).
- Rol "staff" de puerta (el check-in lo hace el propio organizador).
- Redis o cualquier infraestructura de colas/cache nueva.
- Design system visual (tokens de color/tipografía/componentes) — pendiente
  de una referencia de UI real.

## Decisiones técnicas registradas

- **ORM**: Drizzle (no Prisma) — decisión explícita del usuario sobre la
  recomendación inicial.
- **Hold de disponibilidad**: se modela como una `order` en estado
  `pending` con `expires_at`, no como una tabla `zone_hold` separada —
  menos una tabla, mismo comportamiento.
- **Granularidad de reserva**: solo zonas de cupo, ajustado para matchear
  la UI ya construida en `docs/specs/ticket-selection.md` (que descartó
  asiento individual explícitamente por YAGNI).
