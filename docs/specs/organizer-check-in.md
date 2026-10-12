# Organizer check-in (QR)

Estado: approved

## Objetivo

`/organizador/check-in` hoy es un `PanelComingSoon`. Esta spec lo convierte en la pantalla con la que el propio organizador valida las entradas
en la puerta: escanea el QR con la cámara (o escribe el código a mano) y la entrada queda marcada como usada, una sola vez, de forma atómica.
También muestra el contador "ingresados / vendidos" del evento elegido. Es la tarea 04 del tablero; que `/mis-entradas` refleje el estado es la
tarea 05 (aquí solo se deja `tickets.status = 'used'` y `checked_in_at` escritos en la DB).

Autorización (ver `docs/specs/organizer-events-crud.md` D3 y `modules/organizer/utils/event-permissions.ts`): siempre en servidor.
`requireRole(["organizer","admin","super_admin"])`; un `organizer` solo valida tickets de eventos con `events.organizer_id = user.id`;
`admin`/`super_admin` sin esa restricción (igual que `listEventsForViewer`, scope `all`). Usuario suspendido o borrado: no.

### Hechos verificados (base de las decisiones)

- Qué codifica el QR hoy: `TicketDetailPanel` hace `<QRCodeSVG value={order.ticketQrCodes?.[n-1] ?? "TICKETERA-<orderNumber>-<n>"} />`.
  `ticketQrCodes` sale de `tickets.qr_code` (`get-user-orders.service.ts`), creado con `crypto.randomUUID()` en `markOrderPaid`. Por tanto el QR de un
  ticket real es **el UUID v4 en texto plano, sin prefijo ni URL** (36 caracteres, ej. `3f2b...`). El valor `TICKETERA-...` es un placeholder de
  mock para órdenes sin tickets reales: el escáner **no** lo acepta (formato inválido). La UI muestra al cliente solo los primeros 8 caracteres
  en mayúsculas (`shownCode`), ver pregunta P2.
- `tickets.status` (`valid|used`) y `checked_in_at` no se usan en ningún lado; no hace falta migración.
- Cadena: `tickets -> order_items -> function_zones -> event_functions -> events`; `orders.status` debe ser `paid`.
- `requireRole` redirige si el usuario está suspendido o el rol no sirve, pero **no mira `deleted_at`**; el servicio debe cubrirlo
  (reutilizar `resolveEventScope`, que devuelve `public` para suspendido/borrado/customer).
- No hay lector de QR instalado. `qrcode.react` solo genera.
- Compatibilidad de `BarcodeDetector` (Shape Detection API): Chrome/Edge en Android y macOS/ChromeOS sí; en Windows/Linux de escritorio depende de
  versión/flags; **Safari (macOS e iOS) y Firefox no la soportan**. El check-in se hará mayormente desde un celular en la puerta, y iOS Safari
  es un caso real, así que depender solo de la API nativa deja a parte de los organizadores sin cámara.
- `getUserMedia` exige contexto seguro (HTTPS; `localhost` vale) y, en iOS, que la cámara se pida tras un gesto del usuario.

### Decisiones (con default, ver "Preguntas abiertas")

- **D1 — Escáner**: usar la librería `qr-scanner` (nimiq): usa `BarcodeDetector` nativo si existe y cae a decodificación en un worker si no,
  así que funciona en iOS Safari sin que escribamos el polyfill. Alternativa descartada por defecto: solo `BarcodeDetector` nativo (YAGNI puro,
  cero dependencias, pero rompe iOS/Firefox). Agregar dependencia requiere aprobación humana: P1. Si se rechaza, T0 desaparece y T3 usa solo la API
  nativa mostrando "Tu navegador no soporta escaneo, usa el ingreso manual".
- **D2 — Escaneo atado al evento seleccionado (sí)**: el organizador elige el evento y todo escaneo/código manual se valida contra ese evento
  (`event_id` va dentro del mismo `UPDATE`). Motivo: un organizador con dos eventos el mismo día no debe admitir en la puerta A una entrada de la
  puerta B (error humano típico), y el contador es por evento. Una entrada de otro evento propio responde `wrong_event` (con el título, es suyo); una
  de otro organizador responde `foreign` sin datos.
