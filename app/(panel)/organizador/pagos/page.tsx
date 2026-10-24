import type { Metadata } from "next";
import { getDb } from "@/lib/db/client";
import { OrganizerPaymentsView } from "@/modules/organizer/components/OrganizerPaymentsView";
import { getOrganizerPayments } from "@/modules/organizer/services/get-organizer-payments.service";
import { deriveConnectState } from "@/modules/payments/utils/connect-status";
import { parsePlatformFeePercent } from "@/modules/payments/utils/platform-fee";
import { requireRole } from "@/modules/users/services/current-user.service";

export const metadata: Metadata = {
  title: "Pagos | Ticketera",
};

const sinceLast30Days = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

export default async function OrganizerPayoutsPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await requireRole(["organizer"]);
  const { periodo } = await searchParams;
  const period = periodo === "30d" ? "30d" : "todo";

  const db = await getDb();
  const data = await getOrganizerPayments(db, user, {
    feePercent: parsePlatformFeePercent(process.env.PLATFORM_FEE_PERCENT),
    since: period === "30d" ? sinceLast30Days() : undefined,
  });

  return <OrganizerPaymentsView data={data} connectState={deriveConnectState(user)} period={period} />;
}
