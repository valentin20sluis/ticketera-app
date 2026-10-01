"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Input } from "@/components/ui/input"

interface PasswordInputProps {
  id: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function PasswordInput({ id, value, onChange, placeholder }: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input
        id={id}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="pr-8"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground"
      >
        {visible ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    </div>
  )
}
