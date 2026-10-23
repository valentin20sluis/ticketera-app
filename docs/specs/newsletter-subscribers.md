# Newsletter Subscribers

Estado: aprobada

## Objetivo

Trello 15. `components/shared/NewsletterCard.tsx` es solo estado local: `handleSubmit` muestra "success" y vacía el input, pero el correo no se guarda ni se envía a ningún lado, y el texto dice "Revisa tu correo para confirmar la suscripción" (falso). El usuario eligió **persistir el correo**: tabla `newsletter_subscribers` + Server Action con validación zod y dedupe. Sin proveedor de email por ahora (no se envían correos). No toca auth, pagos ni inventario; el endpoint es público (sin sesión).

## Hallazgos

- `NewsletterCard` se usa solo en `app/(public)/page.tsx:34`. Es client component con `useState` (email, status) y `noValidate`.
- Patrón del proyecto: Server Action en `modules/<dominio>/actions/*.actions.ts` ("use server"), que valida con zod, llama a un servicio con `db: Db` inyectado (`getDb()` de `@/lib/db/client`) y devuelve un estado `{ error?, success? }` con mensajes genéricos (solo se muestran errores propios; lo inesperado -> mensaje genérico). Ejemplo: `modules/organizer/actions/event.actions.ts`. `modules/users/components/InviteUserDialog.tsx` ya usa `useActionState(action, initialState)` con `pending`.
- Schema: `lib/db/schema.ts` usa `uuid().primaryKey().defaultRandom()`, `varchar` con largo, `createdAt timestamp({withTimezone:true}).notNull().defaultNow()`. Tests de BD con PGlite (`lib/db/test-helpers.ts`, `createTestDb` aplica `./drizzle`).
- Migraciones: en main llegan hasta `drizzle/0005_swift_overlord.sql`. Otras ramas sin mergear tienen 0006-0008, por lo que **riesgo de colisión de numeración**: esta rama generará su migración con `drizzle-kit generate` (será `0006_*`); si otra rama se mergea antes, se regenera/renumera (borrar el `.sql` y la entrada de `drizzle/meta/_journal.json` + snapshot y volver a generar sobre el estado mergeado). No escribir el SQL a mano.
- Zod v4: `z.email()` (o `z.string().trim().toLowerCase().pipe(z.email())`), `.max(254)`.

## Decisiones

- D1. Columnas: `id` uuid pk, `email` varchar(254) not null **unique**, `created_at`. El email se guarda recortado y en minúsculas (normalización en el schema zod antes de insertar). Sin `unsubscribed_at`/`confirmed_at` (YAGNI: no hay envíos ni confirmación).
- D2. Dedupe silencioso: `insert ... onConflictDoNothing()` sobre `email`. Si ya existía se responde el mismo éxito, sin revelar que estaba suscrito (no se filtra quién está suscrito).
- D3. Validación: formato email válido y largo máximo 254. Error de validación: "Ingresa un correo válido." Cualquier fallo inesperado: "No se pudo completar la suscripción. Intenta de nuevo."
- D4. Texto de éxito honesto: "¡Gracias! Te avisaremos de las novedades y preventas." (se elimina "Revisa tu correo para confirmar").
- D5. Rate limiting / captcha / honeypot: **fuera de alcance** (demo). Anotado como riesgo: un bot puede llenar la tabla.
- D6. No se mueve `NewsletterCard` de `components/shared/` (SETUP.md no lo exige; es presentación sin dominio propio). Solo importa la action desde `@/modules/newsletter/actions/newsletter.actions`.

## Alcance

- Incluye: tabla + migración, schema zod, servicio, Server Action, tests, conexión de `NewsletterCard` (`useActionState`, estado de envío, mensajes accesibles).
- No incluye: envío de correos / proveedor (SES u otro), confirmación double opt-in, baja/unsubscribe, rate limiting, panel de admin para ver suscriptores, exportación.

## Reutilizar

- `Db` y `getDb` (`@/lib/db/client`), patrón de `event.actions.ts` e `InviteUserDialog.tsx` (`useActionState`).
- `Button`, `Input`, `Card` de `components/ui`; `CheckCircle2Icon`/`MailIcon` ya importados.
- `createTestDb` para el test del servicio.

