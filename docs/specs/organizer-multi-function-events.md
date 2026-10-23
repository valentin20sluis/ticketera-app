# Eventos con varias funciones en el asistente de organizador

Estado: aprobada

## Objetivo

El modelo de datos ya soporta varias `event_functions` por evento (cada una con sus `function_zones`), pero el asistente solo crea y edita
**una**. Eventos con más de una función (p. ej. los del seed) quedan con la estructura bloqueada y solo se editan sus datos de detalle. Esta
spec permite agregar y quitar funciones en el asistente (cada una con fecha/hora y sus zonas con precio y aforo) y hace que el cliente pueda
elegir **qué función** compra, porque hoy la selección de entradas siempre sirve la más próxima.

**Esta spec reemplaza la decisión D6** de `docs/specs/organizer-events-crud.md` ("una sola función por evento en el asistente") y la
entrada "eventos con varias funciones en el asistente" de su sección "Fuera de alcance". El resto de esa spec sigue vigente, en especial
**D5** (estructura bloqueada si hay `order_items`), D7 (hora de Lima) y la matriz de permisos. La spec existente no se modifica; esta es
la que prevalece sobre D6.

## Hallazgos de la revisión de selección y checkout

Verificado en el código (no es una suposición):

- `modules/ticketing/services/get-event-checkout.service.ts` hace `.orderBy(startsAt).limit(1)`: **siempre** sirve la función futura más
  próxima y no existe forma de elegir otra. Con varias funciones el cliente nunca podría comprar las posteriores. **Requiere cambio (T4).**
- `app/api/checkout/route.ts` y `modules/ticketing/services/order.service.ts` trabajan por `functionZoneId`, que ya es único por función
  (stock, precio y `order_items` salen de ese id). **No requieren cambio**: una vez que la UI envía las zonas de la función elegida, el pedido
  queda en la función correcta. Se cubre con un test, no con tarea.
- `list-public-events.service.ts` ya agrega por la función más próxima (`startDate` = mínimo). Sin cambios.

## Alcance

- Incluye:
  - Paso "Funciones y zonas" del asistente con lista de funciones: agregar, quitar (mínimo 1), fecha/hora y zonas (nombre, aforo, precio)
    por función. Crear y editar.
  - Servicios de lectura y escritura que crean, cargan y reemplazan **todas** las funciones del evento en una transacción.
  - Reglas de edición con pedidos (D5): se mantiene el bloqueo total de estructura cuando existe algún `order_items`.
  - Selector de función en `/eventos/[slug]/entradas` (parámetro `?funcion=<id>`), visible solo si hay más de una función futura.
- No incluye:
  - Editar la estructura de un evento con pedidos (agregar una función nueva sin tocar las vendidas): queda bloqueado (pregunta 1).
  - Cambiar la sede por función (el evento tiene una sola sede, `events.venue_id`).
  - Mezclar funciones distintas en un mismo pedido o carrito.
  - Mostrar la fecha de la función en el nombre del ítem de Stripe (pregunta 3).
  - Migraciones de schema, plantillas/duplicar funciones, funciones recurrentes, y cualquier cambio en `/organizador` (tabla) o en el listado público.

## Decisiones

1. **F1 — Forma del formulario**: `CreateEventFormValues.functionZones` (objeto) pasa a `functions: { startsAt, zones[] }[]`, con
   `.min(1)` y `.max(10)` (límite de entrada para el servidor). Dos funciones del mismo evento no pueden tener el mismo `startsAt`.
2. **F2 — Zonas por función**: cada función crea sus propias `venue_zones` en la sede del evento (como hoy, una por zona del formulario). No se
   comparten entre funciones. `deleteStructure` ya limpia las `venue_zones` huérfanas.
3. **F3 — Bloqueo**: `getStructureLock.locked` pasa a ser `hasOrders` (se elimina el `|| functionCount > 1`, que era el efecto de D6).
   `functionCount` se conserva en el tipo por si alguien lo usa; si el grep no encuentra usos, se elimina.
4. **F4 — Publicar**: sin cambios en la regla (al menos una función futura con zonas). Un evento `published` editado exige que **al menos
   una** función sea futura (antes: la única). Las funciones pasadas se permiten en borradores y en eventos publicados que tengan otra futura.
5. **F5 — Función elegida en entradas**: `?funcion=<uuid>` inválido, pasado, o de otro evento se ignora y se usa la más próxima (sin 404).
   Cambiar de función reinicia la selección (`key` por función en `CheckoutFlow`).

## Reutilizar

- `modules/organizer/schemas/create-event.schema.ts` (`zoneRowSchema`, `functionZonesStepSchema` pasa a describir una función), `useCreateEventForm`,
  `CreateEventWizard`, `FunctionZonesStep` (hoy un bloque = una función; se repite por función), `VenueZoneMap` para la vista previa.
