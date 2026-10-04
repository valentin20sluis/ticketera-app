# Persistencia de sesión mock de auth

Estado: draft

## Objetivo
Hoy, tras un login/registro simulado en `/ingresar`, `AuthScreen` muestra un estado de éxito transitorio y redirige a `/`, pero no persiste nada: el navbar sigue mostrando "Iniciar sesión" aunque el usuario "inició sesión" segundos antes. Esta spec agrega una sesión mock persistida en `localStorage` (mismo patrón ya validado en `organizer-panel.md` para el catálogo del organizador) para que, tras un login/registro exitoso, `SiteNavbar` refleje "sesión iniciada" (nombre o correo + botón "Cerrar sesión") y ese estado sobreviva a recargas de página, hasta que el usuario cierre sesión explícitamente.

## Fuera de alcance
- Autenticación real o validación de credenciales contra cualquier backend: `useLoginForm`/`useRegisterForm` siguen validando solo formato con `zod`, sin tocarse (no se modifican sus archivos ni sus schemas).
- Rutas protegidas / redirección a `/ingresar` si no hay sesión: ninguna ruta existente (`/mis-entradas`, `/organizador`, etc.) agrega un guard de este tipo.
- Expiración de la sesión (TTL, refresh token): la sesión guardada dura hasta logout manual o hasta que el usuario borre los datos del navegador.
- Sincronización entre pestañas abiertas simultáneamente vía evento `storage`: fuera de alcance (YAGNI para una demo). Nota: esto es distinto de la sincronización dentro de la misma pestaña entre instancias de `AuthNavSection` (desktop/mobile), que sí se resuelve — ver AC-5 y la nota de limitación aceptada ahí.
- Cambiar el comportamiento de los botones "Vender entradas"/organizador según haya sesión de auth: siguen siempre visibles y apuntando a `/organizador`, sin relación con la sesión de `modules/auth` (dominios distintos, cada uno con su propio "usuario actual" mock, no se fusionan).
- Cualquier cambio a `useLoginForm`, `useRegisterForm`, `LoginForm`, `RegisterForm`, o `modules/auth/schemas/auth.schema.ts`: se reutilizan tal cual.
- Avatar o imagen de perfil: el estado logueado del navbar es solo texto (nombre o correo), sin imagen.
- Dropdown/menú de usuario: se muestra texto + un botón "Cerrar sesión" en línea, sin menú desplegable (YAGNI, ver Reutilización/AC-5).
- Inventar un nombre para la sesión de login: el formulario de login no captura `fullName`, así que la sesión creada desde login siempre tiene `fullName: null`; no se simula ni se pide un nombre.

## Reutilización
- Existente que se reutiliza:
  - Patrón storage + hook de `modules/organizer/utils/organizer-catalog-storage.ts` + `modules/organizer/hooks/useOrganizerCatalog.ts` (funciones `readX`/`writeX` con guard `typeof window === "undefined"` y `try/catch`; hook que inicializa su estado en un valor seguro para SSR y lee `localStorage` solo dentro de un `useEffect` post-montaje) — se replica para la sesión de auth en vez de inventar un patrón nuevo.
  - `modules/auth/components/AuthScreen.tsx`, `modules/auth/hooks/useLoginForm.ts`, `modules/auth/hooks/useRegisterForm.ts`, `modules/auth/types/auth.types.ts` (ya existen de la Fase 6) — se extienden/consumen, no se duplican.
  - `components/ui/button.tsx` (`Button`, patrón `nativeButton={false} render={<Link href="..." />}` ya usado en `SiteNavbar.tsx`) — se reutiliza para el botón "Iniciar sesión" condicional y para "Cerrar sesión" (este último es un botón de acción normal, sin `render`).
  - `next/navigation` (`usePathname`, ya disponible en la versión de Next instalada, mismo paquete que `useRouter` ya usado en `AuthScreen.tsx`) — se usa dentro de `useAuthSession` para resolver un problema real: `app/layout.tsx` (y por lo tanto `SiteNavbar`) no se remonta entre navegaciones del App Router, así que una instancia de `AuthNavSection` montada antes del login no se enteraría de una sesión escrita en `/ingresar` y luego redirigida a `/` si solo leyera `localStorage` una vez al montar. Se lee de nuevo en el `useEffect` cada vez que `pathname` cambia (incluida la navegación que dispara `AuthScreen` tras un login/registro exitoso), sin necesitar un store global ni un evento custom.
