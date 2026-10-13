# Dashboard del super-admin

Estado: aprobada

## Objetivo

Reemplazar el `PanelComingSoon` de `app/(panel)/super-admin/page.tsx` (ruta de aterrizaje del panel de administración) por métricas globales de la plataforma: usuarios por rol, organizadores activos, eventos por estado, entradas vendidas, ingresos brutos y comisión de plataforma acumulada. Trello 10. Modelo de datos: `lib/db/schema.ts` (`users.role`, `users.isSuspended`, `users.deletedAt`, `events.status`, `orders.status`/`totalAmount`/`currency`). La comisión sigue la tarea 02 (`modules/payments/utils/platform-fee.ts`).

Decisiones (defaults del demo):
- **Órdenes que cuentan**: solo `orders.status = 'paid'` (igual que `getOrganizerSummary`).
- **Ingresos brutos** = suma de `orders.total_amount` de órdenes pagadas. Moneda PEN (`formatPrice`, "S/").
- **Comisión acumulada**: no se persiste. Se recalcula por orden pagada con `calculatePlatformFee(Math.round(total * 100), feePercent)` (centavos, igual que `createCheckoutSession`) y se suma; se muestra en soles (÷100). `feePercent` viene de `parsePlatformFeePercent(process.env.PLATFORM_FEE_PERCENT)` en la página y se inyecta al servicio.
- **Organizador activo** = `role = 'organizer'`, `is_suspended = false`, `deleted_at IS NULL` y ≥1 evento `published`.
- **Usuarios por rol**: excluye `deleted_at IS NOT NULL`; suspendidos se cuentan en su rol.
- **Período**: todo el historial; sin selector.

## Alcance

- Incluye: servicio de agregación `getPlatformSummary(db, feePercent)` con tests; tarjetas de métricas; página con `requireRole(["super_admin"])`.
- No incluye: selector de período, gráficos, series temporales, exportar, persistir la comisión, otras monedas, caché.

## Reutilizar

- `modules/organizer/components/OrganizerSummaryStats.tsx`: su `StatCard` (privado) se extrae a `components/shared/StatCard.tsx` y se reutiliza en ambos (DRY). `OrganizerSummaryStats` mantiene su API y salida.
- `modules/organizer/services/get-organizer-summary.service.ts` y su test: patrón (DB inyectada `Db`, solo `paid`, agregados SQL con `coalesce(sum(...))`, `Number(...)` del resultado) y `placeOrder`/`setup` del test.
- `modules/payments/utils/platform-fee.ts` (`calculatePlatformFee`, `parsePlatformFeePercent`, `InvalidPlatformFeeError`).
- `lib/format-currency.ts` (`formatPrice`), `modules/users/constants.ts` (`ROLE_LABELS`), `modules/users/services/current-user.service.ts` (`requireRole`), `lib/db/test-helpers.ts` (`createTestDb`).
- Iconos `lucide-react` ya instalados. Sin shadcn ni dependencias nuevas.

## Archivos

- Crear: `modules/admin/services/get-platform-summary.service.ts` y `.test.ts`
- Crear: `components/shared/StatCard.tsx`
- Modificar: `modules/organizer/components/OrganizerSummaryStats.tsx` (importa `StatCard`)
- Crear: `modules/admin/components/PlatformSummaryStats.tsx`
- Modificar: `app/(panel)/super-admin/page.tsx`

(`modules/admin/` es nuevo: el dominio "administración de plataforma" no cabe en `users` ni `organizer`.)

## Criterios de aceptación

