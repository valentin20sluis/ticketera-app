import { Ticket } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/shared/Container";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const FOOTER_COLUMNS = [
  {
    title: "Descubre",
    links: ["Conciertos", "Deportes", "Teatro", "Festivales", "Familia"],
  },
  {
    title: "Ayuda",
    links: [
      "Centro de ayuda",
      "Términos y condiciones",
      "Política de privacidad",
      "Libro de reclamaciones",
    ],
  },
  {
    title: "Síguenos",
    links: ["Instagram", "Facebook", "TikTok", "YouTube"],
  },
] as const;

const PAYMENT_METHODS = ["Visa", "Mastercard", "Yape", "Plin"] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-card">
      <Container className="py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 text-xl font-bold text-foreground">
              <Ticket className="size-6 text-primary" aria-hidden="true" />
              Ticketera
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Compra entradas para conciertos, deportes, teatro, festivales y
              planes en familia, de forma rápida y segura.
            </p>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <p className="mb-2 text-sm font-semibold text-foreground">
                {column.title}
              </p>
              <ul>
                {column.links.map((label) => (
                  <li key={label}>
                    <Link
                      href="#"
                      className="inline-flex min-h-11 items-center rounded-lg text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              Métodos de pago:
            </span>
            {PAYMENT_METHODS.map((method) => (
              <Badge key={method} variant="outline" className="h-6 px-3">
                {method}
              </Badge>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Ticketera. Todos los derechos
            reservados.
          </p>
        </div>
      </Container>
    </footer>
  );
}
