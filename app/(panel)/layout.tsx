import { getCurrentUser } from "@/modules/users/services/current-user.service";
import { PanelShell } from "@/modules/panel/components/PanelShell";

// Session is already required by proxy.ts for every route under this group;
// getCurrentUser() here is only to know the role/name to render in the shell.
export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <PanelShell role={user?.role ?? "customer"} fullName={user?.fullName ?? "Usuario"}>
      {children}
    </PanelShell>
  );
}
