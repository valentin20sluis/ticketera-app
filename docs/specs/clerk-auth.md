# Clerk Auth

Estado: approved

## Objetivo

Reemplazar la autenticación simulada (localStorage) de `/ingresar` por autenticación
real con **Clerk** (email/password), tal como define `docs/superpowers/specs/2026-09-30-ticketing-system-design.md`
("Autenticación (Clerk)"). Mantiene el layout visual existente de `LoginForm`/`RegisterForm`
(decisión ya tomada en `docs/specs/auth-ui.md`) y solo cambia qué pasa al enviar el
formulario y de dónde viene el estado de sesión.

La app ya está vinculada al Clerk app `app_3KEYu5chHz8cgilbHTFOkXzOplV` (`clerk link`)
y las keys ya están en `.env` (`clerk env pull`). Esta spec cubre el código, no el
provisioning de Clerk.

## Fuera de alcance

- **Login con Google**: el system design lo pide ("email/password + Google"), pero
  requiere configurar el proveedor OAuth en el dashboard de Clerk (paso manual, no
  código) y no bloquea que el login con email/password funcione. Va en "Fases
  siguientes".
- **Sincronización a la tabla `users` propia vía webhook** (`app/api/webhooks/clerk/route.ts`,
  `user.created`/`updated`/`deleted`): la tabla `users` ya existe en `lib/db/schema.ts`
  con `clerk_user_id`, pero conectar el webhook es un dominio separado (backend,
  sin UI) — Fase 2.
- **Resolución de `role` y protección de rutas por rol** (`organizer`/`admin`/`customer`):
  sin la sincronización de la Fase 2, no hay `role` real que consultar todavía. Esta
  spec solo protege por "¿hay sesión o no?" (optimistic check), no por rol.
- **Páginas `/mis-entradas` y `/organizador` con datos reales**: siguen usando sus
  mocks (`MOCK_TICKET_ORDERS`, `CURRENT_ORGANIZER`); solo se agrega el *gate* de
  sesión delante de ellas, no se tocan sus datos.
- **Tema shadcn de `@clerk/ui`**: solo aplica si se usan componentes prediseñados de
  Clerk (`<UserButton>`, `<SignIn>`, etc.). Esta spec reutiliza el UI propio
  (`LoginForm`/`RegisterForm`/`AuthNavSection`) vía hooks (`useSignIn`/`useSignUp`/
  `useUser`), así que no aplica — se agrega si en el futuro se usa un componente
  de Clerk directamente.
- **"¿Olvidaste tu contraseña?"**: sigue siendo un botón placeholder (ya fuera de
  alcance en `auth-ui.md`); Clerk soporta reset de password pero no se pide ahora.

## Reutilización

- Existente que se reutiliza: `modules/auth/components/LoginForm.tsx`,
  `RegisterForm.tsx`, `PasswordInput.tsx`, `modules/auth/schemas/auth.schema.ts`
  (validación de formato antes de llamar a Clerk) — sin cambios de props/forma.
- Existente que se extiende:
  - `modules/auth/components/AuthScreen.tsx`: los handlers de submit llaman a
    Clerk (`useSignIn`/`useSignUp`) en vez de `writeStoredAuthSession`; se agrega
    un paso de verificación por código (Clerk exige verificar el email antes de
    crear la sesión en un signup nuevo).
  - `modules/auth/hooks/useLoginForm.ts` / `useRegisterForm.ts`: mismo
    `validate()`/`errors`, se agrega mapeo de errores que devuelve Clerk
    (ej. "contraseña incorrecta", "email ya registrado") a los mismos campos
    `errors.email`/`errors.password`.
  - `modules/auth/hooks/useAuthSession.ts`: en vez de leer `localStorage` con un
    `useEffect` keyed en `pathname` (truco necesario porque `localStorage` no es
    reactivo), envuelve `useUser()`/`useClerk()` de Clerk, que ya son reactivos —
    se elimina esa sincronización manual (simplificación, no solo swap 1:1).
  - `modules/auth/components/AuthNavSection.tsx`: sin cambios de props (sigue
    recibiendo `session`/`logout` del mismo hook); el `displayName`/`initials` ya
    funcionan igual porque `AuthSession` mantiene su forma actual.
  - `app/layout.tsx`: se agrega `<ClerkProvider>` dentro de `<body>` (regla de
    Clerk — no puede envolver `<html>`).
