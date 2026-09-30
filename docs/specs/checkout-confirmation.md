# Checkout Confirmation

Estado: in-progress

## Objetivo
Completar el flujo de compra iniciado en la Fase 4 (`/eventos/[slug]/entradas`): conectar el botón "Continuar" de `TicketSummary` a un paso 2 de datos del comprador + método de pago, y de ahí a un paso 3 de confirmación con número de pedido mock y "ticket stub" con QR — todo como **simulación de UI sin backend real, sin pasarela de pago real y sin generar PDFs/correos reales**.

**Decisión de enrutamiento (la más delicada de esta spec): no se crea ninguna ruta nueva bajo `app/`.** Los 3 pasos (Entradas → Datos y pago → Confirmación) viven como estados de un mismo componente cliente (`CheckoutFlow`) montado en la ruta ya existente `/eventos/[slug]/entradas`; avanzar de paso es un cambio de estado en memoria, no una navegación. Se descarta la alternativa de query params (`?zone=...`) porque la Fase 4 ya decidió explícitamente, y documentó como YAGNI, **no** representar la selección de entradas en la URL/localStorage/store ("Persistir la selección en la URL... no hace falta compartir/bookmarkear una selección en esta fase"); serializar `{zoneId, quantity}[]` en la URL solo para cruzar de `/entradas` a `/entradas/checkout` reabriría exactamente ese problema (habría que parsear/validar query params contra `getVenueZones()`, manejar params corruptos, etc.) para un beneficio nulo, ya que no hay backend que persista ni bookmarking real que ofrecer. Mantener todo en un único árbol de componentes cliente evita el problema por completo (KISS), a costa de un trade-off aceptado: recargar la página en medio del checkout reinicia el flujo al paso 1 vacío (ya era así en la Fase 4; esta spec no lo cambia) y el botón "atrás" del navegador no retrocede paso a paso (sale de `/eventos/[slug]/entradas` directo a `/eventos/[slug]`).

## Fuera de alcance
- Pago real / pasarela de pago / validación de tarjeta contra un proveedor: el método de pago y los campos de tarjeta son solo estado de formulario local, nunca se envían a ningún servicio.
- Backend, persistencia de la orden, envío de correos reales, generación de PDF real: "Descargar PDF" y "Agregar al calendario" son botones sin `onClick` (placeholders visuales).
- Ruta `/mis-entradas` real (Fase 7): el botón "Ver mis entradas" del paso de confirmación **tampoco** navega (sin `href`/`onClick`) para no ofrecer un enlace que hoy daría 404; se deja como placeholder igual que los otros dos botones de acción, documentado aquí explícitamente.
- Autenticación (Fase 6): no se pide login para comprar.
- Countdown real de reserva de entradas: el aviso "Reservamos tus entradas por..." se muestra como texto estático (sin backend que expire una reserva real, un contador en vivo sería un timer sin nada real detrás de expirar) — no se crea ningún hook de cuenta regresiva para esto.
- QR verificable/escaneable contra un sistema real: el código QR del "ticket stub" es decorativo, generado client-side a partir de un string mock (`TICKETERA-<orderNumber>-<ticketNumber>`), no corresponde a ninguna entrada real validable.
- Máscara de formato en los inputs de tarjeta (espacios automáticos cada 4 dígitos, etc.): el usuario puede escribir el número con o sin espacios, la validación los ignora (ver `checkout.schema.ts`), pero no hay un input enmascarado.
- Navegación con atrás/adelante del navegador entre los 3 pasos del checkout, o bookmarking de un paso intermedio: son estado de componente, no rutas (ver decisión de enrutamiento arriba).
- Cualquier cambio a `VenueZoneMap.tsx`, `ZoneSelectorList.tsx`, `venue-zone.service.ts`, `venue-zones.mock.ts`, el mapa SVG o la lógica de zonas: esta spec no los toca.