- Existente que se extiende:
  - `modules/auth/types/auth.types.ts` — gana el tipo `AuthSession`.
  - `modules/auth/components/AuthScreen.tsx` — los dos handlers de envío ganan un paso de persistencia antes de `setStatus("success")`.
  - `components/shared/SiteNavbar.tsx` — los dos bloques "Iniciar sesión" (desktop y `SheetFooter` mobile) se reemplazan por `<AuthNavSection variant="..." />`; ningún otro link/botón/comportamiento del archivo cambia.
- Nuevo (y por qué no sirve nada existente):
  - `modules/auth/utils/auth-session-storage.ts`: no existe ninguna utilidad de persistencia de sesión; vive en `modules/auth/` (no en `modules/organizer/` ni en `lib/`) porque la sesión es un concepto del dominio `auth`, igual que el catálogo del organizador vive en `modules/organizer/` (SETUP.md 1.1).
  - `modules/auth/hooks/useAuthSession.ts`: no existe ningún hook que lea/escriba esa sesión.
  - `modules/auth/components/AuthNavSection.tsx`: no existe ningún componente cliente aislado para la porción de auth del navbar.
- Dependencias / componentes shadcn a instalar antes de implementar: ninguno.
- **Recordatorios de arquitectura obligatorios para el developer** (reglas recurrentes del proyecto):
  - Nunca convertir un Server Component entero en Client Component cuando se puede aislar la porción interactiva: `SiteNavbar.tsx` NO gana `"use client"`; solo `AuthNavSection.tsx` (nuevo, aislado) lo es. El resto de `SiteNavbar` (logo, `nav` de links, botón "Vender entradas") sigue siendo Server Component, sin cambios de comportamiento.
  - Toda lectura/escritura de `localStorage` va detrás de un guard `typeof window === "undefined"`, con `try/catch` alrededor de `JSON.parse`/`JSON.stringify`, igual que `organizer-catalog-storage.ts`.
  - Hidratación segura: `useAuthSession` inicializa `session` en `null` (coincide con lo que el servidor renderiza: "sin sesión"), y solo lo actualiza a un valor leído de `localStorage` dentro de un `useEffect` post-montaje — nunca durante el render inicial. Esto implica la misma limitación ya aceptada en `organizer-panel.md` (AC-10): por una fracción de segundo tras cargar la página, el navbar muestra "Iniciar sesión" aunque haya sesión guardada, y luego cambia.

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con los cambios integrados.
- AC-2: `npx vitest run` pasa para `auth-session-storage.test.ts` (nuevo) y para todos los archivos de test ya existentes, sin modificarlos.
- AC-3: `modules/auth/types/auth.types.ts` exporta, además de los tipos ya existentes (`LoginFormValues`, `RegisterFormFields`, `RegisterFormValues`, sin cambios), `AuthSession` con la forma `{ email: string, fullName: string | null }`.
- AC-4: `modules/auth/utils/auth-session-storage.ts` exporta `readStoredAuthSession(): AuthSession | null`, `writeStoredAuthSession(session: AuthSession): void` y `clearStoredAuthSession(): void`, bajo la clave `"ticketera:auth-session"` en `localStorage`. Las tres funciones devuelven/no hacen nada (respectivamente) sin lanzar cuando `typeof window === "undefined"`. `readStoredAuthSession` devuelve `null` (sin lanzar) cuando no hay nada guardado o cuando el valor guardado no es JSON válido. `writeStoredAuthSession` sobrescribe cualquier valor previo bajo la misma clave (un solo usuario de sesión por navegador, sin multi-cuenta). `clearStoredAuthSession` elimina la clave, de modo que una lectura posterior devuelve `null` — verificado en `auth-session-storage.test.ts` con: nada guardado (`null`), valor corrupto no-JSON guardado directamente vía `localStorage.setItem` (`null`, sin excepción), round-trip `writeStoredAuthSession` + `readStoredAuthSession` devuelve la misma sesión, una segunda escritura con datos distintos sobrescribe la primera (la lectura devuelve la última), y `clearStoredAuthSession` tras una escritura hace que la siguiente lectura devuelva `null`.
- AC-5: `useAuthSession()` en `modules/auth/hooks/useAuthSession.ts` es un hook `"use client"` que llama `usePathname()` (de `next/navigation`) e inicializa su estado `session` en `null` (sin leer `localStorage` durante el render inicial, para que el primer render en cliente coincida con el del servidor). Un `useEffect` con `[pathname]` como dependencia llama `readStoredAuthSession()` y actualiza `session` con el resultado cada vez que `pathname` cambia (incluida la primera vez, tras montar) — esto es lo que permite que una instancia de `AuthNavSection` montada antes de un login se entere de la sesión escrita en `/ingresar` apenas el `router.push` redirigido por `AuthScreen` cambia la ruta, sin depender de un store global. Expone `logout(): void` que llama `clearStoredAuthSession()` y pone `session` en `null` de inmediato en esa instancia (sin esperar un cambio de ruta) — no navega a ningún lado, el usuario permanece en la página donde hizo click (YAGNI, ver Fuera de alcance). Verificable leyendo el código; sin test propio (orquesta `useState`/`useEffect` sobre las funciones puras ya testeadas en T1, mismo criterio que `useOrganizerCatalog` en `organizer-panel.md` AC-10, SETUP.md 3.2). **Limitación aceptada y documentada** (consistente con no sincronizar entre pestañas): como `AuthNavSection` se monta dos veces simultáneamente (desktop y mobile, ver AC-6), si el usuario cierra sesión desde una instancia, la otra instancia no se actualiza hasta el próximo cambio de `pathname` (en la práctica, el contenido del `Sheet` mobile solo se monta mientras el menú está abierto, así que siempre lee el valor vigente al abrirse; la instancia desktop queda desactualizada solo si el logout ocurrió desde el `Sheet` y el usuario no navega después, caso raro en una demo).
- AC-6: `AuthNavSection({ variant }: { variant: "desktop" | "mobile" })` en `modules/auth/components/AuthNavSection.tsx` es un Client Component (`"use client"`) que llama `useAuthSession()` una sola vez. Cuando `session` es `null`, renderiza un único `Button` con texto "Iniciar sesión", `nativeButton={false}`, `render={<Link href="/ingresar" />}`, y estilo equivalente al botón que reemplaza según `variant` (`variant="desktop"` → `variant="ghost"` del `Button`, sin `className` adicional; `variant="mobile"` → `variant="outline"` del `Button` + `className="w-full"`) — visualmente idéntico a los dos botones "Iniciar sesión" que existían antes de esta spec.
- AC-7: Cuando `session` no es `null`, `AuthNavSection` renderiza, en vez del botón "Iniciar sesión": un texto con `session.fullName ?? session.email` (nunca un nombre inventado) y, junto a él, un `Button` de texto "Cerrar sesión" con el mismo `variant`/`className` por `variant` que en AC-6 (sin `render`/`nativeButton`, es un botón de acción normal con `onClick`). Sin dropdown ni menú desplegable (ver Fuera de alcance).
- AC-8: El botón "Cerrar sesión" de `AuthNavSection` tiene `onClick={logout}` (la función devuelta por `useAuthSession`). Al hacer click: la sesión se borra de `localStorage` (vía `clearStoredAuthSession` dentro de `logout`) y esa misma instancia de `AuthNavSection` vuelve a mostrar el estado de AC-6 ("Iniciar sesión") sin recargar la página (gracias a `setSession(null)` dentro de `logout`); no se dispara ninguna navegación ni `router.push`.
- AC-9: En `components/shared/SiteNavbar.tsx`: el archivo sigue sin `"use client"` (sigue siendo Server Component). El bloque desktop (`<div className="hidden items-center gap-3 md:flex">`) reemplaza su primer `Button` ("Iniciar sesión") por `<AuthNavSection variant="desktop" />`; el `Button` "Vender entradas" de ese mismo bloque no cambia. El `SheetFooter` reemplaza su primer `Button` ("Iniciar sesión") por `<AuthNavSection variant="mobile" />`; su segundo `Button` ("Vender entradas") no cambia. Ningún otro link, botón o comportamiento del archivo (logo, `NAV_LINKS`, `Sheet*`) cambia.
- AC-10: En `modules/auth/components/AuthScreen.tsx`, cuando `handleLoginSubmit` llama `loginForm.validate()` y devuelve `true`, antes de `setStatus("success")` se llama `writeStoredAuthSession({ email: loginForm.values.email, fullName: null })` (import de `modules/auth/utils/auth-session-storage.ts`); cuando `handleRegisterSubmit` llama `registerForm.validate()` y devuelve `true`, antes de `setStatus("success")` se llama `writeStoredAuthSession({ email: registerForm.fields.email, fullName: registerForm.fields.fullName.trim() })`. En ambos casos la escritura es síncrona y ocurre estrictamente antes de que cualquier redirect se dispare (el `useEffect`/`setTimeout` existente que llama `router.push("/")` sigue corriendo únicamente cuando `status === "success"`, es decir, después de que la sesión ya quedó persistida — mismo orden ya exigido en `organizer-panel.md` AC-20: persistir antes de navegar, nunca en paralelo). Si el usuario ya tenía una sesión guardada y vuelve a loguearse o registrarse, `writeStoredAuthSession` simplemente sobrescribe la sesión anterior (AC-4): no hay multi-cuenta, la última sesión válida gana. El resto del comportamiento de `AuthScreen` (estado de éxito transitorio, delay de 1200ms, redirect a `/`, validación con `zod`) no cambia.

