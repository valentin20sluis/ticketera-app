# Organizer Events CRUD

Estado: approved

## Objetivo

En `/organizador` ("Mis eventos") el listado (Read) ya viene de la DB, pero el asistente "Crear evento" solo guarda en `localStorage` y no hay
Editar ni Eliminar. Esta spec persiste **Create** en la DB y agrega **Update**, **cambio de estado** y **Delete**, con la autorización
decidida siempre en el servidor. Cierra la "Fase 2" de `organizer-events-real-data.md`.

## Decisiones de diseño (revisar antes de aprobar)

1. **D1 — Server Actions + service con DB inyectada**, mismo patrón que `modules/users` (`user-admin.actions.ts` → `user-account.service.ts`
   con `UserActionError`). El `actor` sale de `getCurrentUser()`, nunca del cliente.
2. **D2 — Todo en `modules/organizer/`** (no en `modules/events/`): el schema `create-event.schema.ts` ya vive ahí y `modules/organizer`
   ya importa de `modules/events`; ponerlo en `events` crearía un ciclo.
3. **D3 — `admin` y `super_admin` se igualan**: gestionan eventos de cualquier organizador. La separación real entre ambos ya existe
   en la gestión de usuarios (`canManageUser`). En `/organizador` cada uno sigue viendo solo los suyos (`listEventsForViewer` lo hace hoy); una
   vista global queda fuera de alcance.
4. **D4 — Borrado (opción A)**: físico solo si el evento es `draft` **y** ninguna zona de sus funciones tiene `order_items` (de cualquier
   estado de pedido: la FK impediría borrar). En cualquier otro caso se rechaza con un error que sugiere Cancelar.
5. **D5 — "Con pedidos" bloquea la estructura**: si algún `order_items` referencia las zonas del evento (pending o paid, por la FK y para no
   tocar el stock en venta), sede, función, zonas, precios y aforos quedan bloqueados. Es **más estricto** que "no tocar lo vendido":
   se evita reconciliar cambios parciales. Siguen editables título, descripción, imagen, horarios, edad y tipo de admisión.
   Sin pedidos, editar la estructura reemplaza función y zonas dentro de una transacción.
6. **D6 — Una sola función por evento en el asistente.** Eventos con más de una función (p. ej. los del seed) se editan solo en los
   campos de detalle; la estructura se muestra bloqueada.
7. **D7 — Zona horaria**: `startsAt` llega como `YYYY-MM-DDTHH:mm` (input `datetime-local`) y el servidor lo interpreta como hora de Lima
   (`-05:00`, sin horario de verano). Se guarda como `timestamptz`.
8. **D8 — Categorías y sedes salen de la DB.** Hoy el asistente usa `MOCK_CATEGORIES` (ids `"music"`…) y `SEED_ORGANIZER_CATALOG`; la DB usa uuid. Sin
   esto, crear fallaría por FK.
9. **D9 — Imagen: se mantiene la URL**, pero el servidor exige `http:`/`https:` (zod `z.url()` acepta `javascript:`). Subida de archivos queda fuera.

## Matriz de permisos (contrato de `canWriteEvent` y `nextStatuses`)

`actor` habilitado = rol `organizer`/`admin`/`super_admin`, `isSuspended = false`, `deletedAt = null`. Cualquier otro (incluido `customer` y `null`) no puede escribir nada.

| Actor | Sobre eventos | Editar (detalle) | Estados a los que puede mover |
|---|---|---|---|
| `organizer` | solo los propios (`organizer_id = actor.id`) | `draft`, `published` | `draft→published`, `draft→cancelled`, `published→cancelled` |
| `admin` / `super_admin` | cualquiera | `draft`, `published`, `suspended` | lo del organizador, más `draft\|published→suspended` y `suspended→published\|cancelled` |

- `cancelled` es terminal y de solo lectura para todos. `suspended` solo lo pone y lo levanta un admin; el organizador no puede editarlo ni revertirlo.
- Publicar (`→published`) exige: al menos una función con `startsAt` futura y al menos una zona.
- Borrar: dueño o admin, evento `draft` sin pedidos (D4).
- Sede: la sede elegida debe pertenecer al **organizador dueño del evento** (no al actor), para que un admin no cruce sedes entre organizadores.

