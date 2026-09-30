import { z } from "zod"

export const buyerInfoSchema = z.object({
  fullName: z.string().trim().min(3, "Ingresa tu nombre completo"),
  email: z.email("Ingresa un correo válido"),
  documentType: z.enum(["dni", "other"]),
  documentNumber: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{6,12}$/, "Ingresa un número de documento válido"),
  phone: z
    .string()
    .trim()
    .regex(/^\d{6,15}$/, "Ingresa un celular válido"),
})

export const cardDetailsSchema = z.object({
  cardNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .pipe(z.string().regex(/^\d{16}$/, "Ingresa un número de tarjeta válido")),
  expiry: z
    .string()
    .regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Ingresa un vencimiento válido (MM/AA)"),
  cvv: z.string().regex(/^\d{3,4}$/, "Ingresa un CVV válido"),
  cardholderName: z.string().trim().min(3, "Ingresa el nombre en la tarjeta"),
})

export const checkoutFormSchema = z.discriminatedUnion("paymentMethod", [
  z.object({
    paymentMethod: z.literal("card"),
    buyer: buyerInfoSchema,
    card: cardDetailsSchema,
    termsAccepted: z.literal(true),
  }),
  z.object({
    paymentMethod: z.literal("yape"),
    buyer: buyerInfoSchema,
    termsAccepted: z.literal(true),
  }),
  z.object({
    paymentMethod: z.literal("pagoefectivo"),
    buyer: buyerInfoSchema,
    termsAccepted: z.literal(true),
  }),
])
