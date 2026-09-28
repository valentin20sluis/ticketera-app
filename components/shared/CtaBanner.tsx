import Link from "next/link";

import { Button } from "@/components/ui/button";

interface CtaBannerProps {
  title: string;
  description: string;
  actionLabel: string;
  actionHref: string;
}

export function CtaBanner({
  title,
  description,
  actionLabel,
  actionHref,
}: CtaBannerProps) {
  return (
    <div className="flex flex-col items-start gap-6 rounded-xl bg-primary p-6 text-primary-foreground sm:p-8 md:flex-row md:items-center md:justify-between md:p-12">
      <div className="max-w-2xl space-y-2">
        <h2 className="text-2xl font-semibold md:text-3xl">{title}</h2>
        <p className="text-base">{description}</p>
      </div>
      <Button
        variant="secondary"
        className="h-11 shrink-0 px-6 text-base"
        render={<Link href={actionHref} />}
        nativeButton={false}
      >
        {actionLabel}
      </Button>
    </div>
  );
}