- Nuevo (y por qué no sirve nada existente):
  - `proxy.ts` (raíz del repo): Next.js 16 renombró `middleware.ts` a `proxy.ts`
    (export `proxy`, no `middleware`) — ver `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
    No existe ningún archivo de proxy/middleware hoy.
  - `AuthSession` (en `auth.types.ts`) deja de tener una fuente "mock" propia; su
    forma (`email`, `fullName`) no cambia, solo quién la llena.
- Se elimina (dead code tras el swap):
  - `modules/auth/utils/auth-session-storage.ts` y su test: ya no hay sesión en
    `localStorage`, Clerk la gestiona (cookie de sesión).
- Dependencias a instalar antes de implementar: `@clerk/nextjs` (único paquete
  nuevo; `@clerk/ui` NO se instala — ver "Fuera de alcance" sobre el tema shadcn).

## Criterios de aceptación

- AC-1: `ClerkProvider` envuelve la app (`app/layout.tsx`, dentro de `<body>`); con
  las keys ya en `.env`, `npm run dev` arranca sin errores de Clerk.
- AC-2: En `/ingresar`, enviar el tab "Iniciar sesión" con un email/password válidos
  de un usuario ya existente en el Clerk app crea una sesión real (verificable:
  tras el submit, `useUser()` en cualquier parte de la app refleja ese usuario sin
  recargar la página).
- AC-3: Un login con password incorrecto muestra el error de Clerk bajo el campo
  `password` (mismo lugar donde hoy se muestran los errores de `zod`), sin romper
  el formulario.
- AC-4: En el tab "Crear cuenta", enviar datos válidos crea el `signUp` en Clerk,
  pide el código de verificación por email (nuevo paso de UI dentro de
  `AuthScreen`), y al ingresar el código correcto activa la sesión y muestra el
  mismo estado de éxito ("¡Listo! Redirigiendo...") que ya existe.
- AC-5: `AuthNavSection` (desktop y mobile) muestra nombre/email e iniciales del
  usuario real de Clerk tras login, y "Cerrar sesión" invoca `signOut()` de Clerk
  (no queda ningún rastro de sesión tras el logout).
- AC-6: Visitar `/mis-entradas` o `/organizador` sin sesión redirige a `/ingresar`
  (`proxy.ts`); con sesión, carga la página normalmente (con sus mocks, sin cambios).
- AC-7: `npm run build` pasa (type-check) y `npm run test` pasa sin los tests
  eliminados de `auth-session-storage`.

## Tareas

### T1 — Instalar Clerk y envolver la app

- Archivos: `package.json` (modificar), `package-lock.json` (modificar, generado
  por `npm install`), `app/layout.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-1
- Tests: no aplica (composición de providers, sin lógica propia — SETUP.md 3.2)
- [x] Completada

### T2 — `proxy.ts`: proteger rutas privadas

- Archivos: `proxy.ts` (crear)
- Depende de: ninguna (usa `clerkMiddleware`/`createRouteMatcher` de `@clerk/nextjs/server`,
  no requiere que T1 esté mergeado para escribirse, pero sí para probarse en runtime)
- Grupo paralelo: G1
- Cubre: AC-6
- Tests: no aplica (config de framework, sin lógica propia verificable fuera de
  Next.js corriendo)
- [x] Completada

### T3 — Sesión real en `useAuthSession`, eliminar storage mock

