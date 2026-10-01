# Mis entradas

Estado: draft

## Objetivo
Dar a "Ticketera" una pantalla `/mis-entradas` (Fase 7) donde el usuario ve un historial de compras ya realizadas (evento, fecha, venue, estado Próximo/Pasado, cantidad de entradas) y puede expandir cada pedido para ver sus "ticket stubs" con QR — reutilizando `TicketStubCard`/`buildTicketStubs` de la Fase 5 —, y conectar el botón "Ver mis entradas" del paso de confirmación del checkout (hoy un placeholder sin `onClick`/`href`, documentado así en `checkout-confirmation.md`) a esa ruta. Es, otra vez, **solo UI/UX**: sin backend, sin base de datos, sin sesión real.

**Decisión central (de dónde salen los datos): historial mock independiente, no la compra real del checkout.** No existe ningún lugar accesible entre rutas donde viva el `ConfirmedOrder` que `CheckoutFlow.tsx` arma en memoria durante una compra real de esta sesión (es `useState` local de ese componente, se pierde al desmontarlo o al navegar). Conectarlo a `/mis-entradas` requeriría crear un store global (`zustand`, ya instalado pero no wireado) que persista `ConfirmedOrder[]` entre navegaciones, que `CheckoutFlow` escriba en él al confirmar, y que `/mis-entradas` lo lea — una abstracción nueva y un acoplamiento nuevo entre `modules/checkout` y una ruta de otro dominio, solo para que *una* compra hecha en la sesión de demo aparezca junto a un historial que de todos modos hay que inventar (el usuario nunca tuvo compras previas reales). Es la misma situación que `auth-ui.md` ya resolvió para el login ("wirear un store global... agrega una abstracción sin un uso real hoy") y se decide igual: **YAGNI**. En vez de eso, `/mis-entradas` muestra siempre su propio set de datos mock (historial ficticio de compras previas, como si el usuario ya tuviera entradas de antes), con el mismo patrón ya usado en `modules/events/data/events.mock.ts` (array `const` tipado, importado donde se necesita). El botón "Ver mis entradas" de `CheckoutConfirmationStep` pasa a navegar a `/mis-entradas` con un simple `Link` (sin pasarle el `order` de la compra recién hecha); esa compra recién hecha simplemente no aparece en la lista — se documenta como limitación aceptada, no como bug.

**Decisión de tipo de dato: se reutiliza `ConfirmedOrder` (de `modules/checkout/types/checkout.types.ts`), no se crea un tipo nuevo.** `ConfirmedOrder` ya tiene exactamente la forma que necesita un pedido en esta pantalla (`orderNumber`, datos de evento/venue, `lines: TicketSelectionLine[]`, `totalQuantity`, `totalAmount`) y ya es consumido por `buildTicketStubs`/`TicketStubCard` para generar los QR — es el mismo concepto de "pedido confirmado", solo que en checkout nace de una compra en memoria y aquí nace de un array mock. Definir un tipo paralelo (`MockTicketOrder` con los mismos campos) violaría DRY sin ninguna necesidad real. El cruce `modules/my-tickets → modules/checkout` para importar un tipo ya tiene precedente análogo en el propio `checkout.types.ts`, que importa `TicketSelectionLine` desde `modules/events`.

**Decisión de interacción (ver el/los QR): expandir la tarjeta del pedido, reutilizando `TicketStubCard` tal cual.** Cada pedido se muestra primero como una tarjeta-resumen (imagen, evento, fecha, venue, badge de estado, cantidad, monto); un botón "Ver entradas" la expande para mostrar el grid de `TicketStubCard` (uno por cada elemento de `buildTicketStubs(order.lines)`, mismo `qrValue` `` `TICKETERA-${order.orderNumber}-${stub.ticketNumber}` `` que en `CheckoutConfirmationStep`). No se construye una vista de detalle en otra ruta (`/mis-entradas/[orderNumber]`) ni un modal: ambos son más complejos que un expand/collapse en la misma tarjeta para el mismo resultado (KISS).

**Decisión de filtro: sí, tabs "Todas"/"Próximas"/"Pasadas".** El historial mock mezcla a propósito pedidos con `startDate` futura y pasada (para que ambos estados se vean sin depender de cuándo se revise esta demo), así que separar por tabs es un filtro simple y real sobre datos que de por sí ya se dividen en dos grupos — no es una necesidad hipotética. Se implementa como control segmentado reutilizando `components/ui/tabs.tsx` (ya existe, mismo patrón `value`/`onValueChange` ya usado en `AuthScreen.tsx`), sin `TabsContent` triplicado (ver T3).

