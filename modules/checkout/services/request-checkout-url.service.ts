import type { CheckoutSessionInput } from "@/modules/checkout/schemas/checkout-session.schema"

export type CheckoutRequestError =
  | "unauthorized"
  | "insufficient_stock"
  | "multiple_events"
  | "organizer_payments_unavailable"
  | "unknown"

async function readErrorCode(response: Response): Promise<string | undefined> {
  try {
    const body = (await response.json()) as { error?: unknown }
    return typeof body.error === "string" ? body.error : undefined
  } catch {
    return undefined
  }
}

export type CheckoutRequestResult =
  | { ok: true; url: string }
  | { ok: false; error: CheckoutRequestError }

export async function requestCheckoutUrl(
  input: CheckoutSessionInput,
): Promise<CheckoutRequestResult> {
  try {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
    if (response.ok) {
      const { url } = (await response.json()) as { url?: string }
      return url ? { ok: true, url } : { ok: false, error: "unknown" }
    }
    if (response.status === 401) return { ok: false, error: "unauthorized" }
    const code = await readErrorCode(response)
    if (response.status === 422 && code === "multiple_events") {
      return { ok: false, error: "multiple_events" }
    }
    if (response.status === 409) {
      // 409 sin código reconocido sigue siendo falta de cupo (compatibilidad)
      return {
        ok: false,
        error: code === "organizer_payments_unavailable" ? code : "insufficient_stock",
      }
    }
    return { ok: false, error: "unknown" }
  } catch {
    return { ok: false, error: "unknown" }
  }
}
