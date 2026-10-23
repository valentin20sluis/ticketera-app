# Configuración del organizador (perfil con RUC y pagos con Stripe)

Estado: aprobada

## Objetivo

Que un organizador sin pagos listos vea en `/organizador` un aviso **rojo** con el botón "Ir a configuración", y que ese botón lo lleve a una página nueva `/organizador/configuracion` con dos secciones: **1. Perfil** (nombre y correo prellenados, RUC editable, "Guardar perfil") y **2. Pagos** (estado de Stripe Connect y botón "Configurar pago" que redirige al onboarding alojado de Stripe, `connect.stripe.com/setup/e/...`).

Contexto: la rama parte de `feat/connect-payments-check-in`, que ya trae el onboarding (`connectStripeAction`, `createOnboardingLink`, callback `app/api/stripe/connect/callback`) y el bloqueo de publicación (`setEventStatus` + `canAcceptPayments`, spec `docs/specs/publish-requires-stripe.md`). Esta spec no cambia esa lógica; solo la hace accesible y agrega el RUC. No toca auth, roles ni pagos más allá de reutilizar lo existente (el rol lo sigue verificando `requireRole`).

Hallazgos de código (verificados):

- No existe `src/`: el repo usa `app/`, `modules/`, `lib/`, `components/` en la raíz (alias `@/*` = raíz). SETUP.md habla de la misma estructura sin `src/`.
- `app/(panel)/organizador/page.tsx` renderiza `<StripeConnectBanner state={deriveConnectState(user)} />` solo para `role === "organizer"`. El banner hoy es una `Card` neutra (client component) con un formulario `useActionState(connectStripeAction)` y devuelve `null` si el estado es `active`. No usa `organizerPaymentsReady` (ese flag, de `getOrganizerSummary`, solo lo usa `OrganizerEventsTable` para deshabilitar "Publicar").
- `deriveConnectState`: `not_connected` (sin `stripeAccountId`), `pending` (cuenta sin charges y payouts ambos activos), `active`. Ojo: el bloqueo de publicar usa `canAcceptPayments` (cuenta + `charges_enabled`, sin exigir payouts), por lo que existe un caso `pending` con charges activos donde ya se puede publicar. Ver pregunta 2.
- `connectStripeAction()` (`requireRole(["organizer"])`) crea la cuenta si falta, genera el Account Link (v2) con `refresh_url`/`return_url` hacia el callback y hace `redirect(url)`. El callback `return` sincroniza flags y redirige a `/organizador`; esto se mantiene (ver pregunta 4).
- `users` (`lib/db/schema.ts`) no tiene columna de RUC ni tabla de perfil de organizador. `full_name` y `email` vienen de Clerk y el webhook `user.updated` sobrescribe `full_name`, por eso en esta fase son **solo lectura**.
- Panel: `modules/panel/nav-config.ts` (`ORGANIZER_NAV_ITEMS`) alimenta el sidebar; `/organizador/pagos` es hoy un stub `PanelComingSoon`. `proxy.ts` ya protege `/organizador(.*)` con Clerk, por lo que la ruta nueva queda protegida sin cambios (la autorización por rol la hace `requireRole`).
- Migraciones: esta rama termina en `0005_swift_overlord`. Las ramas `feat/seat-selection`, `feat/orders-reconciliation-job` e `integration/local-all` ya tienen `0006_seat_selection` y `0007_default_seat_layout`. Conflicto potencial: la migración de esta spec saldría como `0006_*` aquí y colisionaría (mismo `idx` en `_journal.json` y snapshot) al combinarse. Mitigación: la SQL es una sola sentencia aditiva; al mergear después de seat-selection se regenera con `drizzle-kit generate` para que quede `0008`, o se renumera a mano. No se hardcodea el número en el código.
- No existe `components/ui/alert.tsx`. Hay `badge`, `card`, `button`, `input`, etc.

## Decisiones de diseño

