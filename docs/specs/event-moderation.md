# Moderación de eventos para admin/super_admin

Estado: aprobada

## Objetivo

Dar a los administradores una vista global de eventos desde el panel de administración, con filtros por organizador, estado y fecha, y los botones para **suspender**, **reactivar** y **cancelar** eventos ajenos. Además, cerrar el hueco por el que un evento suspendido (o cancelado/borrador) todavía podría recibir compras nuevas si alguien conoce los ids de zona.

Fuente: tarea 11 del tablero. El diseño dice que admin puede "ver/moderar todos los eventos, suspender organizadores o eventos".

Hallazgos de código (verificados):

1. **Ya existe casi todo el backend.** `nextStatuses` (`event-permissions.ts`) deja a un admin: `draft -> cancelled | suspended`, `published -> cancelled | suspended`, `suspended -> published | cancelled`. `setEventStatus` lo aplica y `setEventStatusAction` ya acepta `published | cancelled | suspended`. Al salir de `published` se quita `featured`. Reactivar (`suspended -> published`) pasa por la regla de Stripe y de función futura, y valida al **dueño** del evento (decisión 1 de `publish-requires-stripe.md`). No hay cambios de servicio ni de permisos.
2. **La nota D3 de `organizer-events-crud.md` quedó desactualizada.** Hoy `resolveEventScope` da scope `all` a admin/super_admin, así que `/organizador` ("Mis eventos") ya lista todos los eventos con columna Organizador, destacado y filtros de nombre/estado/fecha (client-side, `OrganizerEventsFilters`). Lo que falta: filtro por organizador, un botón **Suspender** (la tabla solo muestra Editar/Publicar/Cancelar/Eliminar; la acción de suspender existe pero no tiene UI) y un lugar propio en el panel admin.
3. **Catálogo público: ya oculta lo suspendido.** `listPublicEvents` y `getCheckoutEventBySlug` filtran `status = 'published'`.
4. **Compra: hay un hueco.** `POST /api/checkout` llama `resolveCheckoutDestination` y luego `createPendingOrder`; ninguno revisa `events.status`. Con un `functionZoneId` válido se puede crear la orden y la sesión de Stripe de un evento suspendido, cancelado o borrador.
5. **Suspender al organizador** (Usuarios) pone `users.is_suspended`; no toca sus eventos ni el checkout.

## Decisiones de diseño

1. **Sin servicio de lectura nuevo.** La vista global usa `getOrganizerSummary(db, user)` (scope `all` para admins) y los componentes `OrganizerEventsFilters` / `OrganizerEventsTable` / `EventRowActions`. Los filtros siguen siendo client-side (límite de 100 eventos de `listEventsForViewer`). Los parámetros de URL de usuarios/organizadores (`q`, `page`, `porPagina`) no se replican: allí la lista se pagina en SQL, aquí no hay paginación que justifique un nuevo schema ni servicio. Ponytail: si el catálogo supera 100 eventos, mover filtros y paginación a SQL.
2. **Bloqueo de compra en `resolveCheckoutDestination`** (el único punto previo a `createPendingOrder`): si algún evento de las zonas no está `published`, devuelve `zone_not_found`, que la ruta ya traduce a 400 `invalid_payload` y la UI trata como error genérico. Sin códigos nuevos ni cambios en `route.ts` ni en `request-checkout-url.service.ts`. Se evita un 409 porque el cliente lo leería como "sin cupo". La carrera (suspensión justo entre la verificación y la orden) queda abierta: la ventana es de milisegundos y la orden pendiente expira a los 15 minutos. Ponytail: si importa, validar `status` dentro de la transacción de `createPendingOrder`.
3. **Órdenes ya pagadas de un evento suspendido/cancelado no se tocan**: sin reembolsos ni invalidar entradas (coherente con el texto actual del diálogo de cancelar). El check-in no cambia.
4. **Suspender un organizador no oculta sus eventos publicados.** Solo se documenta. Para detener las ventas de un organizador suspendido, el admin suspende sus eventos uno a uno desde la nueva vista.
5. **Acceso**: la página nueva vive en `/super-admin/eventos` con `requireRole(["super_admin"])`, como las demás páginas de Administración, y el ítem solo lo ve `super_admin` (`PanelShell.showAdmin`). El rol `admin` modera desde `/organizador`, que ya le lista todo y recibirá el botón Suspender por ser el mismo componente.
6. **Etiqueta**: sobre un evento `suspended`, el botón de `canPublish` se muestra como "Reactivar" (misma acción, mismo motivo de bloqueo por Stripe). Suspender usa `ConfirmEventActionDialog`; reactivar no pide confirmación.

