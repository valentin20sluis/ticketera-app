"use client"

import Link from "next/link"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession"

interface AuthNavSectionProps {
  variant: "desktop" | "mobile"
}

function getInitials(fullName: string | null, email: string): string {
  const source = fullName?.trim() || email.split("@")[0]
  return source.slice(0, 2).toUpperCase()
}

export function AuthNavSection({ variant }: AuthNavSectionProps) {
  const { session, logout } = useAuthSession()
  const fullWidthClassName = variant === "mobile" ? "w-full" : undefined

  if (!session) {
    return (
      <>
        <Button
          variant={variant === "desktop" ? "ghost" : "outline"}
          className={fullWidthClassName}
          nativeButton={false}
          render={<Link href="/ingresar" />}
        >
          Iniciar sesión
        </Button>
        <Button
          className={cn("bg-cta text-cta-foreground hover:bg-cta/90", fullWidthClassName)}
          nativeButton={false}
          render={<Link href="/organizador" />}
        >
          Vender entradas
        </Button>
      </>
    )
  }

  const displayName = session.fullName ?? session.email
  const initials = getInitials(session.fullName, session.email)

  if (variant === "mobile") {
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
            {initials}
          </span>
          <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
        </div>
        <Button
          variant="outline"
          className="w-full justify-start"
          nativeButton={false}
          render={<Link href="/mis-entradas" />}
        >
          Mis entradas
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start"
          nativeButton={false}
          render={<Link href="/organizador" />}
        >
          Vender entradas
        </Button>
        <Button variant="outline" className="w-full justify-start" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Cuenta de ${displayName}`}
        className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/80 focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem render={<Link href="/mis-entradas" />}>Mis entradas</DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/organizador" />}>Vender entradas</DropdownMenuItem>
        <DropdownMenuItem onClick={logout}>Cerrar sesión</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
