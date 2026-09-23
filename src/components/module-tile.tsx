import type { ModuleDef } from "@/lib/modules";
import { cn } from "@/lib/utils";

/** Ícone do módulo num quadrado com o gradiente da cor do módulo. */
export function ModuleTile({ m, size = "md" }: { m: Pick<ModuleDef, "icon" | "tile">; size?: "sm" | "md" | "lg" }) {
  const Icon = m.icon;
  const box = size === "sm" ? "h-7 w-7 rounded-lg" : size === "lg" ? "h-12 w-12 rounded-2xl" : "h-9 w-9 rounded-xl";
  const ico = size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-[18px] w-[18px]";
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-gradient-to-br text-white shadow-sm ring-1 ring-inset ring-white/20",
        m.tile,
        box,
      )}
    >
      <Icon className={ico} />
    </span>
  );
}
