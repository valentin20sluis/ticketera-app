# Checkout: Agregar al calendario + Descargar PDF

Estado: draft

## Objetivo
En `CheckoutConfirmationStep.tsx` (paso 3 del checkout, Fase 5), los botones "Agregar al calendario" y "Descargar PDF" son placeholders sin `onClick`, documentados a propósito como fuera de alcance en `docs/specs/checkout-confirmation.md`. El usuario los probó, los confundió con un bug y, tras la aclaración, pidió explícitamente que funcionen de verdad: generar y descargar un archivo `.ics` real para el calendario, y un PDF real y descargable con el detalle de cada entrada — todo 100% client-side, sin backend, consistente con el resto de la demo.

## Fuera de alcance
- `modules/my-tickets/components/TicketOrderCard.tsx` (Fase 7, "Mis entradas"): aunque también renderiza `TicketStubCard` con QR al expandir un pedido, el usuario solo mencionó el paso de confirmación del checkout. No se le agregan botones de calendario/PDF en esta spec.
- Backend, persistencia o envío real: el `.ics` y el PDF se generan en memoria en el navegador en el momento del click; no se sube ni se guarda nada en ningún servidor.
- Integración con APIs de proveedores de calendario (Google Calendar API, Microsoft Graph, etc.): solo se genera el archivo `.ics` estándar; qué aplicación lo abre depende del sistema operativo/navegador del usuario, no de esta app.
- Manejo de zona horaria distinta a UTC: `DTSTART`/`DTEND` del `.ics` se emiten en UTC (sufijo `Z`) calculados directamente desde el string ISO `order.startDate`; no hay detección ni conversión de la zona horaria del usuario.
- Diseño visual/branding del PDF (logo, tipografías custom, layout multi-columna): se usa el layout y la fuente por defecto de `jspdf`, una entrada por página, texto plano + imagen del QR. Sin pase de diseño.
- Accesibilidad del PDF generado (PDF etiquetado, estructura para lector de pantalla): fuera de alcance para una demo.
- Cambiar el contenido/formato del valor codificado en el QR: se reutiliza exactamente el mismo `qrValue` (`TICKETERA-<orderNumber>-<ticketNumber>`) ya usado hoy en pantalla.
- Cualquier cambio a `CheckoutStepper`, `BuyerInfoForm`, `PaymentMethodSection`, `CheckoutPaymentStep`, `CheckoutFlow`, los tipos de `checkout.types.ts` o el schema de `checkout.schema.ts`: esta spec no los toca.

## Reutilización
- Existente que se reutiliza: `modules/checkout/types/checkout.types.ts` (`ConfirmedOrder`) — sin cambios, solo se consume.
- Existente que se reutiliza: `modules/checkout/utils/build-ticket-stubs.ts` (`TicketStub`, `buildTicketStubs`) — los `stubs` ya se calculan en `CheckoutConfirmationStep`; se reutiliza el mismo arreglo para alimentar el PDF, sin volver a calcularlo.
- Existente que se reutiliza: `lib/format-currency.ts` (`formatPrice`) y `modules/events/utils/format-event-date.ts` (`formatFullEventDate`) — mismos formatos que ya se ven en pantalla, para que el PDF no introduzca un formato de fecha/precio distinto al resto de la app.
- Existente que se extiende:
  - `modules/checkout/components/TicketStubCard.tsx` — el `<QRCodeSVG value={qrValue} />` se envuelve en un `<div data-qr-code>` (sin ninguna clase ni estilo nuevo). Es necesario porque dentro del mismo `Card` también hay otro `<svg>` (el ícono `MapPinIcon` de `lucide-react`), así que `querySelectorAll("svg")` sin más contexto no identificaría el QR de forma confiable; el atributo `data-qr-code` da un selector estable (`[data-qr-code] svg`) para la generación del PDF. Cambio no visual: afecta también a su otro único consumidor, `modules/my-tickets/components/TicketOrderCard.tsx`, sin alterar su comportamiento ni su apariencia.
  - `modules/checkout/components/CheckoutConfirmationStep.tsx` — gana la directiva `"use client"` (ya es parte de un árbol cliente porque su único padre, `CheckoutFlow`, ya es `"use client"`, pero hasta ahora no la necesitaba porque no tenía estado ni handlers propios; al agregarlos, sigue el mismo patrón que `TicketOrderCard.tsx`, que sí declara `"use client"` explícitamente aunque también cuelga de un árbol cliente), un `ref` sobre el contenedor del grid de `TicketStubCard` y los dos `onClick` reales de los botones.
