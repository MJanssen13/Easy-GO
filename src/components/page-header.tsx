import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Cabeçalho das páginas de módulo: título, subtítulo e ações. Sóbrio de
 * propósito — o menu lateral já diz em que módulo se está.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  className,
}: {
  /** Mantido por compatibilidade; o módulo já aparece no menu. */
  module?: string;
  title: string;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4 print:hidden",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 [text-wrap:balance]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/**
 * Cabeçalho de página interna (paciente, aferição, rotina…): voltar, leito,
 * nome/título, selos e ações.
 */
export function PageHero({
  back,
  title,
  meta,
  badges,
  actions,
  bed,
  className,
}: {
  back?: { href: string; label: string };
  /** Mantido por compatibilidade; não é mais exibido. */
  eyebrow?: string;
  title: string;
  meta?: React.ReactNode;
  badges?: React.ReactNode;
  actions?: React.ReactNode;
  /** Leito, mostrado antes do título. */
  bed?: string | null;
  className?: string;
}) {
  return (
    <header className={cn("space-y-2 border-b pb-4 print:hidden", className)}>
      {back && (
        <Link
          href={back.href}
          className="-my-1 inline-flex min-h-8 items-center gap-1 py-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-baseline gap-x-3 text-2xl font-semibold tracking-tight text-slate-900 [text-wrap:balance]">
            {bed !== undefined && (
              <span className="font-mono text-base font-medium tabular-nums text-muted-foreground">
                Leito {bed || "—"}
              </span>
            )}
            <span>{title}</span>
          </h1>
          {(badges || meta) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              {badges}
              {meta && <span>{meta}</span>}
            </div>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
