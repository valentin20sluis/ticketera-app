import type { Metadata } from "next";
import { getDb } from "@/lib/db/client";
import { PlatformSummaryStats } from "@/modules/admin/components/PlatformSummaryStats";
import { getPlatformSummary } from "@/modules/admin/services/get-platform-summary.service";
import { parsePlatformFeePercent } from "@/modules/payments/utils/platform-fee";
import { requireRole } from "@/modules/users/services/current-user.service";

export const metadata: Metadata = {
  title: "Panel de administración | Ticketera",
};

function readFeePercent(): number | null {
  try {
    return parsePlatformFeePercent(process.env.PLATFORM_FEE_PERCENT);
  } catch {
    return null;
  }
}

export default async function SuperAdminDashboardPage() {
  await requireRole(["super_admin"]);
  const db = await getDb();
  const summary = await getPlatformSummary(db, readFeePercent());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Panel de administración</h1>
        <p className="text-sm text-gray-500">Métricas globales de la plataforma.</p>
      </div>

      <PlatformSummaryStats summary={summary} />
    </div>
  );
}
