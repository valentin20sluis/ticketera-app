# Mis entradas — rediseño maestro-detalle

Estado: draft

## Objetivo
Rediseñar `/mis-entradas` (hoy una lista de tarjetas que se expanden en el lugar, de `mis-entradas.md`) a un layout maestro-detalle de dos columnas, según la referencia visual que adjuntó el usuario: a la izquierda la lista de pedidos (seleccionable), a la derecha el detalle de la entrada seleccionada dentro de ese pedido — banner del evento, datos (Zona, Asiento, Titular, Código, Estado), su QR, navegación "Entrada X de N" entre las entradas del mismo pedido, y los botones "Descargar PDF" / "Agregar al calendario" ya resueltos en la Fase 5 (`checkout-calendar-pdf.md`) pero nunca conectados a esta pantalla. Sigue siendo **solo UI/UX**: mock data, sin backend, sin sesión real más allá de `useAuthSession` (localStorage, de `auth-session-persistence.md`).

**Decisión central (por qué ahora, y qué cambia respecto a `mis-entradas.md`):** el usuario probó la pantalla actual y pidió explícitamente el layout de dos columnas con selección, con una imagen de referencia. Esta spec **reemplaza** la interacción "expandir tarjeta in place" (T2/T3 de `mis-entradas.md`, componente `TicketOrderCard`) por el nuevo layout; no la complementa. `TicketOrderCard.tsx` se elimina (ver Reutilización) porque queda sin ningún uso una vez migrado `MyTicketsView`.

**Decisión de filtro: 2 segmentos con contador ("Próximas (N)" / "Pasadas (N)"), no 3 sin contador.** La referencia visual muestra un control segmentado de 2 opciones con el conteo entre paréntesis, no el `Tabs` de 3 opciones ("Todas/Próximas/Pasadas") sin contador que ya existe. Se quita el segmento "Todas" (con 2 segmentos alcanza para separar los dos estados posibles de `getOrderStatus`, que es binario) y el filtro por defecto pasa a ser `"upcoming"` (antes era `"all"`), igual que en la referencia. Se sigue reutilizando `components/ui/tabs.tsx` (mismo patrón `value`/`onValueChange`, sin `TabsContent`) — ver AC-6.

**Decisión de layout y dónde vive el encabezado: el título "Mis entradas" + el control segmentado se mueven adentro de `MyTicketsView`, en la misma fila (el título a la izquierda, el segmentado a la derecha), para poder calcular los contadores de cada segmento a partir de `orders` sin levantar estado hasta el Server Component.** `app/mis-entradas/page.tsx` se simplifica a componer solo `<MyTicketsView orders={MOCK_TICKET_ORDERS} />`, sin su propio `<h1>`/`<p>` (que hoy duplica innecesariamente lo que puede vivir en un único Client Component responsable de todo el contenido interactivo de la pantalla).

**Decisión de selección: estado local en `MyTicketsView` (`activeTab`, `selectedOrderNumber`, `selectedTicketNumber`), sin URL ni store global.** Mismo criterio YAGNI que ya aplicó `auth-ui.md`/`mis-entradas.md` para no crear abstracciones (ni un store de `zustand`, ni query params) para estado que solo necesita vivir mientras la pantalla está montada. Al cambiar `activeTab`, o si el pedido seleccionado deja de estar en `filteredOrders`, la selección se reinicia al primer pedido filtrado con `selectedTicketNumber = 1`. Si `filteredOrders` queda vacío, no hay selección y la columna derecha no renderiza ningún panel (solo el mensaje de "sin entradas" ya existente, reutilizado de `mis-entradas.md`).

