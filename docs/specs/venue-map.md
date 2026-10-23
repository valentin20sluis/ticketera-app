# Mapa del venue en el detalle del evento

Estado: aprobada

## Objetivo

Tarea Trello 13 ("Mapa de Google con el pin del venue", prioridad media-baja). Hoy el detalle `/eventos/[slug]` no muestra ubicación visual: solo `venueName, city` en `EventDetailHero`. Esta spec agrega una sección "Ubicación" con un mapa con pin y un enlace "Cómo llegar", usando `lat/lng` del venue.

No toca auth, pagos, roles ni inventario: es lectura de datos públicos del venue ya existentes (`venues.lat/lng/address`, NOT NULL).

## Hallazgos de la investigación

- `app/(public)/eventos/[slug]/page.tsx` obtiene el evento con `listPublicEvents(db)` + `getEventBySlug`. `listPublicEvents` ya hace `innerJoin(venues)` pero solo selecciona `venues.name` y `venues.city`; el tipo `Event` (`modules/events/types/event.types.ts`) no trae `lat/lng/address`. Falta exponerlos.
- `Event` lo construyen a mano mocks (`events.mock.ts`) y varios tests. Para no tocarlos, los campos nuevos se declaran **opcionales** (`venueAddress?`, `venueLat?`, `venueLng?`); la BD siempre los llena y el fallback cubre `undefined`.
- `VenueStep.tsx` captura `lat`/`lng` como `<input>` de texto; `newVenueSchema` ya valida `z.coerce.number()` en `[-90, 90]` y `[-180, 180]`. No se modifica.
- No hay `next.config` con CSP ni headers: no hay política que ajustar hoy.
- Proyecto demo, despliegue en AWS: se evita todo lo específico de Vercel/GCP.

## Comparación de opciones (demo)

| Opción | API key | Resultado | Veredicto |
|---|---|---|---|
| A. Enlace `https://www.google.com/maps/search/?api=1&query=lat,lng` | No | Solo enlace | Se incluye ("Cómo llegar") |
| B. `<iframe src="https://www.google.com/maps?q=lat,lng&z=15&output=embed">` | No | Mapa con pin embebido | **Recomendada** junto con A |
| B'. Maps Embed API (`/maps/embed/v1/place`) | Sí | Igual que B, soportado oficialmente | Futuro si se exige soporte formal |
| C. Maps JavaScript API | Sí (+ cuenta de facturación, restricción por dominio) | Pin interactivo | Descartada: sobredimensionada para "solo mostrar el pin" |

Default: **A + B**. Cumple "mapa con pin + Cómo llegar" sin crear ni gestionar key. Limitación asumida: el formato `output=embed` sin key no es una API documentada/contratada por Google y podría cambiar; por eso el enlace A queda siempre visible como respaldo.

## Alcance

- Incluye:
  - Exponer `venueAddress`, `venueLat`, `venueLng` en `Event` y en `listPublicEvents`.
  - Util puro que valida coordenadas y construye las dos URLs.
  - Componente `EventVenueMap` (iframe + dirección + enlace "Cómo llegar") y su uso en la página de detalle.
  - Fallback sin coordenadas válidas: se muestra solo la dirección/venue y ningún iframe ni enlace de mapa.
