import { PanelComingSoon } from "@/modules/panel/components/PanelComingSoon";
import { requireRole } from "@/modules/users/services/current-user.service";

export default async function SuperAdminOrganizersPage() {
  await requireRole(["super_admin"]);

  return (
    <PanelComingSoon
      title="Organizadores"
      description="Venues, eventos y ventas por organizador."
    />
  );
}
