import { getModule } from "@/lib/modules";
import { ModuleTile } from "@/components/module-tile";
import { cn } from "@/lib/utils";

/** Cabeçalho padrão das páginas de módulo: ícone do módulo, título, subtítulo e ações. */
export function PageHeader({
  module,
  title,
  subtitle,
  actions,
  className,
}: {
  module?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const m = module ? getModule(module) : undefined;
  return (
    <div className={cn("flex flex-wrap items-center justify-between gap-4", className)}>
      <div className="flex min-w-0 items-center gap-3.5">
        {m && <ModuleTile m={m} size="lg" />}
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight sm:text-[26px]">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
