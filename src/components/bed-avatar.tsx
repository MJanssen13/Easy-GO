import { cn } from "@/lib/utils";

/** Leito em destaque nos cards: número grande, só tipografia (sem caixa colorida). */
export function BedAvatar({ bed, alert, className }: { bed?: string | null; alert?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex w-10 shrink-0 flex-col items-center border-r pr-3 leading-none",
        alert ? "text-rose-700" : "text-slate-900",
        className,
      )}
    >
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Leito</span>
      <span className="mt-1 font-mono text-xl font-semibold tabular-nums">{bed || "—"}</span>
    </span>
  );
}

/** Marca discreta de pendência no topo do card (só quando há alerta). */
export function CardStrip({ alert }: { alert?: boolean }) {
  if (!alert) return null;
  return <span aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-rose-400" />;
}
