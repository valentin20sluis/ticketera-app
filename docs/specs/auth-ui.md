# Auth UI

Estado: draft

## Objetivo
Dar a "Ticketera" una pantalla de ingreso/registro (Fase 6) tipo "split screen" según el mockup de referencia, **solo UI/UX**: formularios de login y registro con validación `zod`, toggle de mostrar/ocultar contraseña, y conectar el botón "Iniciar sesión" de `SiteNavbar` (hoy sin destino) a esa pantalla. Es una simulación: no hay autenticación real, no hay backend, no hay sesión persistida entre recargas.

**Decisión de enrutamiento (ruta única, no dos):** una sola ruta `/ingresar` con un `Tabs` que alterna entre "Iniciar sesión" y "Crear cuenta" dentro del mismo panel derecho, en vez de `/ingresar` + `/registro`. El mockup ya describe las dos vistas como pestañas de una misma pantalla (comparten el panel izquierdo con imagen/titular); con dos rutas habría que duplicar ese layout o extraerlo a un layout compartido, y cambiar de pestaña dejaría de ser instantáneo (navegación en vez de estado local). Una sola ruta + estado local (`activeTab`) es más simple (KISS) y es consistente con la decisión ya tomada en `checkout-confirmation.md` de preferir estado de componente sobre rutas nuevas cuando no hay necesidad real de bookmarking.

**Decisión de "envío" del formulario (sin backend):** al enviar un formulario válido (login o registro), `AuthScreen` sustituye el panel derecho por un estado de éxito transitorio (ícono + mensaje tipo "¡Listo! Redirigiendo...") y, tras ~1200 ms, navega a `/` con `router.push("/")`. Se descarta wirear un store global de "sesión mock" (ej. `zustand`, ya instalado pero no usado en la app) que `SiteNavbar` tendría que leer para mostrar un estado "logueado": el requerimiento es explícito en que no hay sesión persistida entre recargas, así que ese estado se perdería igual al refrescar `/`, y wirear un store global solo para una animación de transición toca un archivo compartido (`SiteNavbar.tsx`) y agrega una abstracción (store) sin un uso real hoy (YAGNI). El feedback de éxito + redirect in-memory es la opción más simple que comunica "esto funcionó" sin fingir una sesión que no existe.

**Decisión de layout (navbar/footer visibles):** `/ingresar` se renderiza dentro del `RootLayout` existente (con `SiteNavbar`/`SiteFooter`), igual que el resto de rutas del sitio (incluida la de checkout, que tampoco es full-bleed). No se crea un route group `(auth)` con un layout propio sin navbar/footer: ninguna fase anterior lo ha necesitado, y hacerlo implicaría modificar `app/layout.tsx` (archivo compartido) solo para esta pantalla. El panel split-screen ocupa el alto disponible entre navbar y footer.

## Fuera de alcance
- Autenticación real, hashing de contraseñas, llamadas a ninguna API/backend.
- Persistencia de sesión entre recargas, estado global de "usuario logueado", rutas protegidas/middleware.
- Recuperar contraseña real: el link "¿Olvidaste tu contraseña?" es un botón sin `onClick` (placeholder visual, mismo patrón que los botones placeholder de `checkout-confirmation.md`).
- Social login (Google/Facebook/etc.): el mockup de referencia no lo mostraba explícitamente, no se agrega (YAGNI).
- Cualquier indicio visual de "sesión iniciada" en `SiteNavbar`/`SiteFooter` tras el "login" simulado (ver decisión de envío arriba): no se modifica el botón "Iniciar sesión" para convertirse en un menú de usuario.
- Mostrar/editar el perfil, cerrar sesión, "Mis entradas" (fases futuras).
- Máscaras de input, medidor de fuerza de contraseña, rate limiting, captcha.
- Cambiar `app/layout.tsx` o crear un route group `(auth)` (ver decisión de layout arriba).