## Alcance

- Incluye:
  - Página `/super-admin/eventos` + ítem "Eventos" en `ADMIN_NAV_ITEMS`.
  - Filtro por organizador (solo visible para admins) además de los filtros existentes de nombre, estado y fecha.
  - Botón "Suspender" y etiqueta "Reactivar" en las acciones por fila.
  - Bloqueo de compra nueva para eventos que no estén `published`.
- No incluye:
  - Filtros/paginación por URL o SQL (ver decisión 1).
  - Ocultar o despublicar los eventos de un organizador suspendido (decisión 4).
  - Reembolsos o invalidación de entradas ya vendidas (decisión 3).
  - Cambios en `event-write.service.ts`, `event.actions.ts` ni `event-permissions.ts`.
  - Páginas nuevas para el rol `admin` ni cambios en `PanelShell`.
  - Actualizar `organizer-events-crud.md` (la nota D3 queda como histórico).

## Reutilizar

- `modules/organizer/actions/event.actions.ts` (`setEventStatusAction`) y `setEventStatus` de `event-write.service.ts`: sin cambios.
- `modules/organizer/utils/event-permissions.ts` (`nextStatuses`): ya decide qué botones ve cada actor.
- `getOrganizerSummary` + `listEventsForViewer` (scope `all`).
- `OrganizerEventsFilters`, `OrganizerEventsTable`, `EventRowActions`, `ConfirmEventActionDialog`, `FeaturedToggle`.
- Componentes `Select` y `DatePicker` ya usados en los filtros.
- Cabecera de página y contenedor de `app/(panel)/super-admin/organizadores/page.tsx`.

## Archivos

Nuevos:
- `app/(panel)/super-admin/eventos/page.tsx`

Modificados:
- `modules/checkout/services/resolve-checkout-destination.service.ts`
- `modules/checkout/services/resolve-checkout-destination.service.test.ts`
- `modules/organizer/components/EventRowActions.tsx`
- `modules/organizer/components/OrganizerEventsTable.tsx`
- `modules/organizer/services/get-organizer-summary.service.ts`
- `modules/organizer/services/get-organizer-summary.service.test.ts`
- `modules/organizer/components/OrganizerEventsFilters.tsx`
- `modules/panel/nav-config.ts`

## Criterios de aceptación

- AC1: `resolveCheckoutDestination` devuelve `{ ok: false, error: "zone_not_found" }` cuando el evento de las zonas está en `suspended`, `cancelled` o `draft`, y sigue devolviendo `ok: true` para `published` con organizador listo.
- AC2: `POST /api/checkout` con una zona de un evento suspendido responde 400 `invalid_payload` y no crea ninguna orden.
- AC3: `OrganizerEventSummary` incluye `organizerId` por evento.
- AC4: `/super-admin/eventos` lista eventos de todos los organizadores en cualquier estado, con columnas Organizador y Estado; un usuario que no es `super_admin` es redirigido por `requireRole`.
- AC5: el ítem "Eventos" aparece en la sección Administración del panel para `super_admin`, y queda activo en `/super-admin/eventos`.
- AC6: cuando el actor es admin, los filtros incluyen "Todos los organizadores" + un select con los organizadores presentes en la lista; combinado con estado y fechas filtra correctamente. Un organizador no ve ese select.
- AC7: sobre un evento `published` o `draft`, un admin ve "Suspender" (con diálogo de confirmación); al confirmar el estado pasa a `suspended` y desaparece de `/eventos` y del home. Un organizador no ve "Suspender".
- AC8: sobre un evento `suspended`, un admin ve "Reactivar" (y "Cancelar"). Reactivar vuelve a `published`; si el organizador no tiene Stripe o no hay función futura, se muestra el error del servicio y el estado no cambia.
- AC9: suspender un organizador desde Usuarios no cambia el estado de sus eventos (comportamiento documentado, sin código nuevo).