- `event-write.service.ts` (`insertFunction`, `deleteStructure`, `parseStartsAt`, `resolveVenue`, `updateEvent` ya reemplaza estructura
  transaccionalmente) y `event-read.service.ts` (`getStructureLock`, `getEventForEdit`).
- `lib/db/test-helpers.ts` (`createTestDb`) y `lib/db/seed/event-catalog.ts` para tests con PGlite.
- `modules/events/utils/format-event-date.ts` para las etiquetas de fecha del selector; shadcn `button` (ya instalado). Sin componentes nuevos de
  shadcn ni dependencias.
- Nuevo (y por qué): `FunctionPicker` (no existe un selector de función; son enlaces simples con `next/link`, sin estado).

## Archivos

| Archivo | Acción | Tarea |
|---|---|---|
| `modules/organizer/schemas/create-event.schema.ts` + `.test.ts` | modificar | T1 |
| `modules/organizer/hooks/useCreateEventForm.ts` + `.test.ts` | modificar | T1 |
| `modules/organizer/services/event-write.service.ts` + `.test.ts` | modificar | T2 |
| `modules/organizer/services/event-read.service.ts` + `.test.ts` | modificar | T2 |
| `modules/organizer/actions/event.actions.test.ts` | modificar (fixtures con `functions[]`) | T2 |
| `modules/organizer/components/FunctionZonesStep.tsx` | modificar | T3 |
| `modules/organizer/components/CreateEventWizard.tsx` | modificar | T3 |
| `modules/ticketing/services/get-event-checkout.service.ts` + `.test.ts` | modificar | T4 |
| `modules/checkout/components/FunctionPicker.tsx` | crear | T4 |
| `modules/checkout/components/CheckoutFlow.tsx` | modificar | T4 |
| `app/(public)/eventos/[slug]/entradas/page.tsx` | modificar | T4 |

## Criterios de aceptación

- AC-1: `createEventFormSchema` acepta `functions` con 1 a 10 funciones, cada una con `startsAt` y al menos una zona válida; rechaza 0 funciones, más de 10,
  `startsAt` vacío y dos funciones del mismo evento con el mismo `startsAt`. Los errores de campo conservan ruta (`functions.1.zones.0.name`).
- AC-2: `useCreateEventForm` expone agregar/quitar función (no deja menos de una) y edita fecha y zonas de una función por índice sin afectar a las
  demás; los valores iniciales de edición cargan N funciones.
- AC-3: `createEvent` con N funciones crea evento, N `event_functions` y sus `function_zones`/`venue_zones` en **una transacción**; si falla cualquier paso
  no queda ninguna fila (rollback comprobado).
- AC-4: `updateEvent` sin pedidos reemplaza **todas** las funciones y zonas por las del formulario (sin filas huérfanas, incluidas `venue_zones`); con pedidos
  (D5) ignora la estructura y aplica solo los campos de detalle, **también cuando el evento tiene varias funciones**. Un evento `published` sin ninguna
  función futura entre las enviadas es rechazado.
- AC-5: `getStructureLock` devuelve `locked = hasOrders`; un evento con varias funciones y sin pedidos ya no queda bloqueado.
- AC-6: `getEventForEdit` devuelve todas las funciones ordenadas por `startsAt`, cada una con sus zonas; `structureLocked` solo es verdadero con pedidos.
- AC-7: El asistente (crear y editar) permite agregar y quitar funciones, cada una con su fecha/hora y zonas (nombre, aforo, precio) y vista previa; el
  aviso de bloqueo habla solo de pedidos. Con pedidos los pasos de sede y funciones siguen ocultos (D5).
- AC-8: Un evento del seed con varias funciones y sin pedidos se abre en `/organizador/eventos/[id]/editar` con la estructura editable y todas sus funciones
  cargadas.
- AC-9: `getCheckoutEventBySlug(db, slug, functionId?)` devuelve las zonas y el `startDate` de la función indicada (futura y del evento) o de la más próxima
  si no se indica o no es válida (F5), más la lista de funciones futuras (`id`, `startsAt`) ordenadas. La disponibilidad de cada zona no mezcla funciones.
- AC-10: `/eventos/[slug]/entradas?funcion=<id>` muestra las zonas de esa función; con más de una función futura se ve el selector (enlaces) con la actual
  marcada; con una sola, no se muestra. Cambiar de función reinicia cantidades.
- AC-11: Un pedido creado con zonas de la función B (vía `createPendingOrder`) queda con `order_items` de B y no consume stock de la función A (test).
- AC-12: `npm run lint`, `npm run test` y `npm run build` pasan; los tests existentes de eventos de una sola función siguen verdes.