- No incluye: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` ni `.env.example` (no hay key en esta versión), Maps JavaScript API, autocompletado, geocodificación de la dirección, vista previa del pin en `VenueStep` (queda fuera; ver Próximas fases), cambios a `EventDetailHero`/`EventImportantInfo`, CSP.

## Reutilizar

- `listPublicEvents` y su test (`modules/events/services/list-public-events.service.ts`), solo se amplía el `select`.
- `Card`/`CardContent` de `@/components/ui/card` y el patrón de sección de `EventImportantInfo` (título `h2`, iconos `lucide-react`, ej. `MapPin`).
- Rango de coordenadas ya definido en `newVenueSchema` (mismos límites; el util los repite como constantes simples, sin importar el schema del módulo `organizer`).

## Archivos

- Modificar: `modules/events/types/event.types.ts`, `modules/events/services/list-public-events.service.ts`, `modules/events/services/list-public-events.service.test.ts`, `app/(public)/eventos/[slug]/page.tsx`.
- Crear: `modules/events/services/venue-map.service.ts`, `modules/events/services/venue-map.service.test.ts`, `modules/events/components/EventVenueMap.tsx`.

## Criterios de aceptación

- AC1: `Event` tiene `venueAddress?`, `venueLat?`, `venueLng?` y `listPublicEvents` los devuelve desde `venues.address/lat/lng` para eventos de la BD.
- AC2: `getVenueMapLinks(lat, lng)` devuelve `{ embedUrl, directionsUrl }` con `embedUrl = https://www.google.com/maps?q=<lat>,<lng>&z=15&output=embed` y `directionsUrl = https://www.google.com/maps/search/?api=1&query=<lat>,<lng>`.
- AC3: `getVenueMapLinks` devuelve `null` si `lat`/`lng` son `undefined`, `NaN`, infinitos, `lat` fuera de `[-90, 90]` o `lng` fuera de `[-180, 180]`.
- AC4: con coordenadas válidas, el detalle muestra una sección "Ubicación" con `<iframe>` con `title` descriptivo (ej. "Mapa de <venueName>"), `loading="lazy"`, `referrerPolicy="no-referrer-when-downgrade"` y alto/ancho responsivos, la dirección y un enlace con texto "Cómo llegar" que abre `directionsUrl` con `target="_blank"` y `rel="noopener noreferrer"`.
- AC5: sin coordenadas válidas, la sección muestra solo venue, dirección y ciudad (si existen), sin `<iframe>` ni enlace de mapa, y no lanza error.
- AC6: no se requiere ninguna variable de entorno nueva; `npm run build` y `npm run test` pasan.

## Tests requeridos

- `venue-map.service.test.ts` (Vitest): URLs correctas (AC2); `null` para `undefined`, `NaN`, `lat` 91 / -91, `lng` 181 / -181 y aceptación de límites exactos (AC3).
- `list-public-events.service.test.ts`: ampliar un caso existente para verificar `venueAddress/venueLat/venueLng` (AC1).
- `EventVenueMap` es presentacional: sin test obligatorio (SETUP.md §3.2).

## Tareas

### T1 — Exponer coordenadas y dirección del venue
- Archivos: `modules/events/types/event.types.ts`, `modules/events/services/list-public-events.service.ts`, `modules/events/services/list-public-events.service.test.ts`
- Depende de: —
- Paralelizable: sí
- Cubre: AC1

### T2 — Util de enlaces del mapa
- Archivos: `modules/events/services/venue-map.service.ts`, `modules/events/services/venue-map.service.test.ts`
- Depende de: —
- Paralelizable: sí
- Cubre: AC2, AC3

### T3 — Componente `EventVenueMap` y cableado en el detalle
- Archivos: `modules/events/components/EventVenueMap.tsx`, `app/(public)/eventos/[slug]/page.tsx`
- Depende de: T1, T2
- Paralelizable: no
- Cubre: AC4, AC5, AC6

## Preguntas abiertas

1. ¿Iframe sin key (default) o Maps Embed API con key? Default: iframe sin key + enlace "Cómo llegar"; si luego se quiere key, crear `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, restringirla por dominio (HTTP referrer del dominio AWS) y a la Maps Embed API, y documentarla en `.env.example`.
2. ¿Vista previa del pin en `VenueStep` mientras se escribe lat/lng? Default: fuera de alcance (el organizador ya tiene validación de rango); reutilizaría `getVenueMapLinks` si se pide.
3. ¿Dónde ubicar la sección? Default: debajo de `EventImportantInfo`, en la columna principal.

## Pendientes humanos

- Ver el mapa en el navegador (desktop y móvil) con un evento real y con el iframe permitido (extensiones de bloqueo o políticas corporativas pueden bloquearlo; el enlace queda como respaldo).
- Si se adopta la opción con key: crearla en Google Cloud, restringirla por dominio y API, y cargarla en el entorno de AWS.
- Si más adelante se agrega CSP, permitir `frame-src https://www.google.com`.

## Próximas fases

- Vista previa del pin en `VenueStep`.
- Maps Embed API con key o Maps JavaScript API (pin interactivo) si el demo lo exige.