- **D3 — Solo eventos `published` admiten ingreso**: `draft`, `cancelled` y `suspended` responden `event_unavailable`. El selector lista solo
  eventos `published`.
- **D4 — Sin restricción de fecha/función** (default, ver P3): se permite check-in cualquier día; el resultado exitoso muestra la función
  (`event_functions.starts_at` en hora Lima) para que el organizador vea si no es la de hoy. Sin lógica de ventanas horarias (YAGNI).
- **D5 — Atomicidad**: un solo `UPDATE tickets SET status='used', checked_in_at=now() WHERE <ticket> AND status='valid' AND <evento seleccionado>
  AND <orden paid> AND <evento published> AND <scope del actor> RETURNING ...`. Condiciones de otras tablas por subconsulta/`EXISTS` o `FROM`
  (lo que soporte mejor Drizzle 0.45). Si devuelve fila, ingresa. Si no, una consulta de diagnóstico **posterior** (solo lectura) decide qué
  resultado devolver; es seguro porque `used` es un estado final (nada lo revierte).
- **D6 — Normalización del código**: se quitan todos los espacios en blanco (incluye saltos de línea al pegar), se pasa a minúsculas y debe
  ser un UUID válido (`z.uuid()`); si no, resultado `invalid` sin tocar la DB. Se acepta solo el UUID completo (P2).

## Alcance

- Incluye:
  - Página `/organizador/check-in`: selector de eventos `published` del actor, contador ingresados/vendidos, escáner de cámara, ingreso manual,
    tarjeta de resultado diferenciada.
  - Servicio de check-in con DB inyectada, schema zod del código, Server Action.
  - Contador: vendidos = tickets de órdenes `paid` del evento (todas sus funciones); ingresados = de esos, `status='used'`.
  - Dependencia `qr-scanner` (sujeta a P1).
- No incluye:
  - Rol staff / acceso a otras personas distintas del organizador (admin/super_admin sí).
  - Que `/mis-entradas` muestre "usada" (tarea 05).
  - Reembolsos, deshacer un check-in, modo offline, impresión, historial/lista de ingresos, exportar.
  - Restricción por fecha o por función (P3), asientos.
  - Prefijo de 8 caracteres como código manual (P2).
  - Cambios de schema/migraciones.

## Reutilizar

- `lib/db/schema.ts` (`tickets`, `orderItems`, `orders`, `functionZones`, `eventFunctions`, `events`, `venueZones` para el nombre de zona),
  `getDb`, tipo `Db` de `lib/db/client`.
- `listEventsForViewer(db, actor, { status: "published" })` y `resolveEventScope` de `modules/events/services/list-events-for-viewer.service.ts`
  (scope own/all y exclusión de suspendido/borrado). No reimplementar el scope.
- `requireRole` de `modules/users/services/current-user.service.ts`.
- `formatLimaDateTime` de `modules/organizer/utils/lima-time.ts` (hora de ingreso y de la función).
- Patrón de Server Action y `EventActionError`-style de `modules/organizer/actions/event.actions.ts` (`run`, `INVALID_INPUT`, solo se muestran mensajes de la
  clase de error propia). Patrón de tests con `createTestDb` (PGlite) de `modules/users/services/user-account.service.test.ts`.
- Patrón de agregados con joins `orders.status = 'paid'` de `modules/organizer/services/get-organizer-summary.service.ts`.
- shadcn ya instalado en `components/ui/`: `select`, `input`, `button`, `card`, `badge`. No hace falta `npx shadcn add`.
- `PanelComingSoon` deja de usarse en esta ruta (no se borra, otras rutas lo usan).

## Archivos

Nuevos (todo en `modules/organizer/`, dominio del panel de organizador):

- `modules/organizer/schemas/check-in.schema.ts` (+ `.test.ts`)
- `modules/organizer/services/check-in.service.ts` (+ `.test.ts`)
- `modules/organizer/actions/check-in.actions.ts` (+ `.test.ts`)
- `modules/organizer/hooks/useQrScanner.ts` (+ `.test.ts`)
- `modules/organizer/components/QrScanner.tsx`
- `modules/organizer/components/CheckInPanel.tsx`
- `modules/organizer/components/CheckInResultCard.tsx`

Modificados:

