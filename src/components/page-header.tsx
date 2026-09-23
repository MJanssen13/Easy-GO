import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getModule } from "@/lib/modules";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho das páginas de módulo: ícone do módulo em tinta clara, título,
 * subtítulo e ações — sóbrio, como no LabFlow.
 */
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
  const Icon = m?.icon;
  const eyebrow = m && subtitle !== m.label && title !== m.label ? m.label : null;
  return (
    <header className={cn("flex flex-wrap items-center justify-between gap-4 print:hidden", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {Icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-[hsl(var(--accent-foreground))] ring-1 ring-inset ring-primary/10">
            <Icon className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="field-label">{eyebrow}</p>}
          <h1 className="truncate text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Cabeçalho de página interna (paciente, aferição, rotina…): "voltar",
 * leito em destaque, título, selos e ações.
 */
export function PageHero({
  back,
  eyebrow,
  title,
  meta,
  badges,
  actions,
  bed,
  className,
}: {
  back?: { href: string; label: string };
  eyebrow?: string;
  title: string;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  /** Número do leito em destaque (avatar). */
  bed?: string | null;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3 print:hidden", className)}>
      {back && (
        <Link
          href={back.href}
          className="-my-1 inline-flex min-h-8 items-center gap-1 py-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {bed !== undefined && (
            <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-accent text-[hsl(var(--accent-foreground))] ring-1 ring-inset ring-primary/15">
              <span className="text-[11px] font-semibold uppercase leading-none tracking-wide opacity-70">Leito</span>
              <span className="text-lg font-bold leading-tight">{bed || "—"}</span>
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="field-label">{eyebrow}</p>}
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            {(badges || meta) && (
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {badges}
                {meta && <span>{meta}</span>}
              </div>
            )}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