## Reutilización
- Existente que se reutiliza: `modules/events/hooks/useTicketSelection.ts` (`lines`, `totalQuantity`, `totalAmount`) — sigue siendo la única fuente de verdad del carrito; se levanta su invocación de `TicketSelectionView` a `CheckoutFlow` (ver "Existente que se extiende") para que sus valores sobrevivan al cambio de paso.
- Existente que se reutiliza: `modules/events/utils/format-event-date.ts` (`formatFullEventDate`) y `lib/format-currency.ts` (`formatPrice`) — fecha y precio en el "ticket stub" y en los resúmenes.
- Existente que se reutiliza: `components/ui/radio-group.tsx` (Base UI, prop `value`/`onValueChange` en `RadioGroup`, `value` requerido en cada `RadioGroupItem`) — selector DNI/Otro del documento de identidad y las 3 radio-cards de método de pago (Tarjeta/Yape/PagoEfectivo). `components/ui/checkbox.tsx` (prop `checked`/`onCheckedChange`) — aceptar términos. `components/ui/input.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/button.tsx` — el resto de campos y contenedores. **No se necesita ningún componente shadcn nuevo** (no hace falta `select`: el selector DNI/Otro son solo 2 opciones, cubiertas con el `radio-group` ya construido a mano en la Fase 4 por el bloqueo de red a `ui.shadcn.com`, que probablemente siga vigente).
- Existente que se extiende:
  - `modules/events/components/TicketSummary.tsx` — gana 3 props opcionales (`ctaLabel`, `ctaDisabled`, `onCtaClick`) para poder reutilizarse tal cual como resumen sticky en el paso de pago (botón "Pagar S/ X") sin duplicar su marcado (Open/Closed); el uso actual en el paso de entradas sigue funcionando con los defaults.
  - `modules/events/components/TicketSelectionView.tsx` — deja de llamar `useTicketSelection` internamente; pasa a recibir `selection` (el resultado del hook, ya calculado por `CheckoutFlow`) y `onContinue` como props, y conecta `onContinue` al `onCtaClick` de `TicketSummary`. Su responsabilidad (renderizar mapa + lista + resumen del paso 1) no cambia, solo deja de poseer el estado.
  - `modules/events/hooks/useTicketSelection.ts` — su interfaz de retorno (hoy `interface UseTicketSelectionResult` sin `export`) pasa a exportarse (`export interface UseTicketSelectionResult`) para poder tiparse como prop de `TicketSelectionView` y como variable en `CheckoutFlow`. Ningún comportamiento del hook cambia; `useTicketSelection.test.ts` (Fase 4) sigue pasando sin modificaciones.
  - `app/eventos/[slug]/entradas/page.tsx` — en vez de renderizar `TicketSelectionView` directamente, renderiza `CheckoutFlow`, pasándole `event` (sigue siendo la variable `Event` completa ya resuelta por `getEventBySlug`, que estructuralmente satisface el `Pick` más amplio que ahora necesita `CheckoutFlow`) y `zones`.
- Nuevo (y por qué no sirve nada existente): se crea el dominio `modules/checkout/` (no existía) porque datos del comprador, método de pago y orden confirmada son un dominio de negocio distinto del catálogo/venue de `modules/events` — por la regla de modularidad de `docs/SETUP.md` 1.1 no deben seguir acumulándose dentro de `modules/events`.
  - `modules/checkout/types/checkout.types.ts`: no existe ningún tipo de comprador/pago/orden.
  - `modules/checkout/schemas/checkout.schema.ts`: no existe ninguna validación zod en el proyecto todavía; se decide usar zod (ya es dependencia instalada pero no wireada) en vez de validación manual porque hay reglas condicionales reales (campos de tarjeta solo obligatorios si el método es "Tarjeta", términos debe ser `true`) que un `z.discriminatedUnion` expresa de forma declarativa y testeable, evitando esparcir `if`s de validación por el componente (SRP/DRY) — no es YAGNI aunque no haya backend real: la validación de formulario es una necesidad de UX presente hoy, no hipotética.
  - `modules/checkout/utils/generate-order-number.ts`, `modules/checkout/utils/build-ticket-stubs.ts`: no existe ninguna utilidad de número de pedido ni de desglose de entradas individuales para el "ticket stub".
  - `modules/checkout/hooks/useCheckoutForm.ts`: no existe ningún hook de formulario; los hooks existentes (`useTicketSelection`, `useHeroCarousel`, `useEventFilters`) resuelven problemas de estado distintos.
  - `modules/checkout/components/CheckoutStepper.tsx`, `BuyerInfoForm.tsx`, `PaymentMethodSection.tsx`, `TicketStubCard.tsx`, `CheckoutPaymentStep.tsx`, `CheckoutConfirmationStep.tsx`, `CheckoutFlow.tsx`: no existe ningún componente de stepper, formulario de comprador, selector de método de pago, "ticket stub", orquestador de paso 2, orquestador de paso 3 ni el orquestador general de los 3 pasos. `CheckoutStepper` se construye una sola vez y la reutiliza `CheckoutFlow` para los 3 pasos (incluido el paso 1, que en la Fase 4 no tenía indicador de stepper) en vez de duplicar un indicador de paso por componente.
