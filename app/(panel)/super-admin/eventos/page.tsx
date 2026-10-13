import { getDb } from "@/lib/db/client";
import { OrganizerEventsFilters } from "@/modules/organizer/components/OrganizerEventsFilters";
import { getOrganizerSummary } from "@/modules/organizer/services/get-organizer-summary.service";
import { requireRole } from "@/modules/users/services/current-user.service";

export default async function SuperAdminEventsPage() {
  const user = await requireRole(["super_admin"]);
  const summary = await getOrganizerSummary(await getDb(), user);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
      <header>
        <h1 className="text-2xl font-semibold">Eventos</h1>
        <p className="text-sm text-muted-foreground">
          Todos los eventos de la plataforma. Suspende o reactiva eventos.
        </p>
      </header>
      <OrganizerEventsFilters
        events={summary.events}
        actor={user}
        emptyState={<p>No hay eventos todavía</p>}
      />
    </div>
  );
}