## Reutilización
- Existente que se reutiliza: `components/ui/input.tsx`, `components/ui/checkbox.tsx`, `components/ui/tabs.tsx`, `components/ui/button.tsx`, `components/ui/card.tsx` — ya cubren todos los controles necesarios (texto, checkbox, pestañas, botones); no hace falta ningún componente shadcn nuevo (confirmado: `Tabs`/`Input`/`Checkbox` ya existen en `components/ui/`, igual que en fases anteriores).
- Existente que se reutiliza: patrón de hook de formulario de `modules/checkout/hooks/useCheckoutForm.ts` (estado local + `schema.safeParse` + `errors` keyed por `issue.path.join(".")`) — se replica para `useLoginForm`/`useRegisterForm` en vez de inventar un patrón nuevo o sumar una librería de formularios.
- Existente que se reutiliza: patrón `<Button nativeButton={false} render={<Link href="..." />}>` ya usado en `modules/events/components/EventCard.tsx` y `EventTicketSidebar.tsx` — se aplica igual para conectar los botones "Iniciar sesión" de `SiteNavbar`.
- Existente que se reutiliza: tokens de marca `--brand-dark`/`--brand-dark-foreground` ya definidos en `app/globals.css` (Fase 1) — fondo/texto del panel izquierdo oscuro; no se agrega ningún token nuevo.
- Existente que se extiende: `components/shared/SiteNavbar.tsx` — los dos botones "Iniciar sesión" (desktop y el del `SheetFooter` mobile) ganan `render={<Link href="/ingresar" />}`; ningún otro botón ni comportamiento del componente cambia.
- Nuevo (y por qué no sirve nada existente):
  - `modules/auth/` (no existe el dominio todavía): login/registro es un dominio de negocio distinto de `events`/`checkout` (SETUP.md 1.1).
  - `modules/auth/schemas/auth.schema.ts`: no existe ninguna validación de login/registro; se usa `zod` (ya instalado, con precedente de estilo en `checkout.schema.ts`) en vez de validación manual por las mismas razones que esa spec documentó (reglas declarativas y testeables, ej. `confirmPassword === password`).
  - `modules/auth/types/auth.types.ts`, `modules/auth/hooks/useLoginForm.ts`, `modules/auth/hooks/useRegisterForm.ts`: no existe ningún tipo ni hook de formulario de auth.
  - `modules/auth/components/PasswordInput.tsx`: no existe ningún input con toggle de mostrar/ocultar contraseña en el proyecto.
  - `modules/auth/components/LoginForm.tsx`, `RegisterForm.tsx`, `AuthScreen.tsx`: no existe ninguna pantalla de auth.
  - `app/ingresar/page.tsx`: no existe la ruta.
  - Imagen de fondo del panel izquierdo: se usa una URL nueva `https://picsum.photos/seed/ticketera-ingresar/1200/1600` (mismo proveedor `picsum.photos` ya usado en `modules/events/data/events.mock.ts`, con `next/image unoptimized` igual que el resto del proyecto — ver "Fuera de alcance" de `landing-design-foundation.md` sobre no tocar `next.config.ts`). No se reutiliza una URL de `events.mock.ts` para no crear una dependencia cruzada de `modules/auth` hacia `modules/events` solo por una imagen decorativa.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno. Íconos `EyeIcon`/`EyeOffIcon`/`CheckCircleIcon` ya disponibles en `lucide-react` (dependencia ya instalada, confirmado en `node_modules`).

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con la pantalla de auth integrada.
- AC-2: `npx vitest run` pasa para todos los archivos de test nuevos (`auth.schema.test.ts`, `useLoginForm.test.ts`, `useRegisterForm.test.ts`) y para todos los ya existentes, sin modificarlos.
- AC-3: `modules/auth/types/auth.types.ts` define `LoginFormValues` (`email: string`, `password: string`), `RegisterFormFields` (`fullName`, `email`, `password`, `confirmPassword`, todos `string`) y `RegisterFormValues` (`RegisterFormFields & { termsAccepted: boolean }`).
- AC-4: `modules/auth/schemas/auth.schema.ts` exporta `loginFormSchema` (`email` válido vía `z.email("Ingresa un correo válido")`, `password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres")`) y `registerFormSchema` (`fullName: z.string().trim().min(3, "Ingresa tu nombre completo")`, `email` igual que login, `password` igual que login, `confirmPassword: z.string().min(8, ...)`, `termsAccepted: z.literal(true)`, envuelto en un `.refine((data) => data.password === data.confirmPassword, { message: "Las contraseñas no coinciden", path: ["confirmPassword"] })`) — verificado en `auth.schema.test.ts` con: login válido (éxito), login con email inválido (falla), login con password de 7 caracteres (falla), registro válido (éxito), registro con `confirmPassword` distinto de `password` (falla con error en el path `confirmPassword`), registro con `termsAccepted: false` (falla).
- AC-5: `useLoginForm()` en `modules/auth/hooks/useLoginForm.ts` devuelve `values: { email: "", password: "" }` y `errors: {}` en su estado inicial; `updateField(field, value)` actualiza solo el campo indicado de `values`; `validate(): boolean` llama `loginFormSchema.safeParse(values)`, si es válido pone `errors: {}` y devuelve `true`, si no, llena `errors` con una entrada por `issue.path.join(".")` y devuelve `false`; `reset()` vuelve `values`/`errors` al estado inicial — verificado en `useLoginForm.test.ts` con `act`/`renderHook` (casos: estado inicial, `updateField` aislado, `validate` true con datos válidos, `validate` false con email inválido reportando `errors.email`, `validate` false con password corta reportando `errors.password`, `reset` restaura el estado inicial tras haber escrito datos).
- AC-6: `useRegisterForm()` en `modules/auth/hooks/useRegisterForm.ts` devuelve `fields: { fullName: "", email: "", password: "", confirmPassword: "" }`, `termsAccepted: false`, `errors: {}` en su estado inicial; `updateField(field, value)` actualiza solo el campo indicado de `fields` sin tocar `termsAccepted`; `setTermsAccepted(accepted)` cambia `termsAccepted` sin tocar `fields`; `validate(): boolean` construye el payload `{ ...fields, termsAccepted }`, lo pasa a `registerFormSchema.safeParse`, llena `errors` igual que `useLoginForm` y devuelve `boolean`; `reset()` vuelve al estado inicial — verificado en `useRegisterForm.test.ts` (casos: estado inicial, `updateField` aislado, `setTermsAccepted` aislado, `validate` true con todo válido, `validate` false con `confirmPassword` distinto reportando `errors.confirmPassword`, `validate` false con `termsAccepted: false` reportando `errors.termsAccepted`, `reset` restaura el estado inicial).
- AC-7: `PasswordInput({ id, value, onChange, placeholder })` en `modules/auth/components/PasswordInput.tsx` renderiza un `Input` (de `components/ui/input.tsx`) con `type="password"` por defecto y un botón de ícono absoluto dentro del mismo contenedor relativo; un estado local `visible` (`useState`, sin exponerse como prop) alterna, al hacer click: `type` del `Input` entre `"password"`/`"text"`, el ícono entre `EyeIcon`/`EyeOffIcon` (`lucide-react`), y el `aria-label` del botón entre `"Mostrar contraseña"`/`"Ocultar contraseña"` — verificable leyendo el código; no requiere test (SETUP.md 3.2: componente presentacional, el toggle es estado de UI trivial, no lógica de negocio).
- AC-8: `LoginForm` en `modules/auth/components/LoginForm.tsx` recibe `{ values: LoginFormValues, errors: Partial<Record<string, string>>, isSubmitting: boolean, onChange: (field: keyof LoginFormValues, value: string) => void, onSubmit: (event: FormEvent<HTMLFormElement>) => void, onSwitchToRegister: () => void }` y renderiza, en este orden: título "Hola de nuevo", subtítulo ("Ingresa con tu correo y contraseña para seguir comprando." o equivalente), un `<form onSubmit={onSubmit}>` con campo correo (`Input type="email"`), campo contraseña (`PasswordInput`), un `<button type="button">¿Olvidaste tu contraseña?</button>` sin `onClick` (placeholder), un botón submit "Iniciar sesión" (`disabled={isSubmitting}`), y un control "¿No tienes cuenta? Crea una gratis" que al hacer click invoca `onSwitchToRegister` (sin navegar, sin `href`); muestra `errors.email`/`errors.password` debajo de cada campo cuando existen.
- AC-9: `RegisterForm` en `modules/auth/components/RegisterForm.tsx` recibe `{ fields: RegisterFormFields, termsAccepted: boolean, errors: Partial<Record<string, string>>, isSubmitting: boolean, onFieldChange: (field: keyof RegisterFormFields, value: string) => void, onTermsChange: (accepted: boolean) => void, onSubmit: (event: FormEvent<HTMLFormElement>) => void, onSwitchToLogin: () => void }` y renderiza, en este orden: título "Crea tu cuenta" (o equivalente), subtítulo, un `<form onSubmit={onSubmit}>` con campo nombre completo, campo correo, campo contraseña (`PasswordInput`), campo confirmar contraseña (`PasswordInput`), un `Checkbox` con label "Acepto los términos y condiciones" (mismo texto que `PaymentMethodSection.tsx`) controlado por `termsAccepted`/`onTermsChange`, un botón submit "Crear cuenta" (`disabled={isSubmitting}`), y un control "¿Ya tienes cuenta? Inicia sesión" que invoca `onSwitchToLogin`; muestra `errors.fullName`/`errors.email`/`errors.password`/`errors.confirmPassword`/`errors.termsAccepted` cuando existen.
- AC-10: `AuthScreen` en `modules/auth/components/AuthScreen.tsx` es un Client Component (`"use client"`) que llama `useLoginForm()` y `useRegisterForm()` una sola vez cada uno, mantiene `activeTab: "login" | "register"` (inicial `"login"`) y `status: "idle" | "success"` (inicial `"idle"`) en estado; renderiza un layout de 2 columnas (`grid md:grid-cols-2` o equivalente): panel izquierdo (`hidden md:flex`, oculto por debajo de `md`) con una imagen de fondo (`next/image`, `fill`, `unoptimized`, `src="https://picsum.photos/seed/ticketera-ingresar/1200/1600"`) cubierta por un velo `bg-brand-dark/85` (o equivalente), el wordmark "Ticketera" (ícono + texto, mismo lockup que `SiteNavbar`), el titular "Tus entradas, siempre a mano." y el subtítulo "Compra en minutos y lleva tu QR en el celular." en `text-brand-dark-foreground`; panel derecho con `Tabs value={activeTab} onValueChange={...}` (`TabsList` con `TabsTrigger` "Iniciar sesión"/"Crear cuenta") cuyo `TabsContent` de cada pestaña renderiza `LoginForm`/`RegisterForm` respectivamente cuando `status === "idle"`.
- AC-11: Al enviar cualquiera de los dos formularios, el handler correspondiente en `AuthScreen` llama primero `event.preventDefault()` y luego `validate()` del hook; si devuelve `false`, `status` permanece `"idle"` y no pasa nada más (los `errors` del hook ya quedan visibles vía los props de AC-8/AC-9); si devuelve `true`, pone `status: "success"`. Cuando `status === "success"`, el panel derecho (reemplazando `Tabs`) muestra un ícono de éxito (`CheckCircleIcon`) + un mensaje (ej. "¡Listo! Redirigiendo..."). Un `useEffect` que depende de `status` dispara, solo cuando `status === "success"`, un `setTimeout` de ~1200 ms que llama `useRouter().push("/")`, y limpia el timeout (`clearTimeout`) en su función de cleanup. No se crea ningún store ni se persiste ningún dato (ver Objetivo).
- AC-12: `app/ingresar/page.tsx` es un Server Component que solo renderiza `<AuthScreen />` y exporta `export const metadata: Metadata = { title: "Iniciar sesión | Ticketera" }` (o similar); no contiene fetching ni lógica propia.
- AC-13: En `components/shared/SiteNavbar.tsx`, los dos botones de texto "Iniciar sesión" (el `<Button variant="ghost">` del nav desktop y el `<Button variant="outline" className="w-full">` del `SheetFooter` mobile) pasan a tener `nativeButton={false}` y `render={<Link href="/ingresar" />}` (mismo patrón que `EventCard.tsx`), de modo que al hacer click naveguen a `/ingresar`; ningún otro botón, link o comportamiento del archivo cambia.