**Decisión de los 4 campos nuevos del detalle (Zona, Asiento, Titular, Código, Estado) — de dónde sale cada uno, sin tocar `TicketStub` ni `ConfirmedOrder`:**
- **Zona**: ya existe en `TicketStub.zoneName` (de `buildTicketStubs`, sin cambios).
- **Asiento**: texto fijo `"Sin asiento asignado"`. El mock de zonas de esta app es siempre de admisión general (`modules/my-tickets/data/my-tickets.mock.ts`, `modules/events/data/events.mock.ts`) — no existe ningún dato de asiento numerado en ningún lado del dominio, así que no hay nada real que mostrar; inventar un asiento aleatorio sería un dato falso sin fuente, texto fijo es honesto con lo que la demo realmente modela.
- **Titular**: `session?.fullName ?? session?.email ?? "Invitado"`, leído con el `useAuthSession()` ya existente (`modules/auth/hooks/useAuthSession.ts`, Fase de `auth-session-persistence.md`) — es el mismo hook que ya usa `AuthNavSection`. Conecta "la entrada es mía" con "quién inició sesión", que es justamente lo que pidió el usuario, sin inventar un campo nuevo en el mock de pedidos (los pedidos mock no tienen comprador asociado y no deberían: son un historial ficticio, no ligado a una cuenta real — ver "Fuera de alcance").
- **Código**: nueva función pura `getTicketCode(orderNumber, ticketNumber)` → `` `TK-${orderNumber sin prefijo "TKT-"}-${ticketNumber con padding a 2 dígitos}` `` (ej. `"TKT-8X3K2Q"` + `1` → `"TK-8X3K2Q-01"`). Determinístico a partir de datos que ya existen (no se guarda en el mock, se deriva).
- **Estado**: deriva de `getOrderStatus` (ya existente, sin cambios): `"upcoming"` → `"Válida"`, `"past"` → `"Usada"`. No es un campo de datos nuevo, es texto condicional en el componente de detalle (SETUP.md 3.2, lógica trivial de presentación).

**Decisión de "Descargar PDF" / "Agregar al calendario" en el panel de detalle: reutilizar `generateTicketsPdf` y `downloadCalendarFile` tal cual, sin modificarlos.** `generateTicketsPdf({ order, stubs, qrElements })` ya itera genéricamente sobre el array de `stubs`/`qrElements` que se le pase — para el PDF de una sola entrada basta con llamarlo con arrays de un elemento (`stubs: [stub]`, `qrElements: [elQr]`), sin tocar `modules/checkout/utils/generate-tickets-pdf.ts`. `downloadCalendarFile(order)` ya genera el `.ics` a nivel de evento/pedido (no por entrada individual, porque un evento tiene una sola fecha/hora sin importar cuántas entradas tenga esa orden) — se reutiliza igual, pasándole el pedido seleccionado completo, sin modificar `modules/checkout/utils/generate-calendar-file.ts`.

**Decisión sobre el ícono circular junto a "Entrada X de N" en la referencia:** no se implementa. Su función no es identificable solo por la imagen (no hay texto ni se describió su comportamiento) y no fue pedido explícitamente; agregar un botón sin saber qué debe hacer violaría YAGNI. Si el usuario lo necesita, se define en una spec futura con su comportamiento exacto.

## Fuera de alcance
- Ligar los pedidos mock a la cuenta que inició sesión (ej. que cada pedido tenga un `buyerEmail` y se filtre `MOCK_TICKET_ORDERS` por el `session.email` actual): seguimos sin backend ni usuarios reales; el campo "Titular" usa la sesión actual solo como texto de despliegue (ver decisión arriba), no como filtro de qué pedidos se listan — todos los pedidos mock siguen siendo siempre los mismos 5, para cualquier sesión.
- Gatear `/mis-entradas` para redirigir a `/ingresar` si no hay sesión: sigue sin existir el concepto de ruta protegida (mismo criterio de `auth-ui.md`/`mis-entradas.md`); sin sesión, "Titular" simplemente muestra `"Invitado"`.
- El ícono circular ambiguo junto al contador de entradas (ver decisión arriba).
- Asientos reales / mapa de butacas en esta pantalla: el "Asiento" es siempre el texto fijo documentado arriba; no se conecta con `venue-zone-map-redesign.md` (ese mapa es del flujo de compra, no de esta pantalla).
- Cambiar `TicketStub`, `buildTicketStubs`, `TicketStubCard`, `ConfirmedOrder`, `generateTicketsPdf` o `generate-calendar-file.ts`: los cinco se reutilizan sin modificar (`TicketStubCard` deja de usarse en esta pantalla pero sigue intacto para `CheckoutConfirmationStep.tsx`, que no cambia).
- Paginación/búsqueda de la lista de pedidos: sigue sin hacer falta con 5 pedidos mock (mismo criterio ya documentado en `mis-entradas.md`).
- Marcar una entrada como "usada" de verdad (ej. al hacer click en algo): "Estado" es puramente derivado de la fecha (ver decisión arriba), no hay acción que lo cambie.

