import type { Metadata } from "next";
import { getDb } from "@/lib/db/client";
import { OrganizerEventsTable } from "@/modules/organizer/components/OrganizerEventsTable";
import { OrganizerSummaryStats } from "@/modules/organizer/components/OrganizerSummaryStats";
import { getOrganizerSummary } from "@/modules/organizer/services/get-organizer-summary.service";
import { requireRole } from "@/modules/users/services/current-user.service";

export const metadata: Metadata = {
  title: "Resumen | Ticketera",
};

export default async function OrganizerOverviewPage() {
  const user = await requireRole(["organizer", "admin", "super_admin"]);
  const db = await getDb();
  const summary = await getOrganizerSummary(db, user.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Resumen</h1>
        <p className="text-sm text-gray-500">Ventas e ingresos de tus eventos publicados.</p>
      </div>

      <OrganizerSummaryStats
        totalTicketsSold={summary.totalTicketsSold}
        totalRevenue={summary.totalRevenue}
        publishedEventsCount={summary.publishedEventsCount}
      />

      <OrganizerEventsTable events={summary.publishedEvents} />
    </div>
  );
}
