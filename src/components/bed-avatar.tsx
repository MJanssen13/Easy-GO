import { cn } from "@/lib/utils";

/** Leito em destaque (cards dos quadros): quadrado com o gradiente do módulo. */
export function BedAvatar({ bed, alert, className }: { bed?: string | null; alert?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        "flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl text-white",
        alert ? "bg-gradient-to-br from-rose-500 to-red-600 shadow-[0_6px_16px_-6px_rgb(225_29_72/0.6)]" : "chip-on",
        className,
      )}
    >
      <span className="text-[11px] font-bold uppercase leading-none tracking-wider opacity-80">Leito</span>
      <span className="text-lg font-extrabold leading-tight">{bed || "—"}</span>
    </span>
  );
}

/** Faixa superior colorida dos cards (vermelha quando há alerta). */
export function CardStrip({ alert }: { alert?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "absolute inset-x-0 top-0 h-1",
        alert
          ? "bg-gradient-to-r from-rose-500 to-red-500"
          : "bg-[linear-gradient(90deg,hsl(var(--grad-from)),hsl(var(--grad-to)))]",
      )}
    />
  );
}
