import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getModule } from "@/lib/modules";
import { cn } from "@/lib/utils";

/**
 * Banner (hero) das páginas de módulo: gradiente forte da cor do módulo,
 * ícone em vidro, rótulo do módulo, título, subtítulo e ações (botões do
 * banner ficam brancos/vidro — ver `.page-hero` em globals.css).
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
    <header
      className={cn(
        "page-hero relative isolate overflow-hidden rounded-3xl px-5 py-5 text-white sm:px-7 sm:py-6 print:hidden",
        className,
      )}
    >
      <HeroRings />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {Icon && (
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 shadow-inner ring-1 ring-inset ring-white/30 backdrop-blur">
              <Icon className="h-7 w-7" />
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{eyebrow}</p>
            )}
            <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm font-medium text-white/80">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Anéis decorativos do banner. */
export function HeroRings() {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute -right-10 -top-16 -z-10 h-64 w-64 text-white/15"
      viewBox="0 0 200 200"
      fill="none"
    >
      <circle cx="100" cy="100" r="96" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="70" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="44" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * Banner de página interna (paciente, aferição, rotina…): mesmo gradiente do
 * módulo, com "voltar" em vidro, avatar do leito, selos e ações.
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
    <header
      className={cn(
        "page-hero relative isolate overflow-hidden rounded-3xl px-5 pb-5 pt-4 text-white sm:px-7 sm:pb-6 print:hidden",
        className,
      )}
    >
      <HeroRings />
      {back && (
        <Link
          href={back.href}
          className="relative -ml-1 mb-3 inline-flex min-h-8 items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur transition hover:bg-white/25"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {back.label}
        </Link>
      )}
      <div className="relative flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          {bed !== undefined && (
            <span className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-white text-[hsl(var(--accent-foreground))] shadow-lg">
              <span className="text-[11px] font-bold uppercase leading-none tracking-wider opacity-70">Leito</span>
              <span className="text-xl font-extrabold leading-tight">{bed || "—"}</span>
            </span>
          )}
          <div className="min-w-0">
            {eyebrow && (
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">{eyebrow}</p>
            )}
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">{title}</h1>
            {(badges || meta) && (
              <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm font-medium text-white/85">
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