- Nuevo (y por qué no sirve nada existente):
  - `modules/checkout/utils/generate-calendar-file.ts`: no existe ninguna utilidad de exportación a calendario en el proyecto.
  - `modules/checkout/utils/generate-tickets-pdf.ts`: no existe ninguna utilidad de generación de PDF en el proyecto.
- Dependencias nuevas a instalar antes de implementar: **`jspdf@^4.2.1`** (`npm install jspdf@^4.2.1`).
  - Se evaluaron dos caminos para "Descargar PDF":
    1. `window.print()` + estilos `@media print`: no requiere ninguna dependencia nueva, pero se descarta porque el usuario pidió explícitamente "un PDF real y descargable". `window.print()` abre el diálogo de impresión del navegador — el usuario tendría que elegir manualmente "Guardar como PDF" como destino, no es una descarga directa — y además, para no imprimir literalmente toda la página (stepper, botones, info cards), habría que construir un stylesheet `@media print` completo que oculte todo salvo los stubs, lo cual es más trabajo y sigue sin garantizar el nombre de archivo ni el flujo de "un click y se descarga" que el pedido implica.
    2. `jspdf`: genera el PDF por código (texto + imágenes rasterizadas) sin depender del DOM visible de la página ni de un diálogo del navegador, y expone un método `.save(filename)` que dispara la descarga directamente. Se eligió esta opción.
  - Se confirmó (`npm view jspdf@4.2.1`) que **no declara `peerDependencies`** (no impone ninguna versión de React, compatible por diseño con React 19.2.8 del proyecto), que su `package.json` define condiciones `exports`/`browser` separadas de `node` (usa el build de navegador al bundlear con Next.js/Turbopack, no el build de Node), y que sus únicas dependencias propias son `@babel/runtime`, `fflate` y `fast-png` (sin conflicto conocido con el resto de dependencias del proyecto). Se fija la versión mayor **4.x** (`^4.2.1`) por ser la que `npm view jspdf dist-tags.latest` resuelve hoy como estable. La clase se importa como `import { jsPDF } from "jspdf"` (named export, confirmado en `types/index.d.ts` del paquete).
  - No se evaluó `pdf-lib` ni otras alternativas en detalle: `jspdf` es la opción más usada y documentada para este caso de uso (texto + imagen por código, sin backend), y cumple KISS para una demo.

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con los dos botones conectados e integrados.
- AC-2: `npx vitest run` pasa para `generate-calendar-file.test.ts` (nuevo) y para todos los tests ya existentes del proyecto, sin modificarlos.
- AC-3: `buildIcsContent(order: ConfirmedOrder): string` en `modules/checkout/utils/generate-calendar-file.ts` devuelve un string que contiene, en este orden, `BEGIN:VCALENDAR`, `VERSION:2.0`, `BEGIN:VEVENT`, una línea `UID:` que incluye `order.orderNumber`, una línea `DTSTART:` con `order.startDate` formateado como `YYYYMMDDTHHMMSSZ` (UTC), una línea `DTEND:` con el mismo formato correspondiente a `order.startDate` + 3 horas (duración asumida fija, documentada en el propio archivo con un comentario porque `ConfirmedOrder` no tiene hora de fin), una línea `SUMMARY:` con `order.eventTitle`, una línea `LOCATION:` con `"<order.venueName>, <order.city>"`, `END:VEVENT`, `END:VCALENDAR` — y que las comas y los punto y coma dentro de `eventTitle`/`venueName`/`city` se escapan (`\,` / `\;`) en `SUMMARY`/`LOCATION` según RFC 5545. Verificado en `generate-calendar-file.test.ts` con: un `ConfirmedOrder` mock sin caracteres especiales (verifica estructura completa, `DTEND` exactamente 3 horas después de `DTSTART`), y un `ConfirmedOrder` mock cuyo `venueName` o `city` contiene una coma (verifica el escape en `LOCATION`).
- AC-4: `downloadCalendarFile(order: ConfirmedOrder): void` en el mismo archivo arma un `Blob` con `type: "text/calendar;charset=utf-8"` a partir de `buildIcsContent(order)` y dispara una descarga llamada `entradas-<order.orderNumber>.ics` con el patrón `URL.createObjectURL` + `<a download>` + click programático + `URL.revokeObjectURL` — verificable leyendo el código; no tiene test unitario (depende de las APIs de `Blob`/`URL.createObjectURL`/`HTMLAnchorElement` del navegador, sin soporte confiable en jsdom — SETUP.md 3.2).
- AC-5: `TicketStubCard.tsx` envuelve `<QRCodeSVG value={qrValue} />` en `<div data-qr-code>` sin cambiar ninguna otra clase, prop o estructura existente del componente — verificable leyendo el código. Sus dos consumidores (`CheckoutConfirmationStep.tsx`, `TicketOrderCard.tsx`) siguen renderizando exactamente el mismo contenido visual.
- AC-6: `generateTicketsPdf({ order, stubs, qrElements }: { order: ConfirmedOrder; stubs: TicketStub[]; qrElements: SVGSVGElement[] }): Promise<void>` en `modules/checkout/utils/generate-tickets-pdf.ts`:
  - crea una instancia `new jsPDF()` y una página por cada elemento de `stubs` (la primera entrada en la página inicial, `pdf.addPage()` antes de cada una de las siguientes), emparejando `stubs[i]` con `qrElements[i]` por índice (mismo orden en que `CheckoutConfirmationStep` los recorre al construir el grid);
  - en cada página escribe como texto, como mínimo: `order.eventTitle`, `"<order.venueName>, <order.city>"`, `formatFullEventDate(order.startDate)`, `stub.zoneName`, `formatPrice(stub.price)` y `"Entrada <stub.ticketNumber> de <stub.totalTickets>"`;
  - rasteriza `qrElements[i]` a PNG con una función interna (`XMLSerializer().serializeToString(svg)` → data URL `data:image/svg+xml` → cargado en un `Image` → dibujado en un `<canvas>` creado con `document.createElement("canvas")` sin montarlo en el DOM → `canvas.toDataURL("image/png")`) y lo embebe con `pdf.addImage(...)`;
  - finaliza llamando `pdf.save(`entradas-${order.orderNumber}.pdf`)` (método propio de `jspdf` que arma el `Blob` y dispara la descarga, sin necesidad de repetir a mano el patrón `URL.createObjectURL`/`<a>`).
  - Verificable leyendo el código; sin test unitario (depende de `Image.onload`, `HTMLCanvasElement.toDataURL` y de las APIs de navegador que usa `jspdf` internamente, ninguna con soporte confiable en jsdom — SETUP.md 3.2).
