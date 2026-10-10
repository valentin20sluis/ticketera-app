import { SiteFooter } from "@/components/shared/SiteFooter";
import { SiteNavbar } from "@/components/shared/SiteNavbar";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <SiteNavbar />
      <main className="flex flex-1 flex-col">{children}</main>
      <SiteFooter />
    </div>
  );
}