## Reutilización
- Existente que se reutiliza sin cambios: `modules/checkout/utils/build-ticket-stubs.ts` (`buildTicketStubs`, `TicketStub`), `modules/checkout/types/checkout.types.ts` (`ConfirmedOrder`), `modules/my-tickets/utils/get-order-status.ts` (`getOrderStatus`), `modules/my-tickets/data/my-tickets.mock.ts` (`MOCK_TICKET_ORDERS`), `modules/checkout/utils/generate-tickets-pdf.ts` (`generateTicketsPdf`), `modules/checkout/utils/generate-calendar-file.ts` (`downloadCalendarFile`), `modules/auth/hooks/useAuthSession.ts` (`useAuthSession`), `modules/events/utils/format-event-date.ts` (`formatEventDateBadge`, `formatFullEventDate`, `formatEventTime`), `lib/format-currency.ts` (`formatPrice`), `lib/utils.ts` (`cn`).
- Patrón que se reutiliza: el chip de fecha flotante (`formatEventDateBadge` + el `<div className="absolute top-3 left-3 ...">` con mes/día) ya usado en `modules/events/components/EventCard.tsx` — se replica igual sobre el banner del panel de detalle.
- Patrón que se reutiliza: el estilo de tarjeta seleccionable `isActive ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"` ya usado en `modules/events/components/ZoneSelectorList.tsx` y `modules/checkout/components/PaymentMethodSection.tsx` — se aplica igual a `TicketOrderListItem`.
- Patrón que se reutiliza: botones de navegación con ícono (`<Button variant="secondary" size="icon-sm" aria-label="..."><ChevronLeftIcon /></Button>`) ya usado en `modules/events/components/HeroCarousel.tsx` — se aplica igual a la navegación "Entrada X de N".
- Patrón que se reutiliza: `data-qr-code` como selector para rasterizar el QR a PNG para el PDF, ya usado en `TicketStubCard.tsx`/`CheckoutConfirmationStep.tsx` — se replica en `TicketDetailPanel` para que `generateTicketsPdf` pueda encontrar el `<svg>` igual que hoy.
- Componentes shadcn que se reutilizan: `components/ui/tabs.tsx`, `components/ui/card.tsx`, `components/ui/button.tsx` — ninguno nuevo que instalar.
- Se elimina (queda sin uso tras esta spec): `modules/my-tickets/components/TicketOrderCard.tsx` — su interacción (expandir in place) la reemplaza el nuevo layout; nada más lo importa (verificado: solo lo importan `MyTicketsView.tsx`, que se reescribe, y `mis-entradas.md`, un doc).
- Nuevo (y por qué no sirve nada existente):
  - `modules/my-tickets/utils/get-ticket-code.ts`: no existe ninguna utilidad que derive un código de entrada legible a partir del pedido/número de entrada.
  - `modules/my-tickets/components/TicketOrderListItem.tsx`: no existe ninguna tarjeta compacta y seleccionable de pedido (la que existe, `TicketOrderCard`, es expandible y se elimina).
  - `modules/my-tickets/components/TicketDetailPanel.tsx`: no existe ningún panel de detalle de una entrada individual con navegación entre entradas del mismo pedido.