## Tests requeridos

(Vitest, junto al archivo)
- `resolve-checkout-destination.service.test.ts`: casos `suspended`, `cancelled`, `draft` -> `zone_not_found`; `published` sigue `ok` (AC1). Si `route.test.ts` ya mockea el servicio, añadir allí un caso de 400 sin llamar a `createPendingOrder` (AC2); fuera de la lista de tareas solo si hace falta, ver Preguntas abiertas.
- `get-organizer-summary.service.test.ts`: `organizerId` presente y correcto por evento (AC3).
- Componentes y página: sin tests (presentacionales / composición), se cubren con la prueba manual.

## Tareas

### T1 — Bloquear compra de eventos no publicados
- Archivos: `modules/checkout/services/resolve-checkout-destination.service.ts`, `modules/checkout/services/resolve-checkout-destination.service.test.ts`
- Depende de: —
- Paralelizable: sí
- Cubre: AC1, AC2

### T2 — Botones Suspender / Reactivar por fila
- Archivos: `modules/organizer/components/EventRowActions.tsx`, `modules/organizer/components/OrganizerEventsTable.tsx`
- Depende de: —
- Paralelizable: sí
- Cubre: AC7, AC8

### T3 — Filtro por organizador
- Archivos: `modules/organizer/services/get-organizer-summary.service.ts`, `modules/organizer/services/get-organizer-summary.service.test.ts`, `modules/organizer/components/OrganizerEventsFilters.tsx`
- Depende de: —
- Paralelizable: sí
- Cubre: AC3, AC6

### T4 — Página admin de eventos y navegación
- Archivos: `app/(panel)/super-admin/eventos/page.tsx`, `modules/panel/nav-config.ts`
- Depende de: T2, T3
- Paralelizable: no
- Cubre: AC4, AC5, AC9

## Pendientes humanos

- Probar en el navegador como `super_admin` y como `admin`: suspender un evento publicado, comprobar que desaparece de `/eventos` y del home y que su URL de compra deja de funcionar; reactivarlo; cancelar uno suspendido; probar el filtro por organizador junto con estado y fechas.
- Probar la reactivación con un organizador sin Stripe conectado (debe mostrar el error y no cambiar el estado).
- Probar con un organizador suspendido desde Usuarios: confirmar que sus eventos siguen publicados (decisión 4).
- Con un `functionZoneId` de un evento suspendido, hacer `POST /api/checkout` y confirmar 400 (AC2).

## Preguntas abiertas

1. ¿El rol `admin` (no super_admin) necesita el ítem en el menú? Default: no; usa `/organizador`, que ya le lista todo con las mismas acciones.
2. ¿Suspender un organizador debe ocultar o bloquear la venta de sus eventos publicados? Default: no, solo documentado (decisión 4).
3. ¿Se acepta que los filtros sean client-side con tope de 100 eventos? Default: sí, por ser demo.

## Próximas fases

- Filtros y paginación por URL/SQL si el catálogo crece.
- Cascada opcional organizador suspendido -> eventos suspendidos.
- Reembolsos al cancelar o suspender eventos con ventas.
- Validar `status` dentro de la transacción de `createPendingOrder` para cerrar la carrera.
