"use client"

import Link from "next/link"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession"
import { ROLE_LABELS } from "@/modules/users/constants"
import type { UserRole } from "@/modules/users/types/user.types"

interface AuthNavSectionProps {
  variant: "desktop" | "mobile"
  role: UserRole | null
}

// Without a profile name, fall back to the part of the email before the "@".
function getDisplayName(fullName: string | null, email: string): string {
  return fullName?.trim() || email.split("@")[0]
}

function getInitials(fullName: string | null, email: string): string {
  return getDisplayName(fullName, email).slice(0, 2).toUpperCase()
}

function AccountIdentity({ name, email }: { name: string; email: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-sm font-medium text-foreground">{name}</p>
      {email && <p className="truncate text-xs text-muted-foreground">{email}</p>}
    </div>
  )
}

export function AuthNavSection({ variant, role }: AuthNavSectionProps) {
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

  const displayName = getDisplayName(session.fullName, session.email)
  const initials = getInitials(session.fullName, session.email)
  const isSuperAdmin = role === "super_admin"
  const roleLabel = role ? ROLE_LABELS[role] : null

  if (variant === "mobile") {
    return (
      <div className="flex w-full flex-col gap-3">
        <div className="flex items-center gap-2 px-1">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground">
            {initials}
          </span>
          {roleLabel && <Badge variant="outline">{roleLabel}</Badge>}
          <AccountIdentity name={displayName} email={session.email} />
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
        {isSuperAdmin && (
          <Button
            variant="outline"
            className="w-full justify-start"
            nativeButton={false}
            render={<Link href="/super-admin" />}
          >
            Administrar
          </Button>
        )}
        <Button variant="outline" className="w-full justify-start" onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {roleLabel && <Badge variant="outline">{roleLabel}</Badge>}
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`Cuenta de ${displayName}`}
          className="flex size-8 items-center justify-center rounded-full bg-brand text-sm font-semibold text-brand-foreground transition-colors hover:bg-brand/80 focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {initials}
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <div className="mb-1 border-b border-border px-1.5 pb-2 pt-1">
            <AccountIdentity name={displayName} email={session.email} />
          </div>
          <DropdownMenuItem render={<Link href="/mis-entradas" />}>Mis entradas</DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/organizador" />}>Vender entradas</DropdownMenuItem>
          {isSuperAdmin && (
            <DropdownMenuItem render={<Link href="/super-admin" />}>Administrar</DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={logout}>Cerrar sesión</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