- Existente que se reescribe (mismo archivo, misma responsabilidad de "pantalla de mis entradas", nueva implementación interna): `modules/my-tickets/components/MyTicketsView.tsx`.
- Existente que se simplifica: `app/mis-entradas/page.tsx` (pierde el `<h1>`/`<p>` que se mueve a `MyTicketsView`, ver decisión de layout).
- **Recordatorios de arquitectura obligatorios para el developer:**
  - `MyTicketsView` ya es y sigue siendo Client Component (`"use client"`) — toda la selección y el `useAuthSession` viven ahí o en sus hijos, nunca se marca `app/mis-entradas/page.tsx` como cliente.
  - `TicketDetailPanel` necesita `useAuthSession` (Titular) y `onClick`/`useRef` (botones, rasterizar QR) → también Client Component.
  - `TicketOrderListItem` es presentacional (recibe `order`, `isSelected`, `onSelect`) → puede ser Client Component simple o, si no usa ningún hook de React propio, un componente sin directiva que de todos modos corre en el árbol cliente de `MyTicketsView` (no hace falta forzar `"use client"` en un componente que no usa hooks, pero tampoco pasa nada si lo tiene por consistencia con sus hermanos — decisión del developer, no bloquea ningún AC).

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con la pantalla rediseñada.
- AC-2: `npx vitest run` pasa para `get-ticket-code.test.ts` (nuevo) y para todos los tests ya existentes, sin modificarlos.
- AC-3: `modules/my-tickets/utils/get-ticket-code.ts` exporta `export function getTicketCode(orderNumber: string, ticketNumber: number): string` que devuelve `` `TK-${orderNumber sin el prefijo "TKT-"}-${ticketNumber con padStart(2, "0")}` `` — verificado en `get-ticket-code.test.ts` con al menos: `getTicketCode("TKT-8X3K2Q", 1)` → `"TK-8X3K2Q-01"`, `getTicketCode("TKT-8X3K2Q", 12)` → `"TK-8X3K2Q-12"`.
- AC-4: `TicketOrderListItem({ order, isSelected, onSelect }: { order: ConfirmedOrder; isSelected: boolean; onSelect: () => void })` en `modules/my-tickets/components/TicketOrderListItem.tsx` renderiza, por cada pedido: una miniatura de `order.eventImageUrl` (`next/image`, `fill`, `unoptimized`), `order.eventTitle`, una línea con `order.venueName`/`order.city`/fecha (reutilizando `formatFullEventDate`), y una línea de resumen con `order.totalQuantity` entradas (pluralizado, mismo criterio que `TicketOrderCard` original) y el nombre de zona (`order.lines[0].zoneName` si `order.lines.length === 1`, o un texto genérico tipo `"Varias zonas"` si hay más de una línea); al hacer click invoca `onSelect()`; cuando `isSelected === true` aplica `border-primary bg-primary/5` y en caso contrario `border-border hover:bg-muted/50` (mismo patrón que `ZoneSelectorList`).
- AC-5: `TicketDetailPanel({ order, ticketNumber, onTicketNumberChange }: { order: ConfirmedOrder; ticketNumber: number; onTicketNumberChange: (next: number) => void })` en `modules/my-tickets/components/TicketDetailPanel.tsx`:
  - calcula `stubs = buildTicketStubs(order.lines)` y `stub = stubs[ticketNumber - 1]`;
  - renderiza el banner (`order.eventImageUrl`) con el chip de fecha (`formatEventDateBadge(order.startDate)`, mismo markup que `EventCard`), `order.eventTitle`, y una línea con `formatFullEventDate(order.startDate)` + `formatEventTime(order.startDate)` (ícono `CalendarIcon`) y otra con `order.venueName`/`order.city` (ícono `MapPinIcon`);
  - renderiza el texto `` `Entrada ${ticketNumber} de ${stub.totalTickets}` `` junto a dos botones ícono (`ChevronLeftIcon`/`ChevronRightIcon`, mismo patrón que `HeroCarousel`) que llaman `onTicketNumberChange(ticketNumber - 1)` / `onTicketNumberChange(ticketNumber + 1)`; el botón izquierdo está `disabled` cuando `ticketNumber <= 1` y el derecho cuando `ticketNumber >= stub.totalTickets`;
  - renderiza un `<div data-qr-code>` con `<QRCodeSVG value={`TICKETERA-${order.orderNumber}-${stub.ticketNumber}`} />` (mismo formato de `qrValue` que `CheckoutConfirmationStep`/`TicketOrderCard` original) y, junto a él, los campos Zona (`stub.zoneName`), Asiento (texto fijo `"Sin asiento asignado"`), Titular (`useAuthSession().session?.fullName ?? session?.email ?? "Invitado"`), Código (`getTicketCode(order.orderNumber, stub.ticketNumber)`) y Estado (`"Válida"` si `getOrderStatus(order.startDate) === "upcoming"`, si no `"Usada"`);
  - renderiza los botones "Descargar PDF" (invoca `generateTicketsPdf({ order, stubs: [stub], qrElements: [el] })` leyendo el `<svg>` vía `querySelector("[data-qr-code] svg")` sobre un `ref` propio del panel, mismo patrón que `CheckoutConfirmationStep.handleDownloadPdf`, con estado `isGeneratingPdf` que deshabilita el botón mientras genera) y "Agregar al calendario" (invoca `downloadCalendarFile(order)` directamente, sin estado de carga, igual que en `CheckoutConfirmationStep`).