1. **Aviso rojo**: `Alert` de shadcn (variante `destructive`, `role="alert"`) con título, texto y botón "Ir a configuración" (`Link` a `/organizador/configuracion`). Se muestra si `deriveConnectState(user) !== "active"` y desaparece al estar `active` (misma condición que hoy). El botón ya no dispara la Server Action: solo navega.
2. **RUC en `users.ruc`** (`varchar(11)`, nullable). Un perfil de organizador separado sería una tabla para una columna (YAGNI). Sin índice único (default: no único, un RUC puede repetirse entre cuentas de prueba/representantes).
3. **Validación de RUC** (zod, `ruc.schema.ts`): se recorta (`trim`), exactamente 11 dígitos numéricos y prefijo `10`, `15`, `17` o `20`. No se valida el dígito verificador (default; ver pregunta 3). Vacío se permite y guarda `null` (el RUC es opcional en esta fase; ver pregunta 1).
4. **Quién edita**: solo el propio organizador. La acción usa `requireRole(["organizer"])` y actualiza `WHERE id = user.id`; nunca recibe un `userId` del cliente. Admin/super_admin no ven la página (redirect `/` por `requireRole`).
5. **Nombre y correo**: de solo lectura (inputs `readOnly`/`disabled` con texto de ayuda "Se administra desde tu cuenta"). Se leen de `requireRole`, sin consulta extra.
6. **Pagos reutiliza `connectStripeAction`** sin modificarla. El formulario con `useActionState` hoy vive dentro del banner; se extrae a un componente `ConnectStripeButton` (DRY) usado por la sección Pagos. Etiquetas según `deriveConnectState`: `not_connected` -> "Configurar pago", `pending` -> "Continuar configuración", `active` -> sin botón, texto "Pagos listos" (más un botón secundario no incluido; ver Próximas fases).
7. **Patrón de errores**: `OrganizerProfileError extends Error` (solo su mensaje es visible); la acción devuelve `{ error }` con el mensaje seguro o uno genérico, igual que `UserActionError` y `ConnectActionError`.
8. **Bloqueo de publicación**: la lógica de servidor no cambia. Los mensajes de `setEventStatus` siguen siendo texto plano; el enlace a la nueva página se agrega en la UI: `publishBlockedReason` de "Publicar" (solo para el organizador dueño) incluye un enlace "Ir a configuración" a `/organizador/configuracion`. Para admin/super_admin queda el texto actual sin enlace (no pueden configurar la cuenta ajena).
9. **"Use test phone number"**: es un elemento de la página alojada de Stripe en sandbox; no se programa nada. Ver "Pendientes humanos".
10. **Dependencias de módulos**: la página compone `organizer` (perfil) y `payments` (sección Pagos + botón). `organizer -> payments` ya existe; `payments` no importa de `organizer`.

## Alcance

- Incluye:
  - Aviso rojo con "Ir a configuración" en `/organizador` (reemplaza la presentación actual del banner).
  - Página `/organizador/configuracion` (solo rol `organizer`) con "1. Perfil" y "2. Pagos".
  - Columna `users.ruc` + migración Drizzle aditiva.
  - Schema zod de RUC, servicio `saveOrganizerProfile` (db inyectada), Server Action `saveOrganizerProfileAction`.
  - Ítem "Configuración" en el sidebar del organizador.
  - Enlace "Ir a configuración" en el motivo de "Publicar" bloqueado.
  - Componente `shadcn alert`.
- No incluye:
  - Exigir RUC para publicar o cobrar.
  - Editar nombre o correo (viven en Clerk).
  - Validar el dígito verificador del RUC ni consultar SUNAT.
  - Cambiar `connectStripeAction`, `createOnboardingLink`, el callback ni la lógica de `setEventStatus`.
  - Convertir `/organizador/pagos` (stub) en algo real, ni eliminarlo.
  - Dashboard de Stripe Express, desconectar o cambiar de cuenta.
  - Mostrar el RUC en tickets/facturas.

## Reutilizar

- `StripeConnectBanner` (se reescribe como aviso), `connectStripeAction`, `deriveConnectState`, `canAcceptPayments`, `createOnboardingLink` (sin cambios salvo el banner).
- `requireRole`, `CurrentUser` (`modules/users/services/current-user.service.ts`).
- Patrón `UserActionError` / `ConnectActionError` / `EventActionError` + `run` de `modules/organizer/actions/event.actions.ts`.
- `components/ui`: `button`, `card`, `input`, `badge`; nuevo `alert` (`npx shadcn@latest add alert`, verificar que el CLI lo genere para Base UI/`base-nova`).
- `PanelShell` / `SidebarNav` / `nav-config.ts`; `PanelComingSoon` no se usa.
- `createTestDb` (`@/lib/db/test-helpers`, PGlite aplica `./drizzle`).
- Para buscar más: `npx shadcn@latest search @shadcn -q alert` antes de T0.

