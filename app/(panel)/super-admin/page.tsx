import { PanelComingSoon } from "@/modules/panel/components/PanelComingSoon";
import { requireRole } from "@/modules/users/services/current-user.service";

export default async function SuperAdminDashboardPage() {
  await requireRole(["super_admin"]);

  return (
    <PanelComingSoon
      title="Dashboard"
      description="Métricas globales de la plataforma: eventos, ventas y usuarios."
    />
  );
}
