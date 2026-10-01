"use client"

import { useEffect, useState, type FormEvent } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { CheckCircleIcon, TicketIcon } from "lucide-react"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { LoginForm } from "@/modules/auth/components/LoginForm"
import { RegisterForm } from "@/modules/auth/components/RegisterForm"
import { useLoginForm } from "@/modules/auth/hooks/useLoginForm"
import { useRegisterForm } from "@/modules/auth/hooks/useRegisterForm"

type AuthTab = "login" | "register"
type AuthStatus = "idle" | "success"

const SUCCESS_REDIRECT_DELAY_MS = 1200

export function AuthScreen() {
  const router = useRouter()
  const loginForm = useLoginForm()
  const registerForm = useRegisterForm()
  const [activeTab, setActiveTab] = useState<AuthTab>("login")
  const [status, setStatus] = useState<AuthStatus>("idle")

  useEffect(() => {
    if (status !== "success") {
      return
    }

    const timeoutId = setTimeout(() => {
      router.push("/")
    }, SUCCESS_REDIRECT_DELAY_MS)

    return () => clearTimeout(timeoutId)
  }, [status, router])

  const handleLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (loginForm.validate()) {
      setStatus("success")
    }
  }

  const handleRegisterSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (registerForm.validate()) {
      setStatus("success")
    }
  }

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
          {status === "success" ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircleIcon className="size-12 text-primary" />
              <p className="text-lg font-medium text-foreground">¡Listo! Redirigiendo...</p>
            </div>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as AuthTab)}
            >
              <TabsList className="mb-6 w-full">
                <TabsTrigger value="login" className="flex-1">
                  Iniciar sesión
                </TabsTrigger>
                <TabsTrigger value="register" className="flex-1">
                  Crear cuenta
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <LoginForm
                  values={loginForm.values}
                  errors={loginForm.errors}
                  isSubmitting={status !== "idle"}
                  onChange={loginForm.updateField}
                  onSubmit={handleLoginSubmit}
                  onSwitchToRegister={() => setActiveTab("register")}
                />
              </TabsContent>

              <TabsContent value="register">
                <RegisterForm
                  fields={registerForm.fields}
                  termsAccepted={registerForm.termsAccepted}
                  errors={registerForm.errors}
                  isSubmitting={status !== "idle"}
                  onFieldChange={registerForm.updateField}
                  onTermsChange={registerForm.setTermsAccepted}
                  onSubmit={handleRegisterSubmit}
                  onSwitchToLogin={() => setActiveTab("login")}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