## Archivos

Nuevos:
- `components/ui/alert.tsx` (shadcn)
- `drizzle/0006_<nombre>.sql` y `drizzle/meta/0006_snapshot.json` (generados por `drizzle-kit generate`; ver conflicto de numeración)
- `modules/organizer/schemas/organizer-profile.schema.ts` y `.test.ts`
- `modules/organizer/services/organizer-profile.service.ts` y `.test.ts`
- `modules/organizer/actions/organizer-profile.actions.ts` y `.test.ts`
- `modules/organizer/components/OrganizerProfileForm.tsx`
- `modules/payments/components/ConnectStripeButton.tsx`
- `modules/payments/components/PaymentsSettingsSection.tsx`
- `app/(panel)/organizador/configuracion/page.tsx`

Modificados:
- `lib/db/schema.ts` (columna `ruc`), `drizzle/meta/_journal.json`, `lib/db/schema.test.ts`
- `modules/payments/components/StripeConnectBanner.tsx`
- `app/(panel)/organizador/page.tsx` (solo si cambian props del banner; idealmente sin cambios)
- `modules/panel/nav-config.ts`
- `modules/organizer/components/OrganizerEventsTable.tsx` y `modules/organizer/components/EventRowActions.tsx` (enlace en el motivo bloqueado)

## Criterios de aceptación

- AC1: `users` tiene la columna `ruc` (`varchar(11)`, nullable, sin único); la migración es una sola sentencia aditiva (`ALTER TABLE "users" ADD COLUMN "ruc" varchar(11)`), `createTestDb` la aplica y los datos existentes no cambian.
- AC2: `organizerProfileSchema` acepta `"20123456789"`, `"10123456789"`, `"15..."`, `"17..."` (11 dígitos); recorta espacios alrededor; transforma `""` en `null`. Rechaza 10 o 12 dígitos, letras, caracteres especiales, espacios internos y prefijos distintos de 10/15/17/20 (ej. `"30123456789"`).
- AC3: `saveOrganizerProfile(db, actor, input)` guarda el RUC validado en la fila del actor (`WHERE id = actor.id`), actualiza `updated_at` y devuelve el RUC guardado. Con `""` guarda `null`. No modifica a otros usuarios.
- AC4: Un actor que no es `organizer` (admin, super_admin, customer) recibe `OrganizerProfileError` con mensaje de permiso y no se escribe nada en la DB (defensa en profundidad, además de `requireRole`).
- AC5: Entrada inválida lanza `OrganizerProfileError("Datos no válidos")` (o mensaje específico seguro "RUC no válido") sin tocar la DB; un error de DB no expone su mensaje (la acción devuelve el genérico).
- AC6: `saveOrganizerProfileAction(prevState, formData)` usa `requireRole(["organizer"])`, ignora cualquier `userId` del formulario, devuelve `{ success: true }` o `{ error }` (solo `OrganizerProfileError` visible, el resto genérico) y hace `revalidatePath("/organizador/configuracion")`.
- AC7: `/organizador` muestra, para un organizador con estado `not_connected` o `pending`, un aviso con `role="alert"` y estilos destructivos (rojo) con título, descripción y un enlace/botón "Ir a configuración" a `/organizador/configuracion`. Con estado `active`, o para admin/super_admin, no se muestra. El aviso ya no contiene el formulario de la Server Action.
- AC8: `/organizador/configuracion` solo es accesible al rol `organizer` (otros roles son redirigidos por `requireRole`; sin sesión, por `proxy.ts`).
- AC9: Sección "1. Perfil": muestra "Nombre del organizador" y "Correo" prellenados y de solo lectura, campo "RUC" prellenado con el valor guardado (vacío si es `null`) y botón "Guardar perfil" (deshabilitado con "Guardando..." mientras se envía). El error aparece con `role="alert"` junto al campo y el éxito como mensaje de estado (`role="status"`). Cada input tiene `label` asociado.
- AC10: Sección "2. Pagos": muestra el estado (sin cuenta / en proceso / listo) y, según `deriveConnectState`, el botón "Configurar pago" (`not_connected`), "Continuar configuración" (`pending`) o ninguno con texto "Pagos listos" (`active`). El botón ejecuta `connectStripeAction` (que redirige al Account Link de Stripe); si falla muestra el error seguro con `role="alert"`.
- AC11: El sidebar del organizador incluye "Configuración" (`/organizador/configuracion`, ícono `Settings`) y queda activo en esa ruta.
- AC12: En la tabla de eventos, cuando el organizador dueño no está listo para cobrar, el motivo de "Publicar" deshabilitado incluye un enlace "Ir a configuración" a `/organizador/configuracion`; para admin/super_admin se mantiene el texto sin enlace.
- AC13: `connectStripeAction`, `stripe-connect.service`, el callback y `setEventStatus` quedan sin cambios y sus tests existentes pasan sin modificarse.
- AC14: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)

