import { CheckCircle2, CircleAlert, Clock, Ban, Search, TicketX, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CheckInResult } from "@/modules/organizer/services/check-in.service";
import { formatLimaDateTime } from "@/modules/organizer/utils/lima-time";

type Tone = "success" | "warning" | "danger";

type View = { icon: LucideIcon; tone: Tone; title: string; detail?: string };

const TONES: Record<Tone, string> = {
  success: "border-green-300 bg-green-50 text-green-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  danger: "border-red-300 bg-red-50 text-red-900",
};

const lima = (iso: string) => formatLimaDateTime(new Date(iso));

function describe(result: CheckInResult): View {
  switch (result.status) {
    case "admitted":
      return {
        icon: CheckCircle2,
        tone: "success",
        title: "Ingreso permitido",
        detail: `Zona ${result.zoneName}. Función: ${lima(result.functionStartsAt)}. Ingresó: ${lima(result.checkedInAt)}`,
      };
    case "already_used":
      return {
        icon: Clock,
        tone: "warning",
        title: "Entrada ya usada",
        detail: `Zona ${result.zoneName}. Ingresó el ${lima(result.checkedInAt)}`,
      };
    case "wrong_event":
      return {
        icon: CircleAlert,
        tone: "warning",
        title: "Entrada de otro evento",
        detail: `Esta entrada es de "${result.ticketEventTitle}", no del evento seleccionado`,
      };
    case "foreign":
      return { icon: Ban, tone: "danger", title: "Entrada no válida para tus eventos", detail: "No pertenece a tus eventos" };
    case "unpaid":
      return { icon: TicketX, tone: "danger", title: "Orden sin pago confirmado", detail: "La compra no está pagada" };
    case "event_unavailable":
      return { icon: Ban, tone: "danger", title: "Evento no disponible", detail: "El evento no está publicado" };
    case "not_found":
      return { icon: Search, tone: "danger", title: "Entrada no encontrada", detail: "El código no corresponde a ninguna entrada" };
    case "invalid":
      return { icon: CircleAlert, tone: "danger", title: "Código no válido", detail: "El código leído no tiene el formato de una entrada" };
  }
}

type CheckInResultCardProps = { result: CheckInResult | null; error?: string | null };

// Always mounted so screen readers announce the content when it changes.
export function CheckInResultCard({ result, error }: CheckInResultCardProps) {
  const view: View | null = error
    ? { icon: CircleAlert, tone: "danger", title: "No se pudo validar", detail: error }
    : result
      ? describe(result)
      : null;

  return (
    <div role="status" aria-live="polite">
      {view ? (
        <div className={cn("flex items-start gap-3 rounded-xl border p-4", TONES[view.tone])}>
          <view.icon className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-lg font-semibold">{view.title}</p>
            {view.detail ? <p className="text-sm">{view.detail}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
