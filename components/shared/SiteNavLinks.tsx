import Link from "next/link"

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: NavLink[] = [
  { label: "Eventos", href: "/eventos" },
  { label: "Categorías", href: "/#categorias" },
  { label: "Cómo funciona", href: "/#como-funciona" },
]

interface SiteNavLinksProps {
  variant: "desktop" | "mobile"
}

export function SiteNavLinks({ variant }: SiteNavLinksProps) {
  if (variant === "mobile") {
    return (
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
    )
  }

  return (
    <nav className="hidden items-center gap-6 text-sm font-medium text-foreground md:flex">
      {NAV_LINKS.map((link) => (
        <Link key={link.label} href={link.href} className="hover:text-brand">
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