## Tareas
### T1 — Tipo y storage de sesión de auth
- Archivos: `modules/auth/types/auth.types.ts` (modificar), `modules/auth/utils/auth-session-storage.ts` (crear), `modules/auth/utils/auth-session-storage.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4
- Tests: `auth-session-storage.test.ts` — casos descritos en AC-4
- [ ] Completada

### T2 — Hook useAuthSession
- Archivos: `modules/auth/hooks/useAuthSession.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-5
- Tests: no aplica (ver justificación en AC-5)
- [ ] Completada

### T3 — Persistir sesión al validar login/registro en AuthScreen
- Archivos: `modules/auth/components/AuthScreen.tsx` (modificar)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-10
- Tests: no aplica (orquestador de UI ya sin test en `auth-ui.md` T6; el orden de persistencia se valida por lectura de código según AC-10)
- [ ] Completada

### T4 — AuthNavSection
- Archivos: `modules/auth/components/AuthNavSection.tsx` (crear)
- Depende de: T2
- Grupo paralelo: G3
- Cubre: AC-6, AC-7, AC-8
- Tests: no aplica (componente presentacional que consume un hook ya cubierto en T1/T2, SETUP.md 3.2)
- [ ] Completada

### T5 — Integrar AuthNavSection en SiteNavbar
- Archivos: `components/shared/SiteNavbar.tsx` (modificar)
- Depende de: T4
- Grupo paralelo: G4
- Cubre: AC-1, AC-2, AC-9
- Tests: no aplica (componente presentacional, SETUP.md 3.2)
- [ ] Completada