- Dependencias a instalar antes de implementar: **`qrcode.react` (`npm install qrcode.react`)**. Se evaluó no sumar dependencia y usar un placeholder visual (grilla de bloques falsos), pero se descarta por verse obviamente falso frente al QR realista del mockup de referencia, y porque generar un QR real a mano implicaría reimplementar un algoritmo de corrección de errores Reed-Solomon no trivial (fuera de alcance/YAGNI en sentido inverso: reinventar una rueda no trivial). Se eligió `qrcode.react@^4.2.0` tras confirmar (`npm view qrcode.react`) que: declara `peerDependencies.react: "^16.8.0 || ^17.0.0 || ^18.0.0 || ^19.0.0"` (compatible con React 19.2.8 del proyecto), no tiene dependencias propias (`dependencies: {}`), pesa ~115KB sin comprimir, y expone el componente `QRCodeSVG` (SVG, sin `canvas`) usado como `<QRCodeSVG value="..." />`. No se necesita ningún componente shadcn nuevo (ver arriba).

## Criterios de aceptación
- AC-1: `npm run build` (gate de TypeScript) pasa sin errores con el checkout completo integrado.
- AC-2: `npx vitest run` pasa para todos los archivos de test nuevos (`checkout.schema.test.ts`, `generate-order-number.test.ts`, `build-ticket-stubs.test.ts`, `useCheckoutForm.test.ts`) y para los ya existentes de la Fase 4 (`useTicketSelection.test.ts`, `venue-zone.service.test.ts`), sin modificarlos.
- AC-3: `modules/checkout/types/checkout.types.ts` define `CheckoutStep = "tickets" | "payment" | "confirmation"`, `DocumentType = "dni" | "other"`, `PaymentMethod = "card" | "yape" | "pagoefectivo"`, `BuyerInfo` (`fullName`, `email`, `documentType`, `documentNumber`, `phone`, todos `string` salvo `documentType: DocumentType`), `CardDetails` (`cardNumber`, `expiry`, `cvv`, `cardholderName`, todos `string`) y `ConfirmedOrder` (`orderNumber: string`, `eventTitle: string`, `eventImageUrl: string`, `venueName: string`, `city: string`, `startDate: string`, `lines: TicketSelectionLine[]` — importado con `import type` desde `@/modules/events/hooks/useTicketSelection`, sin redefinir esa forma —, `totalQuantity: number`, `totalAmount: number`).
- AC-4: `modules/checkout/schemas/checkout.schema.ts` exporta `buyerInfoSchema` (`fullName` min 3 caracteres tras `trim`, `email` formato válido, `documentType` enum `"dni"|"other"`, `documentNumber` que matchea `/^[A-Za-z0-9]{6,12}$/` tras `trim`, `phone` que matchea `/^\d{6,15}$/` tras `trim`), `cardDetailsSchema` (`cardNumber` sin espacios internos matchea `/^\d{16}$/` tras remover espacios, `expiry` matchea `/^(0[1-9]|1[0-2])\/\d{2}$/`, `cvv` matchea `/^\d{3,4}$/`, `cardholderName` min 3 caracteres tras `trim`) y `checkoutFormSchema = z.discriminatedUnion("paymentMethod", [...])` con 3 variantes: `{ paymentMethod: "card", buyer: buyerInfoSchema, card: cardDetailsSchema, termsAccepted: z.literal(true) }`, `{ paymentMethod: "yape", buyer: buyerInfoSchema, termsAccepted: z.literal(true) }`, `{ paymentMethod: "pagoefectivo", buyer: buyerInfoSchema, termsAccepted: z.literal(true) }` — verificado en `checkout.schema.test.ts` con: buyer+card válidos y método `"card"` (éxito), buyer válido y método `"yape"` sin campo `card` (éxito), email inválido (falla), `termsAccepted: false` (falla), método `"card"` con `cardNumber` inválido (falla).
- AC-5: `modules/checkout/utils/generate-order-number.ts` exporta `generateOrderNumber(): string` que devuelve un valor que matchea `/^TKT-[A-Z0-9]{6}$/`, verificado en `generate-order-number.test.ts` junto con un caso que llama la función repetidas veces (ej. 20) y verifica que no hay colisiones (todos los valores son distintos).
- AC-6: `modules/checkout/utils/build-ticket-stubs.ts` exporta `TicketStub` (`zoneName: string`, `price: number`, `ticketNumber: number`, `totalTickets: number`) y `buildTicketStubs(lines: TicketSelectionLine[]): TicketStub[]` que expande cada línea en `quantity` entradas individuales, numerando `ticketNumber` de forma correlativa y global empezando en `1` a través de todas las líneas (no reinicia por zona), con `totalTickets` igual a la suma de todas las `quantity` en cada entrada resultante — verificado en `build-ticket-stubs.test.ts` con 2 líneas de cantidades distintas (ej. `2` y `1`, produce 3 stubs numerados `1,2,3` con `totalTickets: 3`) y con `lines: []` (devuelve `[]`).
- AC-7: `useCheckoutForm()` en `modules/checkout/hooks/useCheckoutForm.ts` devuelve en su estado inicial: `buyer` con `fullName`, `email`, `documentNumber`, `phone` en `""` y `documentType: "dni"`; `card` con sus 4 campos en `""`; `paymentMethod: "card"`; `termsAccepted: false`; `errors: {}`.
- AC-8: `updateBuyerField(field, value)` y `updateCardField(field, value)` actualizan únicamente el campo indicado de `buyer`/`card` sin afectar los demás campos ni `paymentMethod`/`termsAccepted`; `setPaymentMethod(method)` cambia `paymentMethod` sin tocar `card` (los valores de `card` no se limpian al cambiar de método); `setTermsAccepted(accepted)` cambia `termsAccepted` — verificado en `useCheckoutForm.test.ts` con `act`.
- AC-9: `validate(): boolean` construye internamente el payload a validar (incluye `card` solo cuando `paymentMethod === "card"`) y lo pasa a `checkoutFormSchema.safeParse`; si es válido, pone `errors: {}` y devuelve `true`; si no, llena `errors` con una entrada por cada `issue` de zod usando `issue.path.join(".")` como clave (ej. `errors["buyer.email"]`, `errors["termsAccepted"]`, `errors["card.cardNumber"]`) y devuelve `false` — verificado en `useCheckoutForm.test.ts` con: todos los campos válidos y método `"card"` (devuelve `true`), todos los campos de comprador válidos y método `"yape"` sin haber tocado `card` (devuelve `true`, confirma que los campos de tarjeta vacíos no generan error cuando el método no es tarjeta), `email` inválido (devuelve `false` y `errors["buyer.email"]` está definido), `termsAccepted` en `false` (devuelve `false` y `errors["termsAccepted"]` está definido).
- AC-10: `CheckoutStepper({ currentStep }: { currentStep: CheckoutStep })` itera un arreglo ordenado `["tickets", "payment", "confirmation"]` con etiquetas "Entradas", "Datos y pago", "Confirmación"; para cada paso compara su índice contra el de `currentStep`: índice menor aplica una clase de "completado", índice igual una clase de "actual", índice mayor una clase de "pendiente", las tres visualmente distintas — verificable leyendo el código (ej. 3 ramas de `cn()`).
- AC-11: `BuyerInfoForm({ values, errors, onChange })` (recibe `values: BuyerInfo`, `errors: Partial<Record<string, string>>`, `onChange: (field: keyof BuyerInfo, value: string) => void`) renderiza 4 campos: nombre completo, correo, documento de identidad (un `RadioGroup` con 2 `RadioGroupItem` de valores `"dni"`/`"other"` + un `Input` para el número) y celular; cada campo muestra el mensaje de `errors["buyer.<campo>"]` cuando existe.
- AC-12: `PaymentMethodSection({ paymentMethod, card, termsAccepted, errors, onPaymentMethodChange, onCardFieldChange, onTermsChange })` renderiza un `RadioGroup` de 3 opciones estilo tarjeta (Tarjeta/Yape/PagoEfectivo) con valores `"card"`/`"yape"`/`"pagoefectivo"`; los 4 campos de tarjeta (`Input` para número, vencimiento, CVV, nombre en la tarjeta) se renderizan únicamente cuando `paymentMethod === "card"` (verificable leyendo el código: un `{paymentMethod === "card" && (...)}` o equivalente); un `Checkbox` de "Acepto los términos y condiciones" controlado por `termsAccepted`/`onTermsChange`; cada campo muestra el mensaje de `errors["card.<campo>"]`/`errors["termsAccepted"]` cuando existe.
- AC-13: `TicketStubCard({ eventTitle, eventImageUrl, venueName, city, startDate, stub, qrValue })` (`stub: TicketStub`) renderiza: imagen del evento vía `next/image` con `unoptimized`, `eventTitle`, `venueName` + `city`, `formatFullEventDate(startDate)`, `stub.zoneName` + `formatPrice(stub.price)`, un divisor con clase de borde punteado (ej. `border-dashed`), un `<QRCodeSVG value={qrValue} />` importado de `qrcode.react`, y el texto `Entrada {stub.ticketNumber} de {stub.totalTickets}`.
- AC-14: `TicketSummary` acepta 3 props nuevas opcionales: `ctaLabel?: string` (default `"Continuar"`), `ctaDisabled?: boolean` (cuando no se pasa, el default sigue siendo `totalQuantity === 0`, calculado con `??`), `onCtaClick?: () => void`; el botón usa `ctaLabel` como texto, su estado `disabled` es `ctaDisabled` si se pasó explícitamente o el default en otro caso, y ejecuta `onCtaClick` en el click si se pasó — el uso ya existente de `TicketSummary` en `TicketSelectionView` (sin pasar `ctaLabel`/`ctaDisabled`) conserva el texto "Continuar" y el disabled por `totalQuantity === 0`.
- AC-15: `CheckoutPaymentStep({ lines, totalQuantity, totalAmount, onConfirm })` llama a `useCheckoutForm()` una sola vez y renderiza, en este orden: `CheckoutStepper` con `currentStep="payment"`, un aviso de tiempo límite de texto estático (ej. "Reservamos tus entradas por 10:00", sin lógica de cuenta regresiva real — ver "Fuera de alcance"), `BuyerInfoForm`, `PaymentMethodSection` y `TicketSummary` con `lines`/`totalQuantity`/`totalAmount`, `ctaLabel={`Pagar ${formatPrice(totalAmount)}`}`, `ctaDisabled={!termsAccepted}` y `onCtaClick` apuntando a un handler que llama `validate()` y solo invoca `onConfirm()` cuando devuelve `true` (si devuelve `false`, no se llama `onConfirm` y los `errors` quedan visibles en el formulario).
- AC-16: `CheckoutConfirmationStep({ order }: { order: ConfirmedOrder })` renderiza, en este orden: `CheckoutStepper` con `currentStep="confirmation"`, un ícono de éxito + "¡Compra confirmada!" + el texto `order.orderNumber`, un grid con un `TicketStubCard` por cada elemento de `buildTicketStubs(order.lines)` (pasándole los campos de `order` y `qrValue={`TICKETERA-${order.orderNumber}-${stub.ticketNumber}`}`), una fila de 3 `Button` ("Ver mis entradas", "Agregar al calendario", "Descargar PDF") ninguno con `href` ni `onClick`, y 3 `Card` informativas de contenido estático (revisa tu correo / muestra tu QR / todo en Mis entradas).
- AC-17: `CheckoutFlow({ event, zones })` (`event: Pick<Event, "title" | "slug" | "imageUrl" | "venueName" | "city" | "startDate">`, `zones: VenueZone[]`) es un Client Component (`"use client"`) que llama a `useTicketSelection(zones)` una sola vez, mantiene `step: CheckoutStep` (inicial `"tickets"`) y `confirmedOrder: ConfirmedOrder | null` (inicial `null`) en estado, renderiza `CheckoutStepper` (o delega ese renderizado a cada sub-paso, ver AC-10/15/16 — en cualquier caso solo se instancia una vez por render, no una vez por paso) y condicionalmente: `TicketSelectionView` cuando `step === "tickets"` (pasándole `event`, `zones`, `selection` = el resultado de `useTicketSelection` y `onContinue` que hace `setStep("payment")`), `CheckoutPaymentStep` cuando `step === "payment"` (pasándole `lines`/`totalQuantity`/`totalAmount` del mismo `useTicketSelection` y `onConfirm` que genera un `ConfirmedOrder` con `generateOrderNumber()` + los datos de `event` + `lines`/`totalQuantity`/`totalAmount` del momento, lo guarda en `confirmedOrder` y hace `setStep("confirmation")`), y `CheckoutConfirmationStep` cuando `step === "confirmation"` y `confirmedOrder` no es `null` (le pasa `order={confirmedOrder}`).
- AC-18: `TicketSelectionView` ya no llama a `useTicketSelection`; su firma pasa a `TicketSelectionView({ event, zones, selection, onContinue }: { event: Pick<Event, "title" | "slug">, zones: VenueZone[], selection: UseTicketSelectionResult, onContinue: () => void })`, desestructura los valores de `selection` (mismos nombres que antes: `activeZoneId`, `quantities`, `lines`, `totalQuantity`, `totalAmount`, `selectZone`, `increment`, `decrement`, `getZoneStatus`) y pasa `onContinue` como `onCtaClick` a `TicketSummary` — verificable leyendo el código, sin ningún `useState`/`useTicketSelection` propio en el archivo.
- AC-19: `useTicketSelection.ts` exporta `UseTicketSelectionResult` (`export interface UseTicketSelectionResult`) además de `TicketSelectionLine`, sin cambiar ningún otro comportamiento del hook.
- AC-20: `app/eventos/[slug]/entradas/page.tsx` renderiza `CheckoutFlow` (en vez de `TicketSelectionView` directamente) pasándole `event` y `zones`; no se crea ningún archivo nuevo bajo `app/` para los pasos 2 o 3 del checkout (verificable por la ausencia de rutas nuevas, ej. no existe `app/eventos/[slug]/entradas/checkout/` ni `app/eventos/[slug]/entradas/confirmacion/`).