- `lib/db/schema.test.ts`: la columna `ruc` existe y es nullable (AC1); si el archivo ya valida columnas de `users`, agregar el caso ahí.
- `modules/organizer/schemas/organizer-profile.schema.test.ts`: AC2 (válidos con cada prefijo, trim, vacío -> `null`; inválidos: longitud, no numérico, prefijo, espacios internos).
- `modules/organizer/services/organizer-profile.service.test.ts` (con `createTestDb`): AC3, AC4, AC5.
- `modules/organizer/actions/organizer-profile.actions.test.ts` (mock de `requireRole`, `getDb`, `revalidatePath` y del servicio, como `event.actions.test.ts`): AC6, incluido que un `userId` en el `FormData` se ignora y que un error no seguro devuelve el mensaje genérico.
- Sin tests para banner, formularios, `PaymentsSettingsSection`, `ConnectStripeButton`, página, nav-config ni la tabla (presentacionales; la lógica está en servicio, schema y acción ya testeados).

## Tareas

### T0 — Base: columna `ruc`, migración y componente `alert`
- Archivos: `lib/db/schema.ts`, `lib/db/schema.test.ts`, `drizzle/0006_*.sql`, `drizzle/meta/0006_snapshot.json`, `drizzle/meta/_journal.json`, `components/ui/alert.tsx`
- Depende de: —
- Paralelizable: no (base de todo)
- Cubre: AC1

### T1 — Schema y servicio del perfil
- Archivos: `modules/organizer/schemas/organizer-profile.schema.ts`, `modules/organizer/schemas/organizer-profile.schema.test.ts`, `modules/organizer/services/organizer-profile.service.ts`, `modules/organizer/services/organizer-profile.service.test.ts`
- Depende de: T0
- Paralelizable: sí (con T4 y T5; archivos disjuntos)
- Cubre: AC2, AC3, AC4, AC5

### T2 — Server Action del perfil
- Archivos: `modules/organizer/actions/organizer-profile.actions.ts`, `modules/organizer/actions/organizer-profile.actions.test.ts`
- Depende de: T1
- Paralelizable: no (necesita el servicio; T4 y T5 pueden avanzar a la vez)
- Cubre: AC6

### T3 — Página de configuración y sidebar
- Archivos: `app/(panel)/organizador/configuracion/page.tsx`, `modules/organizer/components/OrganizerProfileForm.tsx`, `modules/payments/components/ConnectStripeButton.tsx`, `modules/payments/components/PaymentsSettingsSection.tsx`, `modules/panel/nav-config.ts`
- Depende de: T2 (acción del perfil), T0
- Paralelizable: no
- Cubre: AC8, AC9, AC10, AC11

### T4 — Aviso rojo en `/organizador`
- Archivos: `modules/payments/components/StripeConnectBanner.tsx` (y `app/(panel)/organizador/page.tsx` solo si cambia su firma)
- Depende de: T0 (componente `alert`)
- Paralelizable: sí (con T1/T2/T3; archivos disjuntos; el destino es la ruta fija `/organizador/configuracion`)
- Cubre: AC7, AC13

