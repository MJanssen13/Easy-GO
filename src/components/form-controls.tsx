"use client";

import { useEffect, useId, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

const CONTROL = "input:not([type=hidden]),select,textarea";

/**
 * Rótulo + campo(s) para conteúdo composto (ex.: campo com botões ou
 * componente próprio), onde envolver tudo num `<label>` não serve: associa o
 * rótulo ao 1º campo via `aria-labelledby` (leitor de tela) e clicar no rótulo
 * foca esse campo.
 */
export function LabeledBox({
  label,
  children,
  className,
  labelClassName,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
}) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current?.querySelector<HTMLElement>(CONTROL);
    if (el && !el.hasAttribute("aria-label") && !el.hasAttribute("aria-labelledby"))
      el.setAttribute("aria-labelledby", id);
  });
  return (
    <div ref={box} className={cn("space-y-1", className)}>
      <span
        id={id}
        onClick={() => box.current?.querySelector<HTMLElement>(CONTROL)?.focus()}
        className={cn("block text-xs font-medium leading-none", labelClassName)}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

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
        "min-h-8 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "chip-on" : "bg-background text-muted-foreground hover:bg-muted",
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
        {hint && <span className="shrink-0 text-[11px] text-muted-foreground">{hint}</span>}
      </label>
      {children && <div className="flex flex-wrap gap-1.5 sm:pl-16">{children}</div>}
    </div>
  );
}