**Decisión de estado vacío: no aplica a nivel de página (siempre hay mock data), sí a nivel de filtro.** La pantalla nunca muestra "aún no tienes entradas" porque el array mock siempre tiene elementos. Pero filtrar por "Próximas" o "Pasadas" sí puede dejar la lista filtrada en 0 resultados (según cuándo se visite la demo); ese caso muestra un mensaje de texto simple inline, sin crear un componente `EmptyState` nuevo en `components/shared/` para un único uso (YAGNI — `docs/SETUP.md` lo menciona como ejemplo hipotético, no como algo que deba existir ya).

**Decisión de ruta y layout:** Server Component `app/mis-entradas/page.tsx` que solo compone `MyTicketsView` (Client Component, por los tabs + expand), dentro del `RootLayout` existente (navbar/footer visibles, igual que `/ingresar` y el resto de rutas). No hay ninguna noción de ruta protegida: no hay sesión real que proteger (ver `auth-ui.md`).

## Fuera de alcance
- Conectar la compra real de `CheckoutFlow` (la del `ConfirmedOrder` en memoria de esta sesión) con `/mis-entradas`: no se crea ningún store global (`zustand` u otro) para esto (ver decisión central arriba). La compra que el usuario acaba de simular en el checkout de esta sesión **no** aparece en la lista de `/mis-entradas`.
- Cualquier cambio a `modules/checkout/utils/build-ticket-stubs.ts`, `modules/checkout/components/TicketStubCard.tsx`, `modules/checkout/types/checkout.types.ts` o `modules/checkout/components/CheckoutFlow.tsx`: se reutilizan tal cual, sin modificarlos (solo se modifica `CheckoutConfirmationStep.tsx`, ver T5).
- Vista de detalle de un pedido en otra ruta o modal (ver decisión de interacción arriba): es expand/collapse en la misma tarjeta.
- Descargar PDF, agregar al calendario, compartir o anular una entrada: ningún botón de acción nuevo más allá del toggle "Ver entradas"/"Ocultar entradas".
- Paginación, búsqueda o ordenar el historial: con 4 pedidos mock no hace falta (YAGNI); si creciera el catálogo mock en una fase futura, se evalúa entonces.
- Autenticación o cualquier gate de "debes iniciar sesión para ver tus entradas": no hay sesión real que gatear (ver Fase 6).
- Recalcular o re-seedear las fechas mock dinámicamente (ej. "siempre 2 próximas y 2 pasadas relativas a hoy"): las fechas del historial mock son fijas (como las de `events.mock.ts`); el estado Próximo/Pasado se calcula con `new Date()` real del dispositivo en el momento de renderizar, así que si esta demo se visita mucho tiempo después de escrita esta spec, es posible que más (o todos) los pedidos mock aparezcan como "Pasado" de lo previsto al redactarla. No se resuelve con fechas relativas a `Date.now()` calculadas en el array (ej. "dentro de 30 días") porque complicaría la legibilidad del mock sin beneficio real para una demo (YAGNI) — es la misma limitación, ya aceptada, de las fechas fijas en `events.mock.ts`.
- Mostrar un ícono de "sesión iniciada" o cualquier cambio a qué se considera "el usuario actual": sigue sin existir ese concepto (ver `auth-ui.md`).

