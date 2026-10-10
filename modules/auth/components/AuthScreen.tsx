"use client"

import { useState } from "react"
import Image from "next/image"
import { SignIn, SignUp } from "@clerk/nextjs"
import { TicketIcon } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AuthTab = "login" | "register"

export function AuthScreen({ defaultTab = "login" }: { defaultTab?: AuthTab }) {
  const [activeTab, setActiveTab] = useState<AuthTab>(defaultTab)

  return (
    <div className="grid flex-1 md:grid-cols-2">
      <div className="relative hidden flex-col justify-end gap-4 overflow-hidden p-10 md:flex">
        <Image
          src="https://picsum.photos/seed/ticketera-ingresar/1200/1600"
          alt=""
          fill
          unoptimized
          className="object-cover"
        />
        <div className="absolute inset-0 bg-brand-dark/85" />

        <div className="relative flex flex-col gap-6 text-brand-dark-foreground">
          <div className="flex items-center gap-2 font-heading text-lg font-bold">
            <TicketIcon className="size-6" />
            Ticketera
          </div>

          <div className="flex flex-col gap-2">
            <h1 className="font-heading text-3xl font-semibold">
              Tus entradas, siempre a mano.
            </h1>
            <p className="text-base text-brand-dark-foreground/90">
              Compra en minutos y lleva tu QR en el celular.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)}>
            <TabsList className="mb-6 w-full">
              <TabsTrigger value="login" className="flex-1">
                Iniciar sesión
              </TabsTrigger>
              <TabsTrigger value="register" className="flex-1">
                Crear cuenta
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <SignIn routing="hash" signUpUrl="/ingresar" fallbackRedirectUrl="/" />
            </TabsContent>

            <TabsContent value="register">
              <SignUp routing="hash" signInUrl="/ingresar" fallbackRedirectUrl="/" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