- AC-7: `CheckoutConfirmationStep.tsx` tiene `"use client"` como primera línea del archivo.
- AC-8: el contenedor del grid de `TicketStubCard` en `CheckoutConfirmationStep.tsx` tiene un `ref` (ej. `gridRef`) usado únicamente para leer, en el momento del click de "Descargar PDF", los elementos `[data-qr-code] svg` dentro de ese contenedor — el resto del grid (mapeo de `stubs`, props pasadas a cada `TicketStubCard`) no cambia respecto al comportamiento ya cubierto por AC-16 de `docs/specs/checkout-confirmation.md`.
- AC-9: el botón "Agregar al calendario" tiene `onClick={() => downloadCalendarFile(order)}`; no tiene estado de carga ni `disabled` condicional (la operación es síncrona).
- AC-10: el botón "Descargar PDF" tiene un `onClick` asíncrono que: lee `qrElements` desde `gridRef.current` (en el orden del DOM, que coincide con el de `stubs`), llama `await generateTicketsPdf({ order, stubs, qrElements })` dentro de un `try/catch`, pone un estado local `isGeneratingPdf` en `true` antes de la llamada y en `false` dentro de un `finally`, y mientras `isGeneratingPdf` es `true` el botón queda `disabled` y su texto cambia a una etiqueta de carga (ej. "Generando..."); si `generateTicketsPdf` rechaza, el `catch` solo hace `console.error` (sin componente de error dedicado — no hay ningún `toast`/`sonner` instalado en `components/ui/`, y agregar uno solo para este caso excepcional sería YAGNI para una demo) — verificable leyendo el código.
- AC-11: el resto de `CheckoutConfirmationStep.tsx` (stepper, encabezado de éxito, contenido de cada `TicketStubCard`, botón "Ver mis entradas", info cards) no cambia su comportamiento respecto a AC-16 de `docs/specs/checkout-confirmation.md` — solo los dos botones placeholder ganan funcionalidad real.