- AC1: `getPlatformSummary(db, feePercent)` devuelve `{ usersByRole: Record<UserRole, number>, activeOrganizers, eventsByStatus: Record<EventStatus, number>, ticketsSold, grossRevenue, platformFee }`; roles/estados sin filas valen 0 (claves siempre presentes); con DB vacía todo es 0.
- AC2: `usersByRole` excluye usuarios con `deleted_at`; incluye suspendidos.
- AC3: `activeOrganizers` cuenta solo organizadores no suspendidos, no eliminados, con ≥1 evento `published`; un organizador con varios eventos publicados cuenta una vez.
- AC4: `eventsByStatus` cuenta todos los eventos por `draft|published|cancelled|suspended`.
- AC5: `ticketsSold` y `grossRevenue` suman solo órdenes `paid` (ignoran pending/expired/cancelled), de todos los organizadores y estados de evento.
- AC6: `platformFee` = suma por orden pagada de `calculatePlatformFee(round(total*100), feePercent) / 100`; con 10 % y órdenes de S/ 100.00 y S/ 10.55 da 10 + 1.06 (redondeo por orden, no sobre el total); con `feePercent = 0` da 0.
- AC7: La página exige `requireRole(["super_admin"])` antes de consultar; si `PLATFORM_FEE_PERCENT` es inválido, el dashboard igual carga y la tarjeta de comisión muestra "No disponible" (sin lanzar).
- AC8: La página muestra tarjetas: Entradas vendidas, Ingresos brutos, Comisión de plataforma, Organizadores activos, Usuarios por rol (usa `ROLE_LABELS`) y Eventos por estado (etiquetas en español), con `StatCard`; en estado vacío muestra ceros. `OrganizerSummaryStats` se ve igual que antes.
- AC9: `npm run lint`, `npm run test` y `npm run build` pasan.

## Tests requeridos

Vitest con `createTestDb`, junto al archivo (`get-platform-summary.service.test.ts`): DB vacía (AC1), usuarios eliminados/suspendidos (AC2), organizador activo vs. suspendido/eliminado/sin evento publicado/varios eventos (AC3), eventos por estado (AC4), órdenes no pagadas ignoradas e ingresos multi-organizador (AC5), comisión con redondeo por orden y `feePercent` 0 (AC6). `StatCard`/`PlatformSummaryStats`/página: sin test (presentacionales, SETUP.md §3.2).

## Tareas

### T1 — Servicio de agregación
- Archivos: `modules/admin/services/get-platform-summary.service.ts`, `modules/admin/services/get-platform-summary.service.test.ts`
- Depende de: —
- Paralelizable: sí
- Cubre: AC1, AC2, AC3, AC4, AC5, AC6

### T2 — Tarjetas (StatCard compartida + PlatformSummaryStats)
- Archivos: `components/shared/StatCard.tsx`, `modules/organizer/components/OrganizerSummaryStats.tsx`, `modules/admin/components/PlatformSummaryStats.tsx`
- Depende de: —
- Paralelizable: sí (props del componente: tipo `PlatformSummary` exportado por T1; T2 puede definir las props con un tipo local equivalente o importar el tipo cuando T1 termine)
- Cubre: AC8

### T3 — Página
- Archivos: `app/(panel)/super-admin/page.tsx`
- Depende de: T1, T2
- Paralelizable: no
- Cubre: AC7, AC9

## Preguntas abiertas

1. **Definición de "organizador activo"**. Default: no suspendido, no eliminado, ≥1 evento publicado. Alternativa: contar también quien tenga ventas recientes (descartado por requerir período).
2. **Fee inválido/ausente**. Default: tarjeta de comisión "No disponible" y el resto carga. Alternativa: error 503 como el checkout.
3. **Comisión por orden vs. cobro real de Stripe**. Default: se recalcula con el porcentaje actual; si el porcentaje cambió en el tiempo, el histórico diverge. Aceptado en el demo (no se persiste).

## Próximas fases

- Selector de período (7d/30d/año) y series por día.
- Persistir `application_fee` por orden para exactitud histórica.
- Top organizadores / eventos por ventas.

## Pendientes humanos

- Verificar en el navegador con datos reales (`npm run dev`, entrar como super_admin): cifras coherentes con `/organizador` y `/super-admin/usuarios`, tarjetas legibles en 375 px, y que un admin/organizador no accede a `/super-admin`.
- Confirmar que `PLATFORM_FEE_PERCENT` está definido en `.env.local` del entorno.
