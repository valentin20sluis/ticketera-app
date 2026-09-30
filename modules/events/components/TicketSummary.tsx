import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/format-currency"
import { cn } from "@/lib/utils"

export interface TicketSummaryLine {
  zoneId: string
  zoneName: string
  price: number
  quantity: number
  subtotal: number
}

interface TicketSummaryProps {
  lines: TicketSummaryLine[]
  totalQuantity: number
  totalAmount: number
}

export function TicketSummary({ lines, totalQuantity, totalAmount }: TicketSummaryProps) {
  return (
    <Card
      className={cn(
        "fixed inset-x-0 bottom-0 z-20 rounded-none border-t shadow-lg",
        "lg:sticky lg:top-24 lg:inset-auto lg:rounded-xl lg:border-t-0 lg:shadow-none"
      )}
    >
      <CardContent className="flex flex-col gap-3">
        <h3 className="font-heading text-base font-semibold text-foreground">
          Resumen de compra
        </h3>

        {lines.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Selecciona una zona para ver tu resumen de compra.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              {lines.map((line) => (
                <div
                  key={line.zoneId}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="text-muted-foreground">
                    {line.quantity} × {line.zoneName}
                  </span>
                  <span className="font-medium text-foreground">
                    {formatPrice(line.subtotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <span className="font-medium text-foreground">Total</span>
              <span className="font-heading text-lg font-semibold text-foreground">
                {formatPrice(totalAmount)}
              </span>
            </div>
          </div>
        )}

        <Button size="lg" className="w-full" disabled={totalQuantity === 0}>
          Continuar
        </Button>
      </CardContent>
    </Card>
  )
}