## Tareas

### T1 — Utilidad de exportación a calendario (`.ics`)
Lógica pura de armado del contenido `.ics` (testeable) + wrapper que dispara la descarga en el navegador (no testeable, SETUP.md 3.2).
- Archivos:
  - `modules/checkout/utils/generate-calendar-file.ts` (crear)
  - `modules/checkout/utils/generate-calendar-file.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4
- Tests: `generate-calendar-file.test.ts` — estructura completa de `buildIcsContent` con un `ConfirmedOrder` mock sin caracteres especiales (incluye verificar `DTEND` = `DTSTART` + 3 horas); escape de coma en `venueName`/`city` dentro de `LOCATION` con otro `ConfirmedOrder` mock.
- [ ] Completada

### T2 — Utilidad de generación de PDF de entradas
Rasteriza cada QR ya renderizado en el DOM a PNG y arma un PDF de una página por entrada con `jspdf`, descargándolo directamente.
- Archivos:
  - `modules/checkout/utils/generate-tickets-pdf.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-6
- Tests: no aplica (depende de `Image`, `HTMLCanvasElement.toDataURL` y APIs de navegador internas de `jspdf`, sin soporte confiable en jsdom — SETUP.md 3.2)
- [ ] Completada

### T3 — Selector estable del QR en `TicketStubCard`
Envuelve el QR en un `data-qr-code` para que T2 pueda ubicarlo sin ambigüedad frente a otros `<svg>` del mismo card (ej. `MapPinIcon`).
- Archivos:
  - `modules/checkout/components/TicketStubCard.tsx` (modificar)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-5
- Tests: no aplica (componente presentacional, cambio puramente estructural sin lógica nueva — SETUP.md 3.2)
- [ ] Completada

### T4 — Conectar los botones en `CheckoutConfirmationStep`
Agrega `"use client"`, el `ref` del grid y los dos `onClick` reales, consumiendo T1, T2 y T3.
- Archivos:
  - `modules/checkout/components/CheckoutConfirmationStep.tsx` (modificar)
- Depende de: T1, T2, T3
- Grupo paralelo: G2
- Cubre: AC-1, AC-2, AC-7, AC-8, AC-9, AC-10, AC-11
- Tests: no aplica (componente de composición que delega a utils ya testeados/exentos, con handlers inline consistentes con el patrón ya usado en `CheckoutPaymentStep.tsx` — SETUP.md 3.2)
- [ ] Completada
