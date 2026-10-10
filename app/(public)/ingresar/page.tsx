import type { Metadata } from "next"

import { AuthScreen } from "@/modules/auth/components/AuthScreen"

export const metadata: Metadata = {
  title: "Iniciar sesión | Ticketera",
}

export default function AuthPage() {
  return <AuthScreen />
}
