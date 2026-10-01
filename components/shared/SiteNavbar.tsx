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

const NAV_LINKS = [
  { label: "Eventos", href: "/eventos" },
  { label: "Mis entradas", href: "/mis-entradas" },
  { label: "Categorías", href: "/#categorias" },
  { label: "Cómo funciona", href: "/#como-funciona" },
]

export function SiteNavbar() {
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

        <nav className="hidden items-center gap-6 text-sm font-medium text-foreground md:flex">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-brand">
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" nativeButton={false} render={<Link href="/ingresar" />}>
            Iniciar sesión
          </Button>
          <Button className="bg-cta text-cta-foreground hover:bg-cta/90">
            Vender entradas
          </Button>
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
            <nav className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <SheetFooter className="gap-2">
              <Button
                variant="outline"
                className="w-full"
                nativeButton={false}
                render={<Link href="/ingresar" />}
              >
                Iniciar sesión
              </Button>
              <Button className="w-full bg-cta text-cta-foreground hover:bg-cta/90">
                Vender entradas
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  )
}
