import { Menu, Ticket, X } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/shared/Container";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#events", label: "Eventos" },
  { href: "#this-week", label: "Esta semana" },
  { href: "#organize", label: "Organiza tu evento", highlight: true },
] as const;

const NAV_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-foreground outline-none transition-colors duration-150 ease-out hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none";

const HIGHLIGHT_LINK_CLASS = "rotating-border rounded-full px-4";

function AuthButtons({ className }: { className?: string }) {
  return (
    <div className={className}>
      <Button variant="ghost" className="h-11 px-4 text-sm">
        Iniciar sesión
      </Button>
      <Button className="h-11 px-4 text-sm">Crear cuenta</Button>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <a
        href="#main-content"
        className="sr-only rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground outline-none focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        Saltar al contenido
      </a>
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg text-xl font-bold text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Ticket className="size-6 text-primary" aria-hidden="true" />
          Ticketera
        </Link>

        <nav aria-label="Navegación principal" className="hidden md:block">
          <ul className="flex items-center gap-1">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(NAV_LINK_CLASS, "highlight" in link && HIGHLIGHT_LINK_CLASS)}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <AuthButtons className="hidden items-center gap-2 md:flex" />

        <Sheet>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-11 md:hidden"
                aria-label="Abrir menú"
              />
            }
          >
            <Menu className="size-6" aria-hidden="true" />
          </SheetTrigger>
          <SheetContent side="right" showCloseButton={false}>
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <SheetClose
              render={
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 size-11"
                  aria-label="Cerrar menú"
                />
              }
            >
              <X className="size-5" aria-hidden="true" />
            </SheetClose>
            <nav aria-label="Navegación móvil" className="px-4">
              <ul className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <SheetClose
                      nativeButton={false}
                      role="link"
                      render={
                        <Link
                          href={link.href}
                          className={cn(NAV_LINK_CLASS, "highlight" in link && HIGHLIGHT_LINK_CLASS)}
                        />
                      }
                    >
                      {link.label}
                    </SheetClose>
                  </li>
                ))}
              </ul>
            </nav>
            <SheetFooter>
              <AuthButtons className="flex flex-col gap-2 [&>button]:w-full" />
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  );
}