## Tests requeridos

(Vitest, junto al archivo)

- `create-event.schema.test.ts`: casos de AC-1.
- `useCreateEventForm.test.ts`: AC-2 (agregar, quitar con mínimo 1, editar por índice, valores iniciales con 2 funciones).
- `event-write.service.test.ts`: AC-3 (2 funciones, rollback), AC-4 (reemplazo sin huérfanos, con pedidos solo detalle en evento de 2 funciones, publicado sin
  función futura).
- `event-read.service.test.ts`: AC-5 y AC-6.
- `event.actions.test.ts`: solo se adaptan los fixtures a `functions[]`; sin casos nuevos.
- `get-event-checkout.service.test.ts`: AC-9 (función elegida, id ajeno/pasado/inválido, disponibilidad por función) y AC-11 (con `createPendingOrder`).
- Sin test para `FunctionZonesStep`, `CreateEventWizard`, `FunctionPicker`, `CheckoutFlow` ni la página (presentacionales, SETUP.md 3.2).

## Tareas

### T1 — Schema y hook del formulario

- Archivos: `modules/organizer/schemas/create-event.schema.ts`, `modules/organizer/schemas/create-event.schema.test.ts`, `modules/organizer/hooks/useCreateEventForm.ts`, `modules/organizer/hooks/useCreateEventForm.test.ts`
- Depende de: —
- Paralelizable: sí (con T4)
- Cubre: AC-1, AC-2

### T2 — Servicios de escritura y lectura (+ fixtures de actions)

- Archivos: `modules/organizer/services/event-write.service.ts`, `modules/organizer/services/event-write.service.test.ts`, `modules/organizer/services/event-read.service.ts`, `modules/organizer/services/event-read.service.test.ts`, `modules/organizer/actions/event.actions.test.ts`
- Depende de: T1
- Paralelizable: sí (con T3, archivos disjuntos)
- Cubre: AC-3, AC-4, AC-5, AC-6, AC-8

### T3 — Paso "Funciones y zonas" del asistente

- Archivos: `modules/organizer/components/FunctionZonesStep.tsx`, `modules/organizer/components/CreateEventWizard.tsx`
- Depende de: T1
- Paralelizable: sí (con T2)
- Cubre: AC-7, AC-8 (UI)

### T4 — Selección de función en entradas

- Archivos: `modules/ticketing/services/get-event-checkout.service.ts`, `modules/ticketing/services/get-event-checkout.service.test.ts`, `modules/checkout/components/FunctionPicker.tsx` (crear), `modules/checkout/components/CheckoutFlow.tsx`, `app/(public)/eventos/[slug]/entradas/page.tsx`
- Depende de: —
- Paralelizable: sí (con T1, T2 y T3; no comparte archivos ni tipos)
- Cubre: AC-9, AC-10, AC-11

### Grupos paralelos

- G1: T1 y T4 (independientes).
- G2: T2 y T3 (tras T1; archivos disjuntos).
- Cierre: AC-12 lo valida el reviewer al final (`lint`, `test`, `build`).

## Preguntas abiertas

1. **Evento con pedidos: ¿permitir agregar una función nueva?** Hoy (D5) todo queda bloqueado y la spec lo mantiene. Agregar una función sin tocar las
   existentes no afecta stock vendido y es lo que un organizador querría tras un éxito de ventas, pero exige un camino de edición parcial. Recomendación: no
   ahora (YAGNI); fase posterior.
2. **Máximo de 10 funciones por evento (F1)**: es un tope arbitrario para acotar el input. Recomendación: aceptar.
3. **Nombre del ítem en Stripe**: hoy es "Título - Zona", sin fecha; con varias funciones el recibo no distingue cuál. Cambiarlo toca
   `app/api/checkout/route.ts` (fuera de las 4 tareas). Recomendación: agregar la fecha en una mini-tarea si el cliente lo pide; en el demo basta con
   que `/mis-entradas` muestre la función.
4. **Función inválida en `?funcion=` (F5)**: cae a la más próxima en silencio en lugar de 404. Recomendación: aceptar.
5. **Cada función crea sus propias `venue_zones` (F2)**: un evento con 3 funciones de zonas iguales duplica filas de `venue_zones` en la sede. Es inocuo
   para el demo; compartirlas exigiría emparejar por nombre. Recomendación: aceptar.

## Próximas fases

- Edición parcial con pedidos (agregar funciones nuevas, cancelar una función sin vendidas).
- Fecha de la función en Stripe y en los listados del cliente si no está ya.
- Duplicar una función con sus zonas.