## Tareas

### T1 — Contratos del dominio checkout: tipos + schema de validación
Define las formas de datos de comprador/pago/orden y la validación zod (discriminada por método de pago) que van a reusar el hook (T3), los componentes (T4/T5) y el orquestador (T6).
- Archivos:
  - `modules/checkout/types/checkout.types.ts` (crear)
  - `modules/checkout/schemas/checkout.schema.ts` (crear)
  - `modules/checkout/schemas/checkout.schema.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-3, AC-4
- Tests: `checkout.schema.test.ts` — buyer+card válidos con método `"card"`; buyer válido con método `"yape"` sin `card` (éxito); `email` inválido (falla); `termsAccepted: false` (falla); `cardNumber` inválido con método `"card"` (falla).
- [x] Completada

### T2 — Utilidades puras de checkout: número de pedido + desglose de entradas
Lógica pura sin estado: generación de número de pedido mock y expansión de líneas de compra en entradas individuales numeradas para el "ticket stub".
- Archivos:
  - `modules/checkout/utils/generate-order-number.ts` (crear)
  - `modules/checkout/utils/generate-order-number.test.ts` (crear)
  - `modules/checkout/utils/build-ticket-stubs.ts` (crear)
  - `modules/checkout/utils/build-ticket-stubs.test.ts` (crear)
- Depende de: ninguna
- Grupo paralelo: G1
- Cubre: AC-5, AC-6
- Tests: `generate-order-number.test.ts` — formato `/^TKT-[A-Z0-9]{6}$/`, sin colisiones en 20 llamadas. `build-ticket-stubs.test.ts` — 2 líneas con cantidades distintas (numeración correlativa global y `totalTickets` correcto), `lines: []` (devuelve `[]`).
- [x] Completada

### T3 — Hook de formulario de checkout
Estado del formulario de comprador/pago/términos con validación vía el schema de T1, consumido por `CheckoutPaymentStep` (T5).
- Archivos:
  - `modules/checkout/hooks/useCheckoutForm.ts` (crear)
  - `modules/checkout/hooks/useCheckoutForm.test.ts` (crear)
- Depende de: T1
- Grupo paralelo: G2
- Cubre: AC-7, AC-8, AC-9
- Tests: `useCheckoutForm.test.ts` (con `renderHook`/`act`) — estado inicial; `updateBuyerField`/`updateCardField`/`setPaymentMethod`/`setTermsAccepted` aíslan su campo; `validate()` con todos los campos válidos y método `"card"` (true), con método `"yape"` sin tocar `card` (true), con `email` inválido (false + `errors["buyer.email"]`), con `termsAccepted` en `false` (false + `errors["termsAccepted"]`).
- [x] Completada

### T4 — Piezas presentacionales del checkout: stepper, formulario de comprador, método de pago, ticket stub
Componentes sin estado propio no trivial: indicador de 3 pasos reutilizable, formulario de datos del comprador, selector de método de pago + campos de tarjeta + términos, y la tarjeta visual de una entrada individual con QR.
- Archivos:
  - `modules/checkout/components/CheckoutStepper.tsx` (crear)
  - `modules/checkout/components/BuyerInfoForm.tsx` (crear)
  - `modules/checkout/components/PaymentMethodSection.tsx` (crear)
  - `modules/checkout/components/TicketStubCard.tsx` (crear)
- Depende de: T1, T2
- Grupo paralelo: G2
- Cubre: AC-10, AC-11, AC-12, AC-13
- Tests: no aplica (componentes presentacionales sin lógica propia no trivial — SETUP.md 3.2)
- Nota no bloqueante del reviewer (ronda 1): en `PaymentMethodSection.tsx` el `RadioGroupItem` enfocable tiene `className="sr-only"` y el `<label>` que lo envuelve no refleja el foco por teclado visualmente (funciona con mouse/Space, pero Tab no muestra qué tarjeta está enfocada). Pendiente de pulir antes de la verificación visual final de esta fase.
- [x] Completada

### T5 — Orquestadores de paso 2 y 3 + extensión de TicketSummary
Compone T3 (hook) + T4 (piezas) en las vistas completas de "Datos y pago" y "Confirmación"; extiende `TicketSummary` (Fase 4) para poder reutilizarse como CTA "Pagar" del paso 2.
- Archivos:
  - `modules/checkout/components/CheckoutPaymentStep.tsx` (crear)
  - `modules/checkout/components/CheckoutConfirmationStep.tsx` (crear)
  - `modules/events/components/TicketSummary.tsx` (modificar)
- Depende de: T1, T2, T3, T4
- Grupo paralelo: G3
- Cubre: AC-14, AC-15, AC-16
- Tests: no aplica (componentes de composición y extensión de props sobre un presentacional ya exento en la Fase 4 — SETUP.md 3.2)
- [x] Completada

### T6 — Orquestador general de los 3 pasos + conexión a la ruta existente
`CheckoutFlow` levanta `useTicketSelection` y gobierna el cambio de paso entre T5 y la vista de selección de la Fase 4 (adaptada a props controladas); se conecta en la ruta ya existente, sin crear rutas nuevas.
- Archivos:
  - `modules/checkout/components/CheckoutFlow.tsx` (crear)
  - `modules/events/components/TicketSelectionView.tsx` (modificar)
  - `modules/events/hooks/useTicketSelection.ts` (modificar)
  - `app/eventos/[slug]/entradas/page.tsx` (modificar)
- Depende de: T1, T2, T5
- Grupo paralelo: G4
- Cubre: AC-1, AC-2, AC-17, AC-18, AC-19, AC-20
- Tests: no aplica (componente de composición/orquestación y wiring de props ya testeados en T1-T5 — SETUP.md 3.2)
- [ ] Completada

## Fases siguientes
- Fase 6: auth UI (login/registro, split screen, solo UI).
- Fase 7: "Mis entradas" (incluye crear la ruta real `/mis-entradas` que el botón "Ver mis entradas" de esta fase todavía no conecta).
- Fase 8: dashboard de organizador (baja prioridad).
