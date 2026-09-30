import Link from "next/link"
import { TicketIcon } from "lucide-react"

const EXPLORE_LINKS = [
  { label: "Eventos", href: "/#eventos" },
  { label: "Categorías", href: "/#categorias" },
  { label: "Cómo funciona", href: "/#como-funciona" },
]

const COMPANY_LINKS = [
  { label: "Sobre nosotros", href: "#" },
  { label: "Vender entradas", href: "#" },
  { label: "Contacto", href: "#" },
]

const SOCIAL_LINKS = [
  { label: "Facebook", href: "#" },
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div className="flex flex-col gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-heading text-lg font-bold text-foreground"
          >
            <TicketIcon className="size-6 text-brand" />
            Ticketera
          </Link>
          <p className="text-sm text-muted-foreground">
            Compra y vende entradas para los mejores eventos de música, deporte,
            teatro y más.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Explorar</h3>
          {EXPLORE_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Empresa</h3>
          {COMPANY_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-foreground">Síguenos</h3>
          {SOCIAL_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-border px-4 py-6 text-center text-xs text-muted-foreground sm:px-6 lg:px-8">
        © {new Date().getFullYear()} Ticketera. Todos los derechos reservados.
      </div>
    </footer>
  )
}
