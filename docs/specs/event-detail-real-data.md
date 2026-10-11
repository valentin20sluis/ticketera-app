# Event Detail with Real Data

Estado: aprobada

## Objetivo

`app/(public)/eventos/[slug]/page.tsx` busca el evento y los relacionados en `MOCK_EVENTS`. Un evento creado por organizador/admin que no esté en los mocks da 404 en el detalle, aunque ya aparece en la landing y en `/eventos` (spec `featured-events-real-data.md`, "Próximas fases" y su pregunta abierta 1). Esta spec hace que el detalle y `RelatedEventsSection` lean de la BD.

No toca auth, pagos ni inventario: solo lee, con la misma fuente que ya usa el catálogo (`listPublicEvents`, que aplica la regla de disponibilidad de `getZoneAvailability`).

## Hallazgos de la investigación

- El detalle solo consume campos que ya están en `Event`: `EventDetailHero` (título, imagen, venue, ciudad, fecha, categoría vía `MOCK_CATEGORIES`, status), `EventAboutSection` (`description`), `EventImportantInfo` (`doorsOpenTime`, `showStartTime`, `minimumAge`, `admissionType`), `EventTicketSidebar` (`slug`, `priceFrom`) y `RelatedEventsSection` (`Event[]`). No falta ningún dato: no hace falta migrar descripción, venue ni zonas.
- `/eventos/[slug]/entradas` ya es real: usa `getCheckoutEventBySlug` (DB) + `CheckoutFlow`, con `await connection()`. No necesita cambios. `venue-zones.mock` solo lo usan componentes/hooks de selección y sus tests (no la ruta); queda fuera.
- `getEventBySlug` y `getRelatedEvents` (`event.service.ts`) son funciones puras sobre `Event[]`, con tests. Funcionan igual con eventos de la BD.
- `MOCK_EVENTS` en runtime de `app/` solo queda en el detalle. `MOCK_CATEGORIES` sigue siendo el catálogo de categorías (D1 de la spec previa) y no cambia.

## Decisión de alcance mínimo (YAGNI)

- **No se crea `getPublicEventBySlug`**: el detalle llama `listPublicEvents(db)` y reutiliza `getEventBySlug`/`getRelatedEvents` en memoria. Es la misma carga que ya hacen la landing y `/eventos`; un servicio por slug duplicaría las tres consultas con un `where` extra sin beneficio medible hoy. Si el catálogo crece o se pagina, se añade entonces (ver Próximas fases).
- Consecuencia asumida: un evento `published` sin función futura (o sin zonas) da 404 en el detalle, coherente con D2 (no aparece en listados ni se puede comprar). Ver pregunta 1.
- La página llama `await connection()` (D5: disponibilidad cambia con cada compra).

## Alcance

- Incluye: detalle `/eventos/[slug]` y eventos relacionados con datos de la BD.
- No incluye: cambios a `/entradas`, a `venue-zones.mock`/selección de zonas, servicio por slug, `generateMetadata`/SEO, categorías en DB, borrar `MOCK_EVENTS` (lo siguen usando el seed y tests), cambios de UI.

## Reutilizar

- `modules/events/services/list-public-events.service.ts` (`listPublicEvents`), sin cambios.
- `modules/events/services/event.service.ts` (`getEventBySlug`, `getRelatedEvents`), sin cambios.
- `getDb` de `@/lib/db/client`, `connection` de `next/server` (patrón de `entradas/page.tsx`).
- Componentes del detalle y `RelatedEventsSection`, sin cambios.

## Archivos

- Modificar: `app/(public)/eventos/[slug]/page.tsx`.

## Criterios de aceptación

- AC1: `/eventos/<slug>` de un evento `published` con función futura creado en la BD (no presente en `MOCK_EVENTS`) renderiza el detalle con sus datos reales (título, descripción, venue, ciudad, fecha, horarios, edad, precio desde).
- AC2: Un slug inexistente, o de un evento `draft`/`cancelled`/`suspended`, o publicado sin función futura, responde 404 (`notFound()`).
- AC3: `RelatedEventsSection` recibe hasta 4 eventos reales distintos del actual (misma categoría primero, completando con otros por fecha), según `getRelatedEvents`.
- AC4: La página no importa `MOCK_EVENTS`, llama `await connection()` y no falla con la BD vacía (404).
- AC5: Los eventos sembrados desde mocks siguen abriendo su detalle por el mismo slug.
- AC6: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

(Vitest, junto al archivo)

- Sin tests nuevos: la lógica ya está cubierta por `list-public-events.service.test.ts` y `event.service.test.ts` (sin cambios), y la página solo compone (SETUP.md 3.2). Verificación manual de AC1-AC5 (crear un evento propio con función futura y abrir su detalle).

## Tareas

### T1 — Detalle con datos de la BD
- Archivos: `app/(public)/eventos/[slug]/page.tsx`
- Depende de: —
- Paralelizable: no (única tarea)
- Cubre: AC1, AC2, AC3, AC4, AC5, AC6

## Preguntas abiertas

1. **Publicado sin función futura.** Hoy daría 404 en el detalle (D2). Alternativa: mostrar el detalle con status "agotado/finalizado" y sin botón de entradas, pero requiere consultar eventos fuera de `listPublicEvents` (servicio nuevo) y definir qué mostrar. Recomendación: 404 por ahora. ¿De acuerdo?
2. **Carga completa en el detalle.** Se leen todos los eventos públicos para mostrar uno (misma consulta que el catálogo). Recomendación: aceptable hoy; ¿se prefiere ya un `getPublicEventBySlug` + consulta acotada de relacionados?
3. **Detalle de un evento propio no visible** (organizador viendo su `draft`): fuera de alcance, el público no lo ve. ¿Se necesita vista previa para el dueño/admin?

## Próximas fases

- `getPublicEventBySlug` y relacionados acotados en SQL si el catálogo crece o se pagina.
- `generateMetadata` (título/OG) para el detalle.
- Retirar `venue-zones.mock` de los componentes de selección de zonas si dejan de usarse.
- Categorías en DB (retirar `MOCK_CATEGORIES`).
