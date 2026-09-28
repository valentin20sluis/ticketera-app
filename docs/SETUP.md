# SETUP.md

Reglas de estructura de carpetas, buenas prácticas y metodología de trabajo para este proyecto. Todo el equipo (humano o agente) debe seguir este documento antes de crear código nuevo.

---

## 1. Estructura de carpetas

Trabajamos con **Next.js App Router** (carpeta `app/`, sin `pages/`). Toda funcionalidad de negocio se organiza **por módulo de dominio** (feature-based / domain-driven), nunca por tipo de archivo a nivel global (nada de un `components/` gigante con todo mezclado).

### 1.1 Reglas

- **Nombres en inglés** para carpetas, archivos, variables, funciones, componentes, etc. Sin excepciones, aunque el equipo hable en español.
- **Modularidad por dominio**: cada dominio de negocio (ej. `invoices`, `auth`, `user-profile`) vive en su propia carpeta bajo `modules/`, con todo lo que le pertenece (componentes, hooks, services, schemas, types, store) dentro.
- **`app/` solo contiene rutas** (páginas, layouts, route handlers). La lógica de negocio y la UI compleja se importan desde `modules/` o `components/`; `app/` no debe acumular lógica propia más allá de composición y data-fetching de la página.
- **`components/ui/`** es exclusivo de shadcn/ui. No se edita a mano la convención de nombres que genera el CLI (kebab-case, ej. `dropdown-menu.tsx`) y no se le agrega lógica de negocio.
- **`components/shared/`** es para componentes de presentación reutilizables entre módulos (ej. `PageHeader`, `EmptyState`) que no son shadcn y no pertenecen a un solo dominio.
- **`lib/`** es para utilidades transversales de toda la app (cliente de Axios, `QueryClient`, `cn`, configuración, constantes globales).
- **Barrel files (`index.ts`)** son opcionales dentro de un módulo, solo si simplifican los imports; no crear barrels vacíos "por si acaso" (ver YAGNI en la sección 2).

### 1.2 Convención de nombres (naming)

| Elemento | Convención | Ejemplo |
|---|---|---|
| Carpeta de ruta (App Router) | kebab-case | `app/user-profile/page.tsx` |
| Carpeta de módulo de dominio | kebab-case | `modules/invoices/` |
| Route group (no afecta la URL) | `(kebab-case)` | `app/(auth)/login/page.tsx` |
| Carpeta/archivo privado (fuera del routing) | `_kebab-case` | `app/_actions/` |
| Componente React (archivo) | PascalCase | `InvoiceCard.tsx` |
| Componente shadcn/ui (autogenerado) | kebab-case (no tocar) | `components/ui/button.tsx` |
| Hook | camelCase con prefijo `use` | `useInvoices.ts` |
| Service / capa de datos | kebab-case + `.service.ts` | `invoice.service.ts` |
| Schema de validación (zod) | kebab-case + `.schema.ts` | `invoice.schema.ts` |
| Store (zustand) | kebab-case + `.store.ts` | `invoice.store.ts` |
| Tipos | kebab-case + `.types.ts` | `invoice.types.ts` |
| Utilidad pura | kebab-case + `.ts` | `format-currency.ts` |
| Test (co-localizado) | mismo nombre + `.test.ts(x)` | `InvoiceCard.test.tsx` |

El componente exporta con el mismo nombre PascalCase que el archivo (`export function InvoiceCard()` en `InvoiceCard.tsx`). Los imports usan siempre el alias `@/*` (ej. `@/modules/invoices/hooks/useInvoices`).

### 1.3 Ejemplo de estructura completa

```
app/
  layout.tsx
  page.tsx
  (auth)/
    login/
      page.tsx
  invoices/
    page.tsx                     # compone piezas de modules/invoices

components/
  ui/                             # shadcn/ui, generado por `npx shadcn add`
    button.tsx
    dropdown-menu.tsx
  shared/                         # reutilizable entre dominios, no shadcn
    PageHeader.tsx
    EmptyState.tsx

modules/
  invoices/                       # todo lo del dominio "invoices" vive aquí
    components/
      InvoiceCard.tsx
      InvoiceList.tsx
    hooks/
      useInvoices.ts
    services/
      invoice.service.ts
    schemas/
      invoice.schema.ts
    store/
      invoice.store.ts
    types/
      invoice.types.ts
    index.ts                      # barrel opcional

lib/
  utils.ts                        # cn, etc.
  api-client.ts                   # instancia de axios
  query-client.ts                 # configuración de TanStack Query
```

---

## 2. Buenas prácticas

Aplicamos **SOLID, DRY, KISS y YAGNI** en todo momento: al crear componentes de shadcn, componentes propios, funciones, hooks, services, stores, etc. Esto no es opcional ni solo para "código complejo".

### 2.1 SOLID aplicado a frontend

