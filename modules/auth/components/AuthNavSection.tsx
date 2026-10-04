"use client"

import Link from "next/link"

import { Button } from "@/components/ui/button"
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession"

interface AuthNavSectionProps {
  variant: "desktop" | "mobile"
}

export function AuthNavSection({ variant }: AuthNavSectionProps) {
  const { session, logout } = useAuthSession()

  const buttonVariant = variant === "desktop" ? "ghost" : "outline"
  const buttonClassName = variant === "mobile" ? "w-full" : undefined

  if (!session) {
    return (
      <Button
        variant={buttonVariant}
        className={buttonClassName}
        nativeButton={false}
        render={<Link href="/ingresar" />}
      >
        Iniciar sesión
      </Button>
    )
  }

  const displayName = session.fullName ?? session.email

  if (variant === "mobile") {
    return (
      <div className="flex w-full flex-col gap-2">
        <span className="truncate text-sm font-medium text-foreground">{displayName}</span>
        <Button variant={buttonVariant} className={buttonClassName} onClick={logout}>
          Cerrar sesión
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-foreground">{displayName}</span>
      <Button variant={buttonVariant} className={buttonClassName} onClick={logout}>
        Cerrar sesión
      </Button>
    </div>
  )
}