## Reutilización
- Existente que se reutiliza: `modules/checkout/types/checkout.types.ts` (`ConfirmedOrder`, sin modificarlo) — es el tipo de "pedido" de esta pantalla (ver decisión de tipo arriba).
- Existente que se reutiliza: `modules/checkout/utils/build-ticket-stubs.ts` (`buildTicketStubs`, `TicketStub`) y `modules/checkout/components/TicketStubCard.tsx` — el grid de entradas con QR al expandir un pedido es exactamente el mismo que arma `CheckoutConfirmationStep.tsx`, con el mismo `qrValue`.
- Existente que se reutiliza: `components/ui/tabs.tsx` (`Tabs`/`TabsList`/`TabsTrigger`, prop `value`/`onValueChange`, mismo patrón ya validado en `modules/auth/components/AuthScreen.tsx`), `components/ui/badge.tsx`, `components/ui/card.tsx`, `components/ui/button.tsx` — no se necesita ningún componente shadcn nuevo.
- Existente que se reutiliza: `modules/events/utils/format-event-date.ts` (`formatFullEventDate`) y `lib/format-currency.ts` (`formatPrice`) — igual que en `TicketStubCard`/`EventCard`.
- Existente que se reutiliza: `lib/utils.ts` (`cn`) para clases condicionales del badge de estado.
- Patrón que se reutiliza (sin tocar el archivo que lo originó): `Button nativeButton={false} render={<Link href="..." />}` ya usado en `EventCard.tsx`, `SiteNavbar.tsx` y `AuthScreen`'s `onSwitchTo*` — se aplica igual al botón "Ver mis entradas" de `CheckoutConfirmationStep.tsx` (T5) y a la nueva entrada de `SiteNavbar` (T6, que ya es un `Link` plano dentro de `NAV_LINKS`, no un `Button`).
- Existente que se extiende:
  - `modules/checkout/components/CheckoutConfirmationStep.tsx` (T5) — el botón "Ver mis entradas" gana `nativeButton={false}` + `render={<Link href="/mis-entradas" />}`; "Agregar al calendario" y "Descargar PDF" siguen siendo placeholders sin `onClick`/`href` (fuera de alcance de esta spec, ya documentado en `checkout-confirmation.md`).
  - `components/shared/SiteNavbar.tsx` (T6) — el array `NAV_LINKS` gana `{ label: "Mis entradas", href: "/mis-entradas" }`; como tanto el `<nav>` desktop como el `<nav>` del `SheetContent` mobile ya mapean ese mismo array, el link queda visible en ambos sin tocar ningún otro bloque del archivo. Se agrega siempre visible (no condicionado a ninguna sesión, porque no existe ese concepto — ver Reutilización de `auth-ui.md`).
- Nuevo (y por qué no sirve nada existente): se crea el dominio `modules/my-tickets/` (no existía) porque "historial de pedidos del usuario" es un dominio de negocio distinto de `events`/`checkout`/`auth` (SETUP.md 1.1).
  - `modules/my-tickets/utils/get-order-status.ts`: no existe ninguna utilidad que derive "Próximo"/"Pasado" a partir de una fecha.
  - `modules/my-tickets/data/my-tickets.mock.ts`: no existe ningún historial de pedidos mock; sigue el patrón de array `const` tipado de `modules/events/data/events.mock.ts`.
  - `modules/my-tickets/components/TicketOrderCard.tsx`, `MyTicketsView.tsx`: no existe ningún componente de tarjeta de pedido expandible ni de lista/filtro de pedidos.
  - `app/mis-entradas/page.tsx`: no existe la ruta.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.
