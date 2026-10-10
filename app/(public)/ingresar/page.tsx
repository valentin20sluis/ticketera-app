import type { Metadata } from "next"

import { AuthScreen } from "@/modules/auth/components/AuthScreen"

export const metadata: Metadata = {
  title: "Iniciar sesión | Ticketera",
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const query = await searchParams
  const isInvitation = Boolean(query.__clerk_ticket) || query.__clerk_status === "sign_up"

  return <AuthScreen defaultTab={isInvitation ? "register" : "login"} />
}
