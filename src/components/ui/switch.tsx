import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Chave de seleção (toggle) **apresentacional** no padrão da plataforma. Não é
 * interativa por si — o elemento pai (button/label) cuida do clique, permitindo
 * escolher se a área de seleção é só a chave ou a linha inteira.
 */
export function Switch({ checked, className }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors",
        checked ? "border-primary bg-primary" : "border-input bg-muted",
        className,
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform",
          checked ? "translate-x-4" : "translate-x-0.5",
        )}
      />
    </span>
  );
}