- **S — Single Responsibility**: un componente, hook o función hace una sola cosa. Si un componente maneja UI y fetching y validación a la vez, se divide (ej. un hook para el fetching, el componente solo renderiza).
- **O — Open/Closed**: se extiende comportamiento vía props, composición o variantes (ej. `cva`), no modificando un componente existente que ya funciona en otro lugar para forzar un caso nuevo.
- **L — Liskov Substitution**: si dos componentes comparten una interfaz de props (ej. distintas variantes de un mismo `Button`), deben poder intercambiarse sin romper al que los usa.
- **I — Interface Segregation**: props e interfaces pequeñas y específicas para lo que el componente realmente necesita; no props gigantes "por si se necesita después".
- **D — Dependency Inversion**: los componentes dependen de abstracciones (hooks, services) en vez de código concreto de terceros embebido directamente (ej. no hacer `fetch`/`axios` dentro del JSX de un componente; se llama a un hook que usa un service).

### 2.2 DRY, KISS, YAGNI

- **DRY**: si una misma lógica se repite en dos o más lugares, se extrae a un hook, util o service compartido (dentro del módulo si es específico del dominio, en `lib/` si es transversal).
- **KISS**: preferir siempre la solución más simple que cumpla el requerimiento actual. No introducir capas de abstracción, patrones de diseño o configuración que no son necesarias hoy.
- **YAGNI**: no se construye para necesidades hipotéticas futuras ("por si más adelante..."). Si un módulo, prop o abstracción no tiene un uso real ahora, no se crea.

### 2.3 Antes de crear algo, verificar que no exista

Este orden aplica siempre, para componentes, hooks, funciones o services:

1. **Componentes**: ¿existe en shadcn/ui? Revisar el catálogo y agregarlo con `npx shadcn@latest add <name>` en vez de reconstruirlo a mano.
2. Si no existe en shadcn, ¿ya existe un componente propio reutilizable en `components/shared/` o en otro módulo que se pueda reutilizar o extender?
3. Solo si no existe, se crea uno nuevo — pensando desde el inicio en que sea reutilizable (props genéricas, sin lógica de un dominio específico salvo que viva dentro de ese módulo).
4. **Hooks / funciones / services**: buscar primero dentro del módulo actual, luego en `lib/` o hooks compartidos, antes de escribir una nueva versión. Nunca duplicar una utilidad que ya existe con otro nombre.

---

## 3. Metodología: Spec Driven Development (SDD)

Trabajamos con **SDD**: antes de escribir código de una feature, se define su especificación. La especificación es la fuente de verdad; el código se revisa contra ella, no contra la intuición de quien la escribió.

### 3.1 Flujo con 4 roles

El trabajo pasa por 4 roles conceptuales dentro del ciclo de una feature:

1. **Orquestador**: coordina el ciclo completo. Recibe el requerimiento, decide cuándo una feature pasa de una etapa a la siguiente, resuelve bloqueos y aprueba (o rechaza) el resultado final antes de darlo por cerrado.
2. **Spec**: convierte el requerimiento en una especificación clara antes de que se escriba código: qué se va a construir, criterios de aceptación, casos límite y qué queda explícitamente fuera de alcance.
3. **Developer**: implementa siguiendo la spec al pie de la letra, respetando la estructura de carpetas (sección 1) y las buenas prácticas (sección 2) de este documento.
4. **Reviewer**: revisa el código resultante contra la spec original, contra SOLID/DRY/KISS/YAGNI, y contra la cobertura de tests esperada.

```
Requerimiento → Spec (define, draft) → Aprobación humana → Developer (implementa) → Reviewer (valida) → Orquestador (aprueba / decide siguiente paso)
```

**La aprobación humana de la spec es bloqueante.** Ningún developer empieza a implementar hasta que una persona apruebe explícitamente la spec (`Estado: draft` → `approved`). Si durante el loop de revisión cambian los criterios de aceptación o las tareas, la spec vuelve a `draft` y requiere una nueva aprobación.

Si el Reviewer encuentra desviaciones respecto a la spec, vuelve al Developer; si la spec estaba mal definida, vuelve a Spec. El Orquestador es quien decide ese enrutamiento.

Estos 4 roles están implementados como subagentes de Claude Code en `.claude/agents/` (`orchestrator`, `spec`, `developer`, `reviewer`). Las specs se guardan en `docs/specs/<feature-slug>.md`. El orquestador decide primero si la tarea necesita SDD o basta con modo build, y para poder despachar a los demás agentes debe correr como hilo principal: `claude --agent orchestrator`.

### 3.2 Unit testing

Usamos **Vitest + Testing Library** (`@testing-library/react`) como stack de testing.

- **Cuándo es obligatorio escribir tests**:
  - Lógica de negocio en `services/` (transformaciones de datos, cálculos, llamadas a API mockeadas).
  - Hooks con lógica no trivial (estado derivado, efectos condicionales).
  - Schemas de validación (`zod`): casos válidos e inválidos.
  - Utilidades puras en `lib/` o `utils/`.
- **Cuándo no es necesario**:
  - Componentes puramente presentacionales sin lógica (reciben props y renderizan).
  - Páginas de `app/` que solo componen otros componentes ya testeados.
- **Convención**: el test se co-localiza junto al archivo que prueba, con el mismo nombre y sufijo `.test.ts` / `.test.tsx` (ej. `invoice.service.ts` → `invoice.service.test.ts`).