### T5 — Enlace en el motivo de publicación bloqueada
- Archivos: `modules/organizer/components/OrganizerEventsTable.tsx`, `modules/organizer/components/EventRowActions.tsx`
- Depende de: —
- Paralelizable: sí (con T1 a T4)
- Cubre: AC12, AC14 (junto con el resto)

Grupos: T0 -> {T1 -> T2 -> T3} en cadena, con T4 y T5 en paralelo a esa cadena (T4 tras T0).

## Casos límite

- Doble clic en "Guardar perfil": idempotente (mismo UPDATE).
- RUC con espacios pegados al inicio/fin: se recortan; con espacios internos o guiones: se rechazan.
- Organizador con onboarding abandonado (`pending`): "Continuar configuración" genera un Account Link nuevo con la misma cuenta.
- Regreso de Stripe: el callback `return` sincroniza y redirige a `/organizador`; el aviso desaparece cuando el flag ya se actualizó. Si el webhook va retrasado el aviso puede persistir unos segundos (ver pregunta 4).
- Pérdida de `charges_enabled` más adelante: el aviso reaparece (el estado se deriva de la DB).
- Cuenta suspendida (`isSuspended`): `requireRole` la redirige; no puede guardar.
- Administrador que entra a `/organizador/configuracion`: redirigido a `/`; el ítem del sidebar solo aplica al rol organizador (verificar en `PanelShell` que el ítem no engañe a admin; ver pregunta 5).

## Pendientes humanos (fuera del código)

- **"Use test phone number"**: lo ofrece la página alojada de Stripe (`connect.stripe.com/setup/e/...`, título "Ticketera App sandbox") solo cuando la plataforma usa claves **de prueba/sandbox** (`sk_test_...` en `STRIPE_SECRET_KEY`) y la cuenta conectada se crea en ese entorno. Una persona debe confirmar: (1) las variables de Stripe del entorno apuntan al sandbox; (2) Connect está habilitado en el dashboard de la plataforma, con el perfil de plataforma completado; (3) `STRIPE_CONNECT_ACCOUNT_COUNTRY` coincide con un país soportado en pruebas; (4) los datos de prueba oficiales de Stripe para el onboarding (teléfono de prueba, etc.) se siguen en la página alojada. Con claves live el enlace no aparece. No hay código que lo controle.
- Aplicar la migración en la base real (`drizzle-kit migrate`) y resolver la numeración frente a `0006`/`0007` de seat-selection.

## Preguntas abiertas

1. **¿RUC obligatorio?** Default: opcional (se guarda `null` si está vacío) y no bloquea publicar ni cobrar. Alternativa: exigirlo para publicar (tocaría `setEventStatus`).
2. **Condición del aviso.** Default: `deriveConnectState !== "active"` (incluye `pending` con charges activos y payouts no, caso donde ya se puede publicar). Alternativa: mostrar el aviso solo si `!canAcceptPayments`, alineado exactamente con el bloqueo de publicar.
3. **Validación del dígito verificador del RUC (módulo 11).** Default: no, solo formato (11 dígitos con prefijo 10/15/17/20). Fácil de agregar luego en el mismo schema.
4. **Destino tras volver de Stripe.** Default: el callback sigue redirigiendo a `/organizador` (sin cambios, AC13). Alternativa: redirigir a `/organizador/configuracion` para ver el estado de Pagos; tocaría el callback.
5. **Visibilidad del ítem "Configuración" para admin/super_admin** (ya que `ORGANIZER_NAV_ITEMS` se comparte en `PanelShell`). Default: se muestra igual y la página redirige a quienes no son `organizer`; verificar en T3 si conviene ocultarlo.
6. **`/organizador/pagos` (stub "próximamente").** Default: se deja como está. Alternativa: redirigirla a `/organizador/configuracion` o quitarla del sidebar.
7. **Unicidad del RUC.** Default: no único.
8. **Textos exactos** del aviso (propuesta: título "Configura tus pagos para publicar eventos", descripción "Conecta tu cuenta de Stripe para poder publicar tus eventos y recibir tus cobros.").

## Próximas fases

- Enlace al panel Express de Stripe y estado detallado en la sección Pagos cuando está "listo".
- Validación del dígito verificador del RUC y uso del RUC en comprobantes.
- Exigir RUC para publicar.
- Convertir `/organizador/pagos` en historial de cobros.