## Tareas
### T1 — Schema y tipos de auth
- Archivos: `modules/auth/schemas/auth.schema.ts` (crear), `modules/auth/schemas/auth.schema.test.ts` (crear), `modules/auth/types/auth.types.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4
- Tests: `modules/auth/schemas/auth.schema.test.ts` — casos descritos en AC-4
- [ ] Completada

### T2 — PasswordInput
- Archivos: `modules/auth/components/PasswordInput.tsx` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-7
- Tests: no aplica (componente presentacional, toggle de UI trivial sin lógica de negocio — SETUP.md 3.2)
- [ ] Completada

### T3 — Conectar botón "Iniciar sesión" de SiteNavbar
- Archivos: `components/shared/SiteNavbar.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-13
- Tests: no aplica (componente presentacional, SETUP.md 3.2)
- [ ] Completada

### T4 — Hooks useLoginForm / useRegisterForm
- Archivos: `modules/auth/hooks/useLoginForm.ts` (crear), `modules/auth/hooks/useLoginForm.test.ts` (crear), `modules/auth/hooks/useRegisterForm.ts` (crear), `modules/auth/hooks/useRegisterForm.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5, AC-6
- Tests: `useLoginForm.test.ts`, `useRegisterForm.test.ts` — casos descritos en AC-5/AC-6
- [ ] Completada

### T5 — LoginForm y RegisterForm
- Archivos: `modules/auth/components/LoginForm.tsx` (crear), `modules/auth/components/RegisterForm.tsx` (crear)
- Depende de: T2, T4
- Grupo paralelo: G3
- Cubre: AC-8, AC-9
- Tests: no aplica (componentes presentacionales que reciben valores/errores por props, SETUP.md 3.2)
- [ ] Completada

### T6 — AuthScreen y ruta /ingresar
- Archivos: `modules/auth/components/AuthScreen.tsx` (crear), `app/ingresar/page.tsx` (crear)
- Depende de: T5
- Grupo paralelo: G4
- Cubre: AC-10, AC-11, AC-12
- Tests: no aplica (orquestador de UI y página de composición, SETUP.md 3.2; el flujo de éxito+redirect se valida por lectura de código según AC-11, igual que `CheckoutFlow` en `checkout-confirmation.md`)
- [ ] Completada

## Fases siguientes
- Fase 7: ruta `/mis-entradas` (hoy placeholder sin destino en el paso de confirmación del checkout).