## Fuera de alcance

- Subida de imágenes (se mantiene URL), eventos con varias funciones en el asistente, edición de zonas existentes de una sede (mapa de zonas).
- Vista global de eventos para admin (`/super-admin/...`) y catálogo público real.
- Reembolsos al cancelar un evento con entradas vendidas (la cancelación solo cambia el estado; ver pregunta 2).
- Auditoría / historial de cambios; Stripe Connect y `/organizador/pagos`.
- Paginación y filtros de la tabla.

## Reutilización

- Existente que se reutiliza:
  - `modules/users/services/current-user.service.ts` (`requireRole`, `CurrentUser`) y el patrón de `modules/users/actions/user-admin.actions.ts` / `user-account.service.ts` (`run()`, error tipado, `revalidatePath`).
  - `modules/events/services/list-events-for-viewer.service.ts` (Read, sin cambios) y `lib/db/test-helpers.ts` + `lib/db/seed/event-catalog.ts` para tests con PGlite.
  - `modules/organizer/schemas/create-event.schema.ts` (`createEventFormSchema`, `eventDetailsSchema`…): fuente única de validación, cliente y servidor.
  - `modules/organizer/components/{CreateEventWizard,EventDetailsStep,VenueStep,FunctionZonesStep}.tsx` y `hooks/useCreateEventForm.ts`.
  - `modules/organizer/components/OrganizerEventsTable.tsx` (se extiende), `modules/users/components/DeleteUserDialog.tsx` (patrón del diálogo), shadcn `dropdown-menu`, `alert-dialog`/`dialog` si ya están en `components/ui/`.
  - `buildStackedZoneShape` y `slugify` de `utils/build-organizer-event-entry.ts` (se mueven, no se reescriben).
- Existente que se extiende: `useCreateEventForm` (valores iniciales opcionales para modo edición), `CreateEventWizard` (modo crear/editar, recibe categorías y sedes por props), `EventDetailsStep` (categorías por props en vez de `MOCK_CATEGORIES`), `create-event.schema.ts` (restricción `http/https` en `imageUrl` y tipo `CreateEventFormValues` derivado con `z.infer`).
- Nuevo (y por qué): permisos y transiciones (`modules/users/utils/permissions.ts` es solo de usuarios), servicio de escritura de eventos (no existe ninguno), lecturas de categorías/sedes/evento-para-editar (hoy salen de mocks), actions.
- Se elimina (verificar con grep antes): `hooks/useOrganizerCatalog.ts`, `utils/organizer-catalog-storage.ts` (+ test), `utils/build-organizer-event-entry.ts` (+ test, tras mover sus dos helpers), `data/current-organizer.mock.ts`, `data/organizer-catalog.mock.ts`, tipos mock huérfanos de `organizer.types.ts`, el aviso del asistente en `app/(panel)/organizador/page.tsx`.
- Dependencias / componentes shadcn a instalar antes de implementar: verificar `dropdown-menu` y `alert-dialog` en `components/ui/`; si faltan, `npx shadcn@latest add dropdown-menu alert-dialog` (Base UI, no Radix). Sin migraciones de schema.

## Criterios de aceptación

