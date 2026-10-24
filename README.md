# Ticketera App

Plataforma de venta de entradas para eventos. Los **clientes** descubren eventos, eligen zona, pagan con Stripe y reciben sus entradas con código QR; los **organizadores** publican eventos, cobran con Stripe Connect y controlan el acceso con un escáner QR; los **administradores** gestionan usuarios y organizadores.

Es un proyecto demo, desarrollado con un flujo asistido por agentes de Claude Code basado en **Spec Driven Development (SDD)** (ver más abajo).

## Qué incluye

| Área | Qué hay |
|---|---|
| Público | Landing con hero, catálogo con filtros por categoría, detalle del evento con mapa y "Cómo llegar", newsletter |
| Compra | Elección de zona y cantidad, o de **asientos numerados** (cuadrícula 10×10 por zona, estilo cine), checkout con Stripe (Checkout Sessions + destination charges con comisión de plataforma), entradas con QR y PDF |
| Cliente | `/mis-entradas` con el estado real de cada entrada; botón "Quiero vender entradas" para pasar a organizador |
| Organizador | Panel con resumen y dashboard, asistente de eventos (varias funciones por evento), configuración (RUC), página de pagos, onboarding de Stripe Connect y check-in con cámara |
| Administración | Gestión de usuarios y organizadores, con suspensión de cuentas, y moderación de eventos |
| Tareas programadas | `GET /api/cron/reconcile-orders` reconcilia las órdenes pendientes con Stripe; se protege con `Authorization: Bearer $CRON_SECRET` y debe invocarse cada 5 minutos (hoy lo hace `vercel.json`; en otro hosting, un programador externo) |

## Stack

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Lenguaje | TypeScript |
| Estilos / UI | Tailwind CSS v4 (se configura en `app/globals.css`) y shadcn/ui estilo `base-nova` sobre **Base UI** (`@base-ui/react`, no Radix) |
| Base de datos | PostgreSQL con **Drizzle ORM** (Neon en local; conexión Postgres/Cloud SQL configurable con `DATABASE_DRIVER`) |
| Autenticación | **Clerk**; el rol (`customer`, `organizer`, `admin`, `super_admin`) vive en la tabla `users` |
| Pagos | **Stripe**: Checkout, Connect (cuentas v2) y webhooks |
| Validación | `zod` v4 |
| Testing | Vitest + Testing Library (jsdom); las pruebas de base de datos usan PGlite |

`axios`, `@tanstack/react-query`, `@tanstack/react-table` y `zustand` están instaladas pero todavía no se usan en el código.

> Next.js 16 trae cambios incompatibles con versiones anteriores. La documentación correcta para esta versión está en `node_modules/next/dist/docs/`.

## Primeros pasos

Requisitos: Node.js 22 o superior (recomendado 24), una base Postgres y cuentas de prueba de Clerk y Stripe.

```bash
npm install
cp .env.example .env     # completa las claves; cada variable está comentada
npm run db:migrate       # aplica las migraciones de drizzle/
npm run db:seed          # (opcional) carga un catálogo de ejemplo
npm run dev
```

Abre http://localhost:3000.

Para recibir los webhooks de Stripe en local, deja corriendo `npm run stripe:listen` en otra terminal.

### Variables de entorno

Están descritas en `.env.example`: base de datos (`DATABASE_*`), Clerk (`*_CLERK_*`), Stripe (`STRIPE_*`, incluido `STRIPE_CONNECT_ACCOUNT_COUNTRY`), la comisión de plataforma (`PLATFORM_FEE_PERCENT`) y el secreto del cron (`CRON_SECRET`).

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción; también es el chequeo de TypeScript |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run test` | Vitest en modo watch |
| `npx vitest run <archivo>` | Corre un archivo de test una sola vez |
| `npm run db:generate` | Genera una migración de Drizzle a partir de `lib/db/schema.ts` |
| `npm run db:migrate` | Aplica las migraciones pendientes |
| `npm run db:seed` | Carga el catálogo de ejemplo |
| `npm run db:assign-events` | Asigna los eventos del seed a organizadores |
| `npm run stripe:listen` | Reenvía los webhooks de Stripe a tu servidor local |

## Estructura del proyecto

```
app/                 # solo rutas del App Router (páginas, layouts, route handlers)
components/
  ui/                # componentes shadcn/ui (generados por el CLI)
  shared/            # componentes reutilizables entre dominios