- `app/(panel)/organizador/check-in/page.tsx` (Server Component: `requireRole`, carga eventos + contadores, renderiza `CheckInPanel`)
- `package.json`, `package-lock.json` (T0, solo si P1 se aprueba)

### Contrato del servicio (`check-in.service.ts`)

```ts
type CheckInActor = EventViewer                       // id, role, isSuspended, deletedAt
type CheckInStats = { sold: number; entered: number }
type CheckInResult =
  | { status: "admitted";          checkedInAt: string; zoneName: string; functionStartsAt: string }
  | { status: "already_used";      checkedInAt: string; zoneName: string }
  | { status: "wrong_event";       ticketEventTitle: string }   // evento propio del actor, distinto al seleccionado
  | { status: "foreign" }                                       // de otro organizador: sin datos
  | { status: "unpaid" }                                        // orden pending/expired/cancelled
  | { status: "event_unavailable" }                             // evento no published
  | { status: "not_found" }                                     // UUID válido pero inexistente
  | { status: "invalid" }                                       // formato (no UUID, vacío, placeholder TICKETERA-...)

listCheckInEvents(db, actor): Promise<(ViewerEvent & CheckInStats)[]>      // solo published, scope del actor
getCheckInStats(db, actor, eventId): Promise<CheckInStats>
checkInTicket(db, actor, { eventId, code }): Promise<{ result: CheckInResult; stats: CheckInStats }>
```

Errores no recuperables (actor sin permiso, `eventId` inexistente o fuera del scope del actor) lanzan `CheckInError` con mensaje seguro.
Fechas viajan como ISO string (serializables por la Server Action).

## Criterios de aceptación

- AC1: `/organizador/check-in` ya no muestra "próximamente"; para un organizer lista solo sus eventos `published` y para admin/super_admin todos los `published`.
  El selector preselecciona el primero; sin eventos publicados muestra un estado vacío con enlace a `/organizador`.
- AC2: El contador del evento seleccionado muestra "ingresados / vendidos" (ej. `3 / 120`). `sold` cuenta solo tickets de órdenes `paid` del
  evento (todas sus funciones); `entered` los de esos con `status='used'`. Se actualiza tras cada check-in sin recargar la página.
- AC3: Un ticket `valid`, de orden `paid`, de evento `published` seleccionado y propio, pasa a `used` con `checked_in_at = now()` y se
  responde `admitted` con zona y función (hora Lima). El contador `entered` sube en 1.
- AC4: Escanear de nuevo el mismo ticket responde `already_used` con la hora de ingreso en Lima, sin modificar `checked_in_at`.
- AC5 (concurrencia): dos llamadas simultáneas a `checkInTicket` con el mismo ticket producen exactamente un `admitted` y un `already_used`,
  y `checked_in_at` queda con el valor de la primera. La implementación usa un único `UPDATE ... WHERE status='valid' ... RETURNING`.
- AC6: Ticket de un evento propio distinto al seleccionado -> `wrong_event` con el título de ese evento; el ticket **no** cambia.
- AC7: Ticket de otro organizador -> `foreign`; la respuesta no contiene título, zona, fechas, ni comprador, y el ticket no cambia. Para
  admin/super_admin, ese mismo ticket se admite si pertenece al evento seleccionado.
- AC8: Ticket cuya orden está `pending`, `expired` o `cancelled` -> `unpaid` y no cambia.
- AC9: Ticket de evento `draft`, `cancelled` o `suspended` -> `event_unavailable` y no cambia.
- AC10: Código vacío, no-UUID o el placeholder `TICKETERA-...` -> `invalid` sin consulta a la DB; UUID bien formado inexistente -> `not_found`.
- AC11: El código se normaliza: `"  3F2B...-UPPER \n"` (espacios/saltos de línea alrededor o dentro, mayúsculas) equivale al UUID en minúsculas.
- AC12: Autorización en servidor: sin sesión -> redirect a `/ingresar`; customer o usuario suspendido -> redirect a `/` (vía `requireRole`);
  usuario con `deleted_at` o `eventId` fuera del scope del actor -> la Server Action responde `{ error }` genérico y no modifica nada.
  Un organizer no puede obtener contadores ni validar tickets de eventos ajenos aunque envíe un `eventId` arbitrario.
- AC13: La Server Action valida entrada con zod (`eventId` uuid, `code` string con longitud máxima 200) y nunca expone mensajes internos
  (solo los de `CheckInError`); resultados de negocio (`already_used`, etc.) no son errores, son `result`.