- AC-1: `canWriteEvent(actor, event, action)` y `nextStatuses(actor, event)` cumplen exactamente la matriz; actor `null`, `customer`, suspendido o con `deletedAt` → todo denegado; son funciones puras.
- AC-2: `createEvent(db, actor, input)` valida con `createEventFormSchema` + `http/https`, crea sede nueva (si aplica), `venue_zones`, evento (`draft`), función y `function_zones` en **una transacción**; si falla cualquier paso no queda ninguna fila. Slug generado en servidor (único, con sufijo). `organizer_id` = el actor (organizer) o el indicado por un admin.
- AC-3: Crear con una sede existente de **otro** organizador falla (error tipado) y no escribe nada. Un `customer`/suspendido no puede crear.
- AC-4: `updateEvent` solo permite al organizador editar sus eventos en `draft`/`published`; evento ajeno, `cancelled` o `suspended` (para organizador) → error. Admin puede editar cualquiera salvo `cancelled`.
- AC-5: Con pedidos (D5), `updateEvent` ignora/rechaza cambios de sede, función, zonas, precios y aforos y aplica solo los campos de detalle; sin pedidos reemplaza función y zonas transaccionalmente.
- AC-6: `setEventStatus` aplica solo transiciones permitidas por la matriz; publicar sin función futura o sin zonas falla; `suspended` no lo puede poner ni levantar un organizador.
- AC-7: `deleteEvent` borra (zonas de función → funciones → evento, en transacción) solo `draft` sin `order_items`; si no es `draft` o tiene pedidos devuelve error tipado que indica Cancelar; ajeno → error; no queda ninguna fila huérfana.
- AC-8: `getEventForEdit(db, actor, id)` devuelve los valores del formulario solo si el actor puede editarlo; si no, `null`. `listCategories` y `listVenuesForOrganizer(db, organizerId)` leen de la DB (sedes: solo del organizador).
- AC-9: Cada Server Action llama `requireRole([...])`, valida el input con zod (`safeParse`, ids `z.uuid()`), nunca confía en `organizerId` del cliente para organizers y devuelve `{ error }` sin filtrar detalles internos; hace `revalidatePath("/organizador")` al éxito.
- AC-10: `/organizador/eventos/nuevo` crea en la DB y redirige a `/organizador` mostrando el evento; `CreateEventWizard` ya no usa `localStorage`, `CURRENT_ORGANIZER` ni `SEED_ORGANIZER_CATALOG`, y el aviso del asistente desaparece de `/organizador`.
- AC-11: `/organizador/eventos/[id]/editar` (Server Component, `requireRole`) precarga el evento con `getEventForEdit`; `notFound()` si no existe o no corresponde al actor; con pedidos los pasos de sede/función/zonas se muestran bloqueados con un aviso.
- AC-12: La tabla muestra por fila un menú con solo las acciones permitidas para ese actor y estado (Editar, Publicar, Cancelar, Eliminar; Eliminar solo en `draft`). Cancelar y Eliminar piden confirmación y muestran el error devuelto por la action.
- AC-13: Las tablas del seed (futuros eventos) no se alteran: tests existentes siguen pasando; `grep -rn "useOrganizerCatalog\|organizer-catalog-storage\|CURRENT_ORGANIZER\|SEED_ORGANIZER_CATALOG" --include=*.ts --include=*.tsx .` solo devuelve resultados en `docs/`.
- AC-14: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tareas

### T1 — Permisos y transiciones

- Archivos: `modules/organizer/utils/event-permissions.ts` (crear: `canWriteEvent`, `nextStatuses`, tipo `EventActor`), `modules/organizer/utils/event-permissions.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Tests: una prueba por celda de la matriz (organizer propio/ajeno, admin, super_admin, customer, suspendido, eliminado, `null`) y por transición permitida/denegada.
- [x] Completada

### T2 — Servicio de escritura (create / update / status / delete)

- Archivos: `modules/organizer/services/event-write.service.ts` (crear: `createEvent`, `updateEvent`, `setEventStatus`, `deleteEvent`, `EventActionError`), `modules/organizer/services/event-write.service.test.ts` (crear), `modules/organizer/utils/event-slug.ts` (crear, mueve `slugify`), `modules/organizer/utils/zone-shape.ts` (crear, mueve `buildStackedZoneShape`) + sus tests
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-3, AC-4, AC-5, AC-6, AC-7
- Tests: `createTestDb` (PGlite) con dos organizadores, un admin y un customer; rollback comprobado forzando un fallo a mitad de la transacción; sede ajena; con y sin `order_items` (pending, paid, expired); matriz de transiciones; publicar sin función futura; borrado con y sin pedidos; sin filas huérfanas tras borrar.
- [x] Completada

### T3 — Lecturas para el formulario

- Archivos: `modules/organizer/services/event-read.service.ts` (crear: `listCategories`, `listVenuesForOrganizer`, `getEventForEdit`), `modules/organizer/services/event-read.service.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-8
- Tests: sedes solo del organizador pedido; `getEventForEdit` devuelve `null` para ajeno, `cancelled` y actor no habilitado; devuelve la bandera `structureLocked` cuando hay pedidos o más de una función.
- [x] Completada

