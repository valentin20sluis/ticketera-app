import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface SectionHeaderProps {
  title: string;
  actionHref?: string;
}

export function SectionHeader({ title, actionHref }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="text-2xl font-semibold text-foreground md:text-3xl">
        {title}
      </h2>
      {actionHref ? (
        <Link
          href={actionHref}
          aria-label={`Ver todo: ${title}`}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary outline-none transition-colors duration-150 ease-out hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
        >
          Ver todo
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
