# next-js-template

Template base de Next.js para arrancar proyectos con una estructura modular por dominio, buenas prácticas definidas y un flujo de desarrollo asistido por agentes de Claude Code basado en **Spec Driven Development (SDD)**.

No está orientado a ningún sector de negocio: trae la base técnica, las reglas y el flujo de trabajo, y cada proyecto agrega sus propios módulos de dominio.

## Stack

| Área | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + React 19 |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS v4 (sin `tailwind.config`, se configura en `app/globals.css`) |
| UI | shadcn/ui estilo `base-nova` sobre **Base UI** (`@base-ui/react`, no Radix) |
| Datos | `axios`, `@tanstack/react-query` v5, `@tanstack/react-table` v9 |
| Validación / estado | `zod` v4, `zustand` v5 |
| Testing | Vitest + Testing Library (jsdom) |

> Next.js 16 trae cambios incompatibles con versiones anteriores. La documentación correcta para esta versión está en `node_modules/next/dist/docs/`.

## Primeros pasos

Requisitos: Node.js 22 o superior (recomendado 24).

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción; también es el chequeo de TypeScript |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run test` | Vitest en modo watch |
| `npx vitest run <archivo>` | Corre un archivo de test una sola vez |

## Estructura del proyecto

```
app/                 # solo rutas del App Router (páginas, layouts, route handlers)
components/
  ui/                # componentes shadcn/ui (generados por el CLI)
  shared/            # componentes reutilizables entre dominios
modules/<domain>/    # un módulo por dominio: components, hooks, services, schemas, store, types
lib/                 # utilidades transversales (cn, cliente http, query client)
docs/
  SETUP.md           # reglas del proyecto (fuente de verdad)
  specs/             # specs generadas en el flujo SDD
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