modules/<domain>/    # un módulo por dominio: components, hooks, services, schemas, actions, types
lib/                 # utilidades transversales (cliente de base de datos, schema, Stripe)
drizzle/             # migraciones generadas por drizzle-kit
scripts/             # scripts de apoyo (seed, Stripe listen)
docs/
  SETUP.md           # reglas del proyecto (fuente de verdad)
  specs/             # specs generadas en el flujo SDD (Estado: draft | approved | done)
.claude/agents/      # agentes de Claude Code del flujo SDD
```

Las reglas completas de estructura, naming y buenas prácticas (SOLID, DRY, KISS, YAGNI, reutilizar antes de crear) están en [`docs/SETUP.md`](docs/SETUP.md). Léelo antes de escribir código.

Para agregar un componente de shadcn/ui:

```bash
npx shadcn@latest add <name>
```

## Flujo de trabajo con Claude Code (SDD)

El proyecto incluye 4 subagentes en `.claude/agents/`:

| Agente | Rol |
|---|---|
| `orchestrator` | Punto de entrada. Decide si la tarea va en **modo build** (cambio pequeño y claro) o en **SDD**, coordina a los demás agentes, lanza en paralelo las tareas que no comparten archivos y controla el loop de revisión (máximo 3 rondas). |
| `spec` | Escribe la spec en `docs/specs/<feature>.md`: criterios de aceptación, tareas con archivos declarados y grupos paralelos. Planes acotados a una sesión (máximo 6 tareas). |
| `developer` | Implementa una tarea, tocando solo sus archivos asignados y reutilizando lo que ya existe. |
| `reviewer` | Solo lectura. Valida contra la spec y `docs/SETUP.md`, corre tests, lint y build, y devuelve `APPROVED` o `CHANGES_REQUESTED`. |

Para usarlo, inicia Claude Code con el orquestador como hilo principal (un subagente no puede lanzar otros subagentes):

```bash
claude --agent orchestrator
```

```
Requerimiento → spec (draft) → aprobación humana → developer → reviewer → orchestrator
```

**La aprobación humana de la spec es bloqueante**: ningún developer empieza a implementar hasta que una persona apruebe explícitamente la spec.

## Skills recomendadas

Estas skills complementan el flujo del template. Las reglas del proyecto (`CLAUDE.md`, `docs/SETUP.md` y los agentes) tienen prioridad si alguna skill sugiere algo distinto.

| Skill | Para qué sirve en este template |
|---|---|
| [superpowers](https://github.com/obra/superpowers) | Metodología de desarrollo por skills: brainstorming, planes, TDD, code review y verificación antes de dar algo por terminado. Refuerza el ciclo spec → implementación → revisión. |
| [frontend-design](https://github.com/anthropics/claude-code/tree/main/plugins/frontend-design) | Skill oficial de Anthropic para interfaces con criterio visual (tipografía, color, composición) en vez de UI genérica. Se activa sola en trabajo de frontend. |
| [ui-ux-pro-max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Base de conocimiento de diseño: estilos, paletas, pares tipográficos y guías de UX, con recomendaciones por tipo de producto. Útil para definir el design system de cada proyecto. |
| [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) | Skills oficiales de Vercel. Las más útiles aquí: `react-best-practices` (rendimiento en React/Next.js), `composition-patterns` (arquitectura de componentes) y `web-design-guidelines` (accesibilidad y UX). |
| [ponytail](https://github.com/DietrichGebert/ponytail) | Hace que el agente escriba el mínimo código necesario: primero reutiliza lo existente, la librería estándar o una feature nativa. Encaja con KISS, YAGNI y la regla de "revisar si existe antes de crear". |
| [caveman](https://github.com/juliusbrussee/caveman) | Reduce los tokens de las respuestas del agente con un estilo telegráfico, sin tocar código, comandos ni rutas. Útil en sesiones largas. Tiene niveles (`/caveman lite\|full\|ultra`) y se apaga con `/caveman off`. |

### Instalación

Dentro de Claude Code (los comandos `/plugin` van **uno por mensaje**):

```
/plugin install superpowers@claude-plugins-official
/plugin install frontend-design@claude-plugins-official

/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill

/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

Desde la terminal:

```bash
claude plugin marketplace add JuliusBrussee/caveman && claude plugin install caveman@caveman

npx skills add vercel-labs/agent-skills
```

Después de instalar, ejecuta `/reload-plugins` o reinicia Claude Code para que las skills queden activas.