- AC14: Cámara: se activa con un botón "Activar cámara" (gesto del usuario, cámara trasera preferida `facingMode: environment`). Cada código
  decodificado se envía una sola vez: el mismo código se ignora durante ~3 s y no se envía otro mientras haya una validación pendiente.
  La cámara se libera (tracks detenidos) al desmontar, al desactivarla y tras desmontar el componente.
- AC15: Sin permiso de cámara, sin cámara, o contexto no seguro -> mensaje claro en español y el ingreso manual sigue funcionando.
  Navegador sin soporte de escaneo (solo si P1 se rechaza y no hay `BarcodeDetector`) -> mensaje y ingreso manual.
- AC16: Ingreso manual: input + botón "Validar" (Enter también); usa la misma Server Action y la misma tarjeta de resultado; el input se
  limpia tras un `admitted` y se conserva en los demás casos.
- AC17: `CheckInResultCard` diferencia visualmente y con texto (no solo color) cada estado: admitted (ingresa), already_used (con hora),
  wrong_event, foreign, unpaid, event_unavailable, not_found, invalid; con `role="status"`/`aria-live` para lectores de pantalla.
- AC18: Cambiar de evento limpia el último resultado y muestra el contador del nuevo evento.
- AC19: Todo texto de UI en español; nombres de archivos/código en inglés; hora siempre en Lima vía `formatLimaDateTime`.
- AC20: `npm run lint`, `npx vitest run` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)

- `check-in.schema.test.ts`: normalización (espacios, saltos de línea, mayúsculas, trim), UUID válido, rechazo de vacío, de 8 caracteres, de
  `TICKETERA-123-1`, de longitud excesiva. (AC10, AC11, AC13)
- `check-in.service.test.ts` (`createTestDb`, PGlite; helper `setup()` que crea organizers A y B, admin, evento published de A con 2 funciones,
  evento 2 de A, evento de B, órdenes paid/pending/expired/cancelled, tickets): (AC2-AC12)
  - admitted marca `status`/`checked_in_at` en la DB; already_used conserva el `checked_in_at` original.
  - concurrencia: `Promise.all` de N>=2 `checkInTicket` sobre el mismo ticket -> un solo `admitted`, el resto `already_used`, `entered` = 1.
    Nota: PGlite usa una sola conexión y serializa; el test valida la guarda `status='valid'`, no el bloqueo real de filas de Postgres. Se acepta
    esa limitación y se documenta en el test.
  - wrong_event, foreign (sin campos extra en el objeto), admin admite ticket de otro organizador, unpaid x3 estados, event_unavailable x3 estados,
    not_found, invalid.
  - stats: `sold` ignora órdenes no paid y suma varias funciones; `entered` solo `used`; `getCheckInStats` con evento ajeno lanza `CheckInError`.
  - actor suspendido o con `deletedAt` y rol customer -> `CheckInError`; `listCheckInEvents` solo published y scope own/all.
- `check-in.actions.test.ts` (mock de `requireRole` y `getDb`, como `event.actions.test.ts`): input inválido -> `{ error }`; llama al servicio con el
  actor; `CheckInError` -> mensaje propio, otro error -> mensaje genérico; resultados de negocio se devuelven como `result`. (AC12, AC13)
- `useQrScanner.test.ts` (mock de `qr-scanner`/`BarcodeDetector`): dedupe del mismo código ~3 s (fake timers), no emite mientras `busy`,
  mapea `NotAllowedError`/`NotFoundError`/contexto no seguro a estados de error, y llama a `stop`/`destroy` al desmontar. (AC14, AC15)
- Sin tests para `QrScanner.tsx`, `CheckInPanel.tsx`, `CheckInResultCard.tsx` ni `page.tsx` si son presentacionales; si `CheckInPanel` tiene
  lógica de estado no trivial, el developer extrae esa lógica al hook o agrega un test (decisión del developer, sin crear archivos fuera de los declarados).

## Casos límite cubiertos