- **Recordatorios de arquitectura obligatorios para el developer (de `docs/SETUP.md` y de las notas de esta tarea):**
  - Nunca pasar a un Client Component un objeto con campos no serializables (ej. un ícono de `lucide-react` como componente, como `EventCategory.icon` en `MOCK_CATEGORIES`). `ConfirmedOrder` no tiene ningún campo así (todos sus campos y los de `TicketSelectionLine` son `string`/`number`/arrays de esos), así que `MOCK_TICKET_ORDERS` puede pasarse completo de `page.tsx` a `MyTicketsView` sin mapear nada — pero si en el futuro se le agregara un campo con un ícono o componente, habría que aplicar el mismo patrón que `app/eventos/page.tsx` ya usa con `MOCK_CATEGORIES.map(({ id, name }) => ({ id, name }))` (`Pick` + mapeo en el server), nunca marcar `page.tsx` como `"use client"`.
  - Si hiciera falta un componente shadcn nuevo que no exista en `components/ui/` y `ui.shadcn.com` estuviera bloqueado, se construye a mano siguiendo el patrón exacto de un componente existente (`button.tsx`/`tabs.tsx`), verificando props reales contra `node_modules/@base-ui/react/<component>/**/*.d.ts` — no debería hacer falta en esta spec (ver arriba, ningún componente nuevo de shadcn).

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con `/mis-entradas` integrada.
- AC-2: `npx vitest run` pasa para `get-order-status.test.ts` (nuevo) y para todos los archivos de test ya existentes, sin modificarlos.
- AC-3: `modules/my-tickets/utils/get-order-status.ts` exporta `export type OrderStatus = "upcoming" | "past"` y `export function getOrderStatus(startDate: string, referenceDate: Date = new Date()): OrderStatus` que devuelve `"past"` cuando `new Date(startDate).getTime() < referenceDate.getTime()` y `"upcoming"` en cualquier otro caso (incluido el empate exacto) — verificado en `get-order-status.test.ts` con: `startDate` anterior a un `referenceDate` fijo (`"past"`), `startDate` posterior (`"upcoming"`), `startDate` igual a `referenceDate` (`"upcoming"`, caso límite). Los tests pasan siempre un `referenceDate` explícito (no dependen de la fecha real del sistema).
- AC-4: `modules/my-tickets/data/my-tickets.mock.ts` exporta `MOCK_TICKET_ORDERS: ConfirmedOrder[]` (tipo importado con `import type` desde `@/modules/checkout/types/checkout.types`, sin redefinirlo) con al menos 4 elementos; cada elemento tiene `orderNumber` único que matchea `/^TKT-[A-Z0-9]{6}$/`, `lines` no vacío, `totalQuantity` igual a la suma de `quantity` de sus `lines`, y `totalAmount` igual a la suma de `subtotal` de sus `lines`; al menos 2 elementos tienen `startDate` anterior a `2026-10-01` y al menos 2 tienen `startDate` igual o posterior a `2026-10-01` (para que ambos estados "Próximo"/"Pasado" se vean por defecto al redactar esta spec — ver limitación aceptada en "Fuera de alcance" sobre revisarla en otra fecha).
- AC-5: `TicketOrderCard({ order }: { order: ConfirmedOrder })` en `modules/my-tickets/components/TicketOrderCard.tsx` es un Client Component (`"use client"`, por su `useState` propio) que mantiene `expanded: boolean` (inicial `false`) y renderiza, siempre visible: imagen de `order.eventImageUrl` vía `next/image` (`fill`, `unoptimized`), `order.eventTitle`, `order.venueName` + `order.city` (con `MapPinIcon`), `formatFullEventDate(order.startDate)` (con `CalendarIcon`), un `Badge` con texto `"Próximo"` cuando `getOrderStatus(order.startDate) === "upcoming"` o `"Pasado"` en caso contrario (con `variant` distinto entre ambos casos, ej. `default` vs `secondary`), el texto `` `${order.totalQuantity} entrada` `` pluralizado a `"entradas"` cuando `order.totalQuantity !== 1`, `formatPrice(order.totalAmount)`, y un botón cuyo texto es `"Ver entradas"` cuando `expanded === false` o `"Ocultar entradas"` cuando `expanded === true`, que al hacer click invierte `expanded`. Cuando `expanded === true`, renderiza además un grid con un `TicketStubCard` por cada elemento de `buildTicketStubs(order.lines)`, pasándole los campos de `order` (`eventTitle`, `eventImageUrl`, `venueName`, `city`, `startDate`) y `qrValue={`TICKETERA-${order.orderNumber}-${stub.ticketNumber}`}` (mismo formato que `CheckoutConfirmationStep.tsx`). Cuando `expanded === false`, no se renderiza ningún `TicketStubCard` (verificable: no hay ningún `<QRCodeSVG>` en el DOM hasta hacer click).
- AC-6: `MyTicketsView({ orders }: { orders: ConfirmedOrder[] })` en `modules/my-tickets/components/MyTicketsView.tsx` es un Client Component (`"use client"`) que mantiene `activeTab: "all" | "upcoming" | "past"` (inicial `"all"`), renderiza un `Tabs value={activeTab} onValueChange={...}` con `TabsList` de 3 `TabsTrigger` (valores `"all"`/`"upcoming"`/`"past"`, etiquetas "Todas"/"Próximas"/"Pasadas") **sin ningún `TabsContent`** (el `Tabs`/`TabsList`/`TabsTrigger` se usa solo como control segmentado; no se triplica el markup de la lista en 3 `TabsContent` idénticos salvo por el filtro — verificable: no hay ningún `TabsContent` importado ni usado en el archivo), y debajo del `Tabs` calcula `filteredOrders = orders.filter((order) => activeTab === "all" || getOrderStatus(order.startDate) === activeTab)` y renderiza un `TicketOrderCard` por cada elemento cuando `filteredOrders.length > 0`, o un mensaje de texto simple (ej. "No tienes entradas en esta categoría.") cuando `filteredOrders.length === 0`.
- AC-7: `app/mis-entradas/page.tsx` es un Server Component que exporta `export const metadata: Metadata = { title: "Mis entradas | Ticketera" }` (o equivalente) y renderiza un encabezado ("Mis entradas" + subtítulo, mismo patrón de `<h1 className="font-heading text-3xl font-bold text-foreground">` + `<p className="text-muted-foreground">` que `app/eventos/page.tsx`) seguido de `<MyTicketsView orders={MOCK_TICKET_ORDERS} />`, pasando el array completo sin mapearlo (ver nota de serialización en Reutilización); no contiene fetching ni lógica propia más allá de componer.
- AC-8: En `modules/checkout/components/CheckoutConfirmationStep.tsx`, el botón "Ver mis entradas" pasa a tener `nativeButton={false}` y `render={<Link href="/mis-entradas" />}` (requiere `import Link from "next/link"`), de modo que al hacer click navegue a `/mis-entradas`; los botones "Agregar al calendario" y "Descargar PDF" no cambian (siguen sin `onClick`/`href`); ningún otro elemento del archivo cambia.
- AC-9: En `components/shared/SiteNavbar.tsx`, el array `NAV_LINKS` gana un elemento `{ label: "Mis entradas", href: "/mis-entradas" }` (en cualquier posición); como el `<nav>` desktop (línea ~32) y el `<nav>` del `SheetContent` mobile (línea ~66) ya mapean `NAV_LINKS`, el nuevo link aparece en ambos sin tocar esos bloques de JSX; ningún otro botón, link o comportamiento del archivo cambia.

