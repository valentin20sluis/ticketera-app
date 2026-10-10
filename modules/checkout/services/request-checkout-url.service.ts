import type { CheckoutSessionInput } from "@/modules/checkout/schemas/checkout-session.schema"

export type CheckoutRequestError = "unauthorized" | "insufficient_stock" | "unknown"

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
    if (response.status === 409) return { ok: false, error: "insufficient_stock" }
    return { ok: false, error: "unknown" }
  } catch {
    return { ok: false, error: "unknown" }
  }
}
