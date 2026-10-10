import Link from "next/link"
import { MenuIcon, TicketIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { AuthNavSection } from "@/modules/auth/components/AuthNavSection"
import { SiteNavLinks } from "@/components/shared/SiteNavLinks"
import { isSuperAdmin } from "@/modules/users/services/current-user.service"

export async function SiteNavbar() {
  const showAdminLink = await isSuperAdmin()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 font-heading text-lg font-bold text-foreground"
        >
          <TicketIcon className="size-6 text-brand" />
          Ticketera
        </Link>

        <SiteNavLinks variant="desktop" />

        <div className="hidden items-center gap-3 md:flex">
          <AuthNavSection variant="desktop" isSuperAdmin={showAdminLink} />
        </div>

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menú"
              />
            }
          >
            <MenuIcon />
          </SheetTrigger>
          <SheetContent className="md:hidden">
            <SheetHeader>
              <SheetTitle>Ticketera</SheetTitle>
            </SheetHeader>
            <SiteNavLinks variant="mobile" />
            <SheetFooter className="gap-2">
              <AuthNavSection variant="mobile" isSuperAdmin={showAdminLink} />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