## Archivos

- Modificar: `lib/db/schema.ts` (tabla `newsletterSubscribers`).
- Crear (generado): `drizzle/0006_*.sql` + `drizzle/meta/*` (vía `npx drizzle-kit generate`).
- Crear: `modules/newsletter/schemas/newsletter.schema.ts` (+ `.test.ts`).
- Crear: `modules/newsletter/services/newsletter.service.ts` (+ `.test.ts`), `subscribe(db, email)`.
- Crear: `modules/newsletter/actions/newsletter.actions.ts` (+ `.test.ts`), `subscribeAction(prevState, formData)`.
- Modificar: `components/shared/NewsletterCard.tsx`.

## Criterios de aceptación

- AC1: Suscribirse con un correo válido inserta una fila en `newsletter_subscribers` con el email recortado y en minúsculas, y la UI muestra el mensaje de éxito (D4).
- AC2: Repetir el mismo correo (incluso con distinta capitalización o espacios) no crea otra fila, no lanza error y la UI muestra exactamente el mismo éxito.
- AC3: Correo vacío, sin formato válido o de más de 254 caracteres no inserta nada y devuelve "Ingresa un correo válido."
- AC4: Un fallo de BD devuelve el mensaje genérico de D3 sin exponer detalles internos.
- AC5: Mientras se envía, el botón queda deshabilitado (`pending`); el éxito se anuncia con `role="status"` y el error con `role="alert"`, y el input queda con `aria-invalid` en error y se vacía tras el éxito.
- AC6: El texto ya no promete confirmación por correo.
- AC7: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)

- `newsletter.schema.test.ts`: normaliza (trim + minúsculas); rechaza vacío, sin `@`, >254; acepta 254.
- `newsletter.service.test.ts` (PGlite): inserta normalizado; duplicado no falla ni duplica filas.
- `newsletter.actions.test.ts`: éxito; email inválido -> error y servicio no llamado; servicio lanza -> mensaje genérico (mock de `getDb` y servicio, como `event.actions.test.ts`).
- `NewsletterCard`: sin test (presentacional, SETUP.md 3.2); verificación manual.

## Tareas

### T0 — Tabla y migración
- Archivos: `lib/db/schema.ts`, `drizzle/0006_*.sql`, `drizzle/meta/*`
- Depende de: —
- Paralelizable: no (base de T1)
- Cubre: AC1, AC2 (soporte)

### T1 — Módulo newsletter (schema, servicio, action, tests)
- Archivos: `modules/newsletter/schemas/newsletter.schema.ts` (+ test), `modules/newsletter/services/newsletter.service.ts` (+ test), `modules/newsletter/actions/newsletter.actions.ts` (+ test)
- Depende de: T0
- Paralelizable: no
- Cubre: AC1, AC2, AC3, AC4

### T2 — Conectar NewsletterCard
- Archivos: `components/shared/NewsletterCard.tsx`
- Depende de: T1 (solo necesita la firma `subscribeAction(prev, formData)` y `{ error?, success? }`; puede arrancar en paralelo si se fija esa firma)
- Paralelizable: sí, con T1 una vez fijada la firma
- Cubre: AC5, AC6

## Pendientes humanos

- Aplicar la migración a la BD (local y AWS) con el flujo habitual de drizzle (`drizzle-kit migrate`); verificar la numeración si se mergearon antes las ramas con 0006-0008.
- Probar en el navegador: suscribirse con correo nuevo, repetir el mismo correo (mismo mensaje), correo inválido, y correo con mayúsculas/espacios.
- Tener presente y comunicar: **aún no se envía ningún correo**; la tabla solo acumula direcciones.

## Preguntas abiertas

1. ¿Guardar también el origen (ej. `source = 'landing'`)? Default recomendado: no (YAGNI; solo hay un formulario).
2. ¿Aviso de privacidad/consentimiento junto al formulario? Default recomendado: no en esta fase; revisar antes de enviar el primer correo real.

## Próximas fases

- Proveedor de email (p. ej. AWS SES), double opt-in y enlace de baja.
- Rate limiting / honeypot en la action.
- Vista de suscriptores y exportación para super-admin.
