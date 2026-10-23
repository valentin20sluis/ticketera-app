"use server";

import { getDb } from "@/lib/db/client";
import { INVALID_EMAIL, newsletterEmailSchema } from "@/modules/newsletter/schemas/newsletter.schema";
import { subscribe } from "@/modules/newsletter/services/newsletter.service";

const FAILED = "No se pudo completar la suscripción. Intenta de nuevo.";

export type NewsletterState = { error?: string; success?: boolean };

// Public action. An already-subscribed email returns the same success (no leak of who is subscribed).
export async function subscribeAction(_prev: NewsletterState, formData: FormData): Promise<NewsletterState> {
  const parsed = newsletterEmailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: INVALID_EMAIL };
  try {
    await subscribe(await getDb(), parsed.data);
    return { success: true };
  } catch {
    return { error: FAILED };
  }
}