## Tareas

### T1 — Historial mock + utilidad de estado Próximo/Pasado
Datos mock del historial de pedidos (reutilizando `ConfirmedOrder`) y la función pura que deriva si un pedido está "upcoming" o "past", consumida por T2 y T3.
- Archivos:
  - `modules/my-tickets/utils/get-order-status.ts` (crear)
  - `modules/my-tickets/utils/get-order-status.test.ts` (crear)
  - `modules/my-tickets/data/my-tickets.mock.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4
- Tests: `get-order-status.test.ts` — `startDate` anterior a un `referenceDate` fijo (`"past"`), posterior (`"upcoming"`), igual (`"upcoming"`, límite).
- [ ] Completada

### T5 — Conectar "Ver mis entradas" en la confirmación del checkout
Único cambio sobre el flujo de checkout ya existente: el botón pasa de placeholder a navegar a `/mis-entradas`. No depende del resto de esta spec (la ruta puede no existir aún al momento de implementar esta tarea en paralelo; `Link` a una ruta que se crea en T4 de la misma spec es seguro porque todas las tareas se integran antes de dar la spec por terminada).
- Archivos:
  - `modules/checkout/components/CheckoutConfirmationStep.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-8
- Tests: no aplica (cambio de 2 props sobre un botón ya presentacional — SETUP.md 3.2)
- [ ] Completada

### T6 — Agregar "Mis entradas" a la navegación
- Archivos:
  - `components/shared/SiteNavbar.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-9
- Tests: no aplica (componente presentacional, SETUP.md 3.2)
- [ ] Completada

### T2 — Tarjeta de pedido expandible
Compone el estado "Próximo"/"Pasado" (T1) con los componentes de ticket stub ya existentes de la Fase 5 en una sola tarjeta con expand/collapse.
- Archivos:
  - `modules/my-tickets/components/TicketOrderCard.tsx` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5
- Tests: no aplica (componente de UI con estado trivial de expand/collapse, sin lógica de negocio propia — SETUP.md 3.2; el estado Próximo/Pasado que consume ya está testeado en T1)
- [ ] Completada

### T3 — Lista filtrable de pedidos
Orquesta T1 (datos + estado) y T2 (tarjeta) en la vista completa con tabs de filtro.
- Archivos:
  - `modules/my-tickets/components/MyTicketsView.tsx` (crear)
- Depende de: T1, T2
- Grupo paralelo: G3
- Cubre: AC-6
- Tests: no aplica (componente de composición/filtro sobre datos ya testeados en T1 — SETUP.md 3.2)
- [ ] Completada

### T4 — Ruta `/mis-entradas`
- Archivos:
  - `app/mis-entradas/page.tsx` (crear)
- Depende de: T3
- Grupo paralelo: G4
- Cubre: AC-1, AC-2, AC-7
- Tests: no aplica (página de composición — SETUP.md 3.2)
- [ ] Completada

## Fases siguientes
- Fase 8: dashboard de organizador (baja prioridad).
