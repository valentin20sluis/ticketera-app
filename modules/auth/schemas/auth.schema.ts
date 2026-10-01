import { z } from "zod"

export const loginFormSchema = z.object({
  email: z.email("Ingresa un correo válido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
})

export const registerFormSchema = z
  .object({
    fullName: z.string().trim().min(3, "Ingresa tu nombre completo"),
    email: z.email("Ingresa un correo válido"),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
    termsAccepted: z.literal(true),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  })