Doble escaneo simultáneo (AC5); código con espacios/mayúsculas (AC11); orden `expired`/`pending`/`cancelled` (AC8); evento `cancelled`/`suspended`/`draft`
(AC9); organizador suspendido o borrado (AC12); organizer enviando `eventId` ajeno (AC12); sin permiso de cámara / sin cámara / HTTP (AC15);
navegador sin `BarcodeDetector` (D1, AC15); la cámara decodifica el mismo QR muchas veces por segundo (AC14); ticket de otro evento propio (AC6);
placeholder `TICKETERA-...` (AC10); función de otra fecha (D4, solo se informa).

## Tareas

### T0 — Dependencia del escáner
- Archivos: `package.json`, `package-lock.json` (`npm install qr-scanner`; verificar que el build de Next 16/Turbopack resuelve el worker)
- Depende de: aprobación de P1 (si se rechaza, se omite)
- Paralelizable: sí (con T1)
- Cubre: AC14, AC15 (habilita)

### T1 — Schema y servicio de check-in
- Archivos: `modules/organizer/schemas/check-in.schema.ts`, `check-in.schema.test.ts`, `modules/organizer/services/check-in.service.ts`, `check-in.service.test.ts`
- Depende de: —
- Paralelizable: sí (con T0 y T3)
- Cubre: AC2-AC13

### T2 — Server Action
- Archivos: `modules/organizer/actions/check-in.actions.ts`, `check-in.actions.test.ts`
- Depende de: T1
- Paralelizable: no (necesita el contrato de T1); sí en paralelo con T3
- Cubre: AC12, AC13

### T3 — Escáner de cámara
- Archivos: `modules/organizer/hooks/useQrScanner.ts`, `useQrScanner.test.ts`, `modules/organizer/components/QrScanner.tsx`
- Depende de: T0 (si P1 aprobada)
- Paralelizable: sí (con T1 y T2)
- Cubre: AC14, AC15

### T4 — UI de la pantalla y página
- Archivos: `modules/organizer/components/CheckInPanel.tsx`, `modules/organizer/components/CheckInResultCard.tsx`, `app/(panel)/organizador/check-in/page.tsx`
- Depende de: T2, T3
- Paralelizable: no
- Cubre: AC1, AC2, AC14-AC19

Grupos: {T0, T1} en paralelo -> {T2, T3} en paralelo -> T4. Cada archivo pertenece a una sola tarea.

## Preguntas abiertas

- P1 — Dependencia `qr-scanner` (~0.5 MB unpacked, worker incluido). Default: aprobar, porque iOS Safari/Firefox no tienen `BarcodeDetector`. Si se
  rechaza: escaneo solo con `BarcodeDetector` nativo, iOS/Firefox usan solo ingreso manual (P2 pasa a ser crítica).
- P2 — Ingreso manual: hoy el cliente ve solo los primeros 8 caracteres del código (`shownCode`), así que el respaldo manual con UUID completo es
  poco práctico (solo sirve copiando/pegando). Default: aceptar solo el UUID completo. Alternativa: aceptar los 8 caracteres, resolviendo solo dentro de los tickets
  `valid` pagados del evento seleccionado y exigiendo coincidencia única (si hay 2+ pide el código completo); requiere cambiar el servicio y
  no toca la UI de `/mis-entradas`.
- P3 — Fecha/función: ¿rechazar check-in si la función no es del día (en Lima)? Default: permitir siempre y mostrar la función en el resultado. Alternativa:
  advertencia no bloqueante o ventana configurable (p. ej. desde N horas antes), fuera de esta fase.
- P4 — Admin/super_admin: ¿ven y validan todos los eventos `published` (default, coherente con `listEventsForViewer`) o solo los propios, como dice D3 de
  `organizer-events-crud`?
- P5 — `foreign` vs `not_found`: son resultados distintos por requerimiento. Default: se mantienen distintos (los UUID v4 no se pueden adivinar, así que no
  es un oráculo útil). Alternativa: unificarlos en un solo mensaje "No pertenece a tus eventos".
- P6 — Evento `suspended`/`cancelled` con entradas vendidas: default rechazar (D3). ¿Se necesita un caso para admitir igual en cancelados? (hoy no).

## Próximas fases

- Tarea 05: `/mis-entradas` muestra el estado real (usada/válida) leyendo `tickets.status` / `checked_in_at`.
- Rol staff con acceso solo a check-in, modo offline, lista de ingresos, ventana horaria por función (P3), deshacer check-in.
