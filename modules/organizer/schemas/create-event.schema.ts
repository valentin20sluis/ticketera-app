import { z } from "zod";

export const eventDetailsSchema = z.object({
  title: z.string().trim().min(3, "Ingresa un título de al menos 3 caracteres"),
  description: z
    .string()
    .trim()
    .min(10, "Ingresa una descripción de al menos 10 caracteres"),
  categoryId: z.string().min(1, "Selecciona una categoría"),
  imageUrl: z.url({
    protocol: /^https?$/,
    error: "Ingresa una URL de imagen válida (http o https)",
  }),
  doorsOpenTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresa una hora válida (HH:MM)"),
  showStartTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Ingresa una hora válida (HH:MM)"),
  minimumAge: z.string().trim().min(1, "Ingresa la edad mínima"),
  admissionType: z.string().trim().min(1, "Ingresa el tipo de admisión"),
});

export const newVenueSchema = z.object({
  name: z.string().trim().min(3, "Ingresa un nombre de al menos 3 caracteres"),
  address: z.string().trim().min(5, "Ingresa una dirección de al menos 5 caracteres"),
  city: z.string().trim().min(2, "Ingresa una ciudad de al menos 2 caracteres"),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export const venueStepSchema = z.discriminatedUnion("mode", [
  z.object({
    mode: z.literal("existing"),
    venueId: z.string().min(1, "Selecciona un venue"),
  }),
  z.object({
    mode: z.literal("new"),
    venue: newVenueSchema,
  }),
]);

export const zoneRowSchema = z.object({
  name: z.string().trim().min(2, "Ingresa un nombre de al menos 2 caracteres"),
  capacity: z.coerce.number().int().positive("La capacidad debe ser un número positivo"),
  price: z.coerce.number().min(0, "El precio no puede ser negativo"),
});

export const functionZonesStepSchema = z.object({
  startsAt: z.string().min(1, "Ingresa la fecha y hora de la función"),
  zones: z.array(zoneRowSchema).min(1, "Agrega al menos una zona"),
});

export const createEventFormSchema = z.object({
  details: eventDetailsSchema,
  venue: venueStepSchema,
  functionZones: functionZonesStepSchema,
});

export type CreateEventFormValues = z.infer<typeof createEventFormSchema>;
