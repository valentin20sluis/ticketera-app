import Link from "next/link";
import { getDb } from "@/lib/db/client";
import { CheckInPanel } from "@/modules/organizer/components/CheckInPanel";
import { listCheckInEvents } from "@/modules/organizer/services/check-in.service";
import { requireRole } from "@/modules/users/services/current-user.service";

export default async function OrganizerCheckInPage() {
  const user = await requireRole(["organizer", "admin", "super_admin"]);
  const events = await listCheckInEvents(await getDb(), user);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Check-in</h1>
        <p className="text-sm text-gray-500">Escanea el QR de las entradas al ingreso de tu evento.</p>
      </div>
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
          <p>No tienes eventos publicados para validar entradas.</p>
          <Link href="/organizador" className="font-medium text-gray-900 underline">
            Ir al panel
          </Link>
        </div>
      ) : (
        <CheckInPanel events={events} />
      )}
    </div>
  );
}
