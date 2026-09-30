import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatPrice } from "@/lib/format-currency"
import type { Event } from "@/modules/events/types/event.types"

interface EventTicketSidebarProps {
  event: Pick<Event, "slug" | "priceFrom">
}

export function EventTicketSidebar({ event }: EventTicketSidebarProps) {
  return (
    <aside className="lg:sticky lg:top-24">
      <Card>
        <CardContent className="flex flex-col gap-3">
          <span className="text-sm text-muted-foreground">Entradas desde</span>
          <span className="font-heading text-2xl font-semibold text-foreground">
            {formatPrice(event.priceFrom)}
          </span>
          <Button
            size="lg"
            className="w-full"
            nativeButton={false}
            render={<Link href={`/eventos/${event.slug}/entradas`} />}
          >
            Elegir entradas
          </Button>
        </CardContent>
      </Card>
    </aside>
  )
}