- AC-6: `MyTicketsView({ orders }: { orders: ConfirmedOrder[] })` en `modules/my-tickets/components/MyTicketsView.tsx` (Client Component):
  - mantiene `activeTab: "upcoming" | "past"` (inicial `"upcoming"`), `selectedOrderNumber: string | null` y `selectedTicketNumber: number` (inicial `1`);
  - renderiza, en una fila superior, el encabezado "Mis entradas" + subtítulo (mismo texto/clases que tenía `app/mis-entradas/page.tsx`) a la izquierda, y a la derecha un `Tabs value={activeTab} onValueChange={...}` con 2 `TabsTrigger` ("Próximas", "Pasadas") cuyo texto incluye el conteo entre paréntesis (ej. `` `Próximas (${upcomingCount})` ``), calculado filtrando `orders` con `getOrderStatus`;
  - calcula `filteredOrders = orders.filter((order) => getOrderStatus(order.startDate) === activeTab)`;
  - con un `useEffect` (o lógica equivalente en el render, documentada) mantiene `selectedOrderNumber` apuntando a un pedido presente en `filteredOrders`: si el valor actual no está en la lista filtrada (incluido el caso inicial o un cambio de `activeTab`), lo reinicia al primer elemento de `filteredOrders` y `selectedTicketNumber` a `1`;
  - renderiza una grilla de 2 columnas en pantallas grandes (`grid-cols-1 lg:grid-cols-[360px_1fr] gap-6`, una sola columna en mobile): a la izquierda, un `TicketOrderListItem` por cada elemento de `filteredOrders` con `isSelected={order.orderNumber === selectedOrderNumber}` y `onSelect` que actualiza `selectedOrderNumber` (reseteando `selectedTicketNumber` a `1`); a la derecha, un `TicketDetailPanel` para el pedido seleccionado (buscado en `filteredOrders` por `selectedOrderNumber`) con `ticketNumber={selectedTicketNumber}` y `onTicketNumberChange={setSelectedTicketNumber}`;
  - cuando `filteredOrders.length === 0`, no renderiza la grilla de dos columnas ni ningún `TicketDetailPanel`, solo el mensaje "No tienes entradas en esta categoría." (reutilizado de la versión anterior).
- AC-7: `app/mis-entradas/page.tsx` sigue siendo Server Component, exporta el mismo `metadata` que hoy, y su único contenido es `<MyTicketsView orders={MOCK_TICKET_ORDERS} />` (sin `<h1>`/`<p>` propios).
- AC-8: `modules/my-tickets/components/TicketOrderCard.tsx` ya no existe en el árbol de archivos y ningún archivo lo importa.
- AC-9: Verificación manual en navegador (no automatizable con `vitest`, se deja como paso de QA post-implementación): con una sesión iniciada (`localStorage` con `ticketera:auth-session`), entrar a `/mis-entradas` muestra de inmediato el layout de dos columnas con el primer pedido "Próximas" seleccionado y su primera entrada en el panel; hacer click en otro pedido de la lista cambia el panel derecho sin recargar la página; los botones de navegación "Entrada X de N" cambian el QR/campos mostrados dentro del mismo pedido; "Descargar PDF" dispara la descarga de un PDF de una sola página (la entrada seleccionada); "Agregar al calendario" dispara la descarga del `.ics` del evento; cambiar a la pestaña "Pasadas" actualiza la lista y selecciona el primer pedido pasado.

## Tareas

### T1 — Utilidad de código de entrada
- Archivos:
  - `modules/my-tickets/utils/get-ticket-code.ts` (crear)
  - `modules/my-tickets/utils/get-ticket-code.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3
- Tests: ver AC-3.

### T2 — Tarjeta seleccionable de pedido (lista izquierda)
- Archivos:
  - `modules/my-tickets/components/TicketOrderListItem.tsx` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-4
- Tests: no aplica (componente presentacional — SETUP.md 3.2).

### T3 — Panel de detalle de entrada (columna derecha)
- Archivos:
  - `modules/my-tickets/components/TicketDetailPanel.tsx` (crear)
- Depende de: T1 (usa `getTicketCode`)
- Grupo paralelo: G2
- Cubre: AC-5
- Tests: no aplica (componente de UI que compone utilidades ya testeadas — SETUP.md 3.2).

### T4 — Layout maestro-detalle, encabezado con contadores, y limpieza
- Archivos:
  - `modules/my-tickets/components/MyTicketsView.tsx` (reescribir)
  - `app/mis-entradas/page.tsx` (modificar)
  - `modules/my-tickets/components/TicketOrderCard.tsx` (eliminar)
- Depende de: T2, T3
- Grupo paralelo: G3
- Cubre: AC-1, AC-2, AC-6, AC-7, AC-8, AC-9
- Tests: no aplica (composición/estado de selección sobre piezas ya testeadas o presentacionales — SETUP.md 3.2); AC-9 es verificación manual en navegador post-integración, igual que en fases anteriores.

## Fases siguientes
- Ninguna identificada; sigue siendo demo UI/UX sobre mock data.
