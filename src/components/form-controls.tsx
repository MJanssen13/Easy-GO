"use client";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/** Rótulo + campo associados (clicar no rótulo foca o campo). */
export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-medium leading-none">{label}</span>
      {children}
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
  className,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Linha de exame físico: rótulo + frase editável + atalhos opcionais. */
export function ExamLine({
  label,
  value,
  onChange,
  hint,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>
        <Input className="h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
        {hint && <span className="shrink-0 text-[10px] text-muted-foreground">{hint}</span>}
      </label>
      {children && <div className="flex flex-wrap gap-1.5 sm:pl-16">{children}</div>}
    </div>
  );
}
