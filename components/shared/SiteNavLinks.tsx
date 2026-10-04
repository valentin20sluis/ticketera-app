"use client"

import Link from "next/link"

import { useAuthSession } from "@/modules/auth/hooks/useAuthSession"

interface NavLink {
  label: string
  href: string
}

const NAV_LINKS: NavLink[] = [
  { label: "Eventos", href: "/eventos" },
  { label: "Mis entradas", href: "/mis-entradas" },
  { label: "Categorías", href: "/#categorias" },
  { label: "Cómo funciona", href: "/#como-funciona" },
]

interface SiteNavLinksProps {
  variant: "desktop" | "mobile"
}

export function SiteNavLinks({ variant }: SiteNavLinksProps) {
  const { session } = useAuthSession()
  const links = session ? NAV_LINKS : NAV_LINKS.filter((link) => link.href !== "/mis-entradas")

  if (variant === "mobile") {
    return (
      <nav className="flex flex-col gap-1 px-4">
        {links.map((link) => (
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
      {links.map((link) => (
        <Link key={link.label} href={link.href} className="hover:text-brand">
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
