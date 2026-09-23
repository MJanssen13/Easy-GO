import { cn } from "@/lib/utils";

/** Leito em destaque (cards dos quadros): quadrado com o gradiente do módulo. */
export function BedAvatar({ bed, alert, className }: { bed?: string | null; alert?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl ring-1 ring-inset",
        alert
          ? "bg-rose-50 text-rose-700 ring-rose-200"
          : "bg-accent text-[hsl(var(--accent-foreground))] ring-primary/15",
        className,
      )}
    >
      <span className="text-[11px] font-semibold uppercase leading-none tracking-wide opacity-70">Leito</span>
      <span className="text-base font-bold leading-tight">{bed || "—"}</span>
    </span>
  );
}

/** Marca discreta de pendência no topo do card (só quando há alerta). */
export function CardStrip({ alert }: { alert?: boolean }) {
  if (!alert) return null;
  return <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-rose-400" />;
}
