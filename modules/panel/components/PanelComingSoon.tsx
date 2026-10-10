interface PanelComingSoonProps {
  title: string;
  description: string;
}

export function PanelComingSoon({ title, description }: PanelComingSoonProps) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="h-28 flex-1 min-w-[200px] rounded-2xl border border-gray-200 bg-white" />
        <div className="h-28 flex-1 min-w-[200px] rounded-2xl border border-gray-200 bg-white" />
        <div className="h-28 flex-1 min-w-[200px] rounded-2xl border border-gray-200 bg-white" />
      </div>
      <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-white text-sm text-gray-500">
        Próximamente
      </div>
    </div>
  );
}
