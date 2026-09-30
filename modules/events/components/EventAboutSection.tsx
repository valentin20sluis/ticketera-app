interface EventAboutSectionProps {
  description: string
}

export function EventAboutSection({ description }: EventAboutSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-heading text-xl font-semibold text-foreground">
        Acerca del evento
      </h2>
      <p className="text-sm whitespace-pre-line text-muted-foreground sm:text-base">
        {description}
      </p>
    </section>
  )
}