- Archivos: `modules/auth/hooks/useAuthSession.ts` (modificar),
  `modules/auth/utils/auth-session-storage.ts` (eliminar),
  `modules/auth/utils/auth-session-storage.test.ts` (eliminar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5
- Tests: no aplica — el hook pasa a ser un wrapper directo de `useUser()`/`useClerk()`
  del SDK de Clerk, sin lógica propia verificable sin mockear el SDK completo
  (SETUP.md 3.2, "hooks con lógica no trivial"; este no la tiene).
- [x] Completada

### T4 — Login/registro reales contra Clerk

- Archivos: `modules/auth/components/AuthScreen.tsx` (modificar),
  `modules/auth/hooks/useLoginForm.ts` (modificar),
  `modules/auth/hooks/useRegisterForm.ts` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-2, AC-3, AC-4
- Tests: `useLoginForm.test.ts` / `useRegisterForm.test.ts` ya existen y cubren
  `validate()` — se extienden solo si el mapeo de errores de Clerk vive en el hook
  (a decidir en implementación; si vive en `AuthScreen` como composición, no
  aplica test nuevo ahí por SETUP.md 3.2).
- [x] Completada

## Corrección (post-implementación)

El usuario pidió explícitamente los componentes prediseñados de Clerk
(`<SignIn/>`/`<SignUp/>`, con su marca "Secured by Clerk" y su flujo nativo de
"¿Olvidaste tu contraseña?") en vez del UI propio con hooks. Esto reemplaza la
decisión original de "Fuera de alcance" sobre el tema shadcn y reutilizar
`LoginForm`/`RegisterForm`:

- Se eliminaron `LoginForm.tsx`, `RegisterForm.tsx`, `PasswordInput.tsx`,
  `useLoginForm.ts`, `useRegisterForm.ts`, `auth.schema.ts` y sus tests (dead
  code: Clerk valida y renderiza todo internamente).
- `AuthScreen.tsx` ahora solo mantiene el panel de imagen + `Tabs` del diseño
  original (`auth-ui.md`) y monta `<SignIn routing="hash" />` /
  `<SignUp routing="hash" />` dentro de cada tab — `routing="hash"` mantiene
  todo en la misma ruta `/ingresar` sin necesitar archivos de ruta nuevos
  (la versión instalada no soporta `routing="virtual"` en el componente
  público, solo `'path' | 'hash'`).
- Se instaló `@clerk/ui` y se aplicó el tema `shadcn` (global, vía
  `ClerkProvider appearance` + `@import '@clerk/ui/themes/shadcn.css'` en
  `globals.css`), siguiendo la regla de `clerk-custom-ui` de usar ese tema
  cuando existe `components.json`.
- "¿Olvidaste tu contraseña?" ahora funciona de verdad (flujo nativo de
  Clerk), resolviendo el placeholder documentado como fuera de alcance en
  `auth-ui.md`.

## Notas de implementación

- La versión instalada (`@clerk/nextjs@7.9.10`, `@clerk/react@6.17.5`) usa la API
  "Future" basada en signals (`signIn.password()`, `signUp.password()`,
  `.finalize()`, `errors.fields`), distinta de la API clásica (`signIn.create()` +
  `setActive()`) que documentan la mayoría de guías de Clerk. `AuthScreen.tsx`
  está escrito contra esta API nueva.
- `proxy.ts` usa `createRouteMatcher`, que Clerk marca como deprecado en esta
  versión (recomienda mover el check a `auth.protect()` dentro de cada página/
  Server Action en vez de matchear por path). Se mantiene por ahora porque es
  consistente con el enfoque de "gate por sesión" de esta spec; migrar a checks
  por recurso es natural cuando se haga la Fase 4 (proteger por `role` real).

## Fases siguientes

- Fase 2: Login con Google (botón OAuth en `LoginForm`, requiere habilitar el
  proveedor en el dashboard de Clerk).
- Fase 3: Webhook `app/api/webhooks/clerk/route.ts` para sincronizar `users`
  (`clerk_user_id`, `role`) — necesario antes de poder resolver roles reales.
- Fase 4: Proteger `/organizador/*` por `role` real (hoy solo exige sesión),
  migrar de `createRouteMatcher` en `proxy.ts` a `auth.protect()` por recurso, y
  conectar `/mis-entradas`/`/organizador` a datos reales en vez de mocks.