### T4 — Server Actions

- Archivos: `modules/organizer/actions/event.actions.ts` (crear: `createEventAction`, `updateEventAction`, `setEventStatusAction`, `deleteEventAction`), `modules/organizer/actions/event.actions.test.ts` (crear; mock de `requireRole`/`getDb`)
- Depende de: T2, T3
- Grupo paralelo: G3
- Cubre: AC-9
- Tests: input inválido → `{ error }`; ids no uuid; el cliente no puede forzar `organizerId` siendo organizer; errores internos no se filtran; `revalidatePath` solo en éxito.
- [x] Completada

### T5 — Asistente conectado a la DB (crear / editar) y limpieza

- Archivos: `modules/organizer/components/CreateEventWizard.tsx`, `modules/organizer/components/EventDetailsStep.tsx`, `modules/organizer/components/VenueStep.tsx`, `modules/organizer/hooks/useCreateEventForm.ts` (+ su test), `modules/organizer/schemas/create-event.schema.ts` (+ su test), `modules/organizer/types/organizer.types.ts` (modificar); `app/(panel)/organizador/eventos/nuevo/page.tsx` (modificar), `app/(panel)/organizador/eventos/[id]/editar/page.tsx` (crear); eliminar los archivos listados en "Se elimina" salvo el aviso de `app/(panel)/organizador/page.tsx` (lo toca T6)
- Depende de: T4
- Grupo paralelo: G4
- Cubre: AC-10, AC-11, AC-13
- Tests: `useCreateEventForm` con valores iniciales (modo edición); schema con `javascript:` y `ftp:` rechazados. Componentes presentacionales sin test (SETUP.md 3.2).
- [x] Completada

### T6 — Menú de acciones por fila y confirmaciones

- Archivos: `modules/organizer/components/OrganizerEventsTable.tsx` (modificar: columna de acciones), `modules/organizer/components/EventRowActions.tsx` (crear), `modules/organizer/components/ConfirmEventActionDialog.tsx` (crear), `app/(panel)/organizador/page.tsx` (modificar: pasar el actor a la tabla y quitar el aviso)
- Depende de: T4
- Grupo paralelo: G4
- Cubre: AC-12, AC-10 (aviso), AC-14
- Tests: lo que decide qué acciones se muestran es `nextStatuses`/`canWriteEvent` (ya testeado en T1); la UI no duplica la regla.
- [x] Completada

## Grupos paralelos

- G1: T1.
- G2: T2 y T3 (archivos disjuntos; ambos dependen solo de T1).
- G3: T4 (tras T2 y T3).
- G4: T5 y T6 (archivos disjuntos; ambos dependen de T4). `app/(panel)/organizador/page.tsx` es solo de T6.

## Preguntas abiertas

1. **D5 más estricta que lo hablado**: con pedidos se bloquea toda la estructura, no solo lo vendido. Recomendación: mantenerla; la edición parcial exige reconciliar stock y es una fase aparte.
2. **Cancelar con entradas vendidas**: solo cambia el estado; no reembolsa ni notifica. Recomendación: permitirlo ahora y dejar reembolsos para otra spec (Stripe), mostrando una advertencia en el diálogo cuando haya pedidos `paid`.
3. **Zona horaria fija de Lima (D7)**. Recomendación: aceptar; si la app sale de Perú habrá que guardar la zona del venue.
4. **Despublicar (`published→draft`)**: no se permite. Recomendación: no, evita eventos con pedidos que "desaparecen"; el organizador cancela.
5. **`admin` crea eventos a nombre de otro organizador**: la spec lo permite en el servicio, pero la UI de `/organizador` crea siempre a nombre propio. Recomendación: sin selector de organizador por ahora (YAGNI).
