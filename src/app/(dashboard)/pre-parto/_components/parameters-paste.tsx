"use client";

import { useEffect, useState } from "react";
import type { Observation } from "@/core/patients/types";
import { renderParametersBlock } from "@/core/prontuario/preparto-evolution";
import { CopyButton } from "@/components/copy-button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type Window = 12 | 24 | null;
const WINDOW_KEY = "easygo.paramsWindow";
const OPTIONS: { v: Window; label: string }[] = [
  { v: 12, label: "12 h" },
  { v: 24, label: "24 h" },
  { v: null, label: "Todas" },
];

/**
 * Texto para colar no prontuário: horários e aferições da janela escolhida.
 * A caixa é editável (ajuste antes de copiar); trocar a janela regenera o texto.
 */
export function ParametersPaste({ observations }: { observations: Observation[] }) {
  const [win, setWin] = useState<Window>(12);
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(WINDOW_KEY);
      if (raw) setWin(raw === "all" ? null : (Number(raw) as Window));
    } catch {
      // sem localStorage
    }
    setReady(true);
  }, []);

  // Gerado no navegador: horários no fuso do aparelho.
  useEffect(() => {
    if (ready) setText(renderParametersBlock(observations, win));
  }, [observations, win, ready]);

  const choose = (v: Window) => {
    setWin(v);
    try {
      window.localStorage.setItem(WINDOW_KEY, v == null ? "all" : String(v));
    } catch {
      // sem localStorage
    }
  };

  const count = text ? text.split("\n").length - 1 : 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="field-label">Colar no prontuário</span>
          <div className="flex rounded-md border bg-white p-0.5" role="group" aria-label="Período">
            {OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                aria-pressed={win === o.v}
                onClick={() => choose(o.v)}
                className={cn(
                  "min-h-7 rounded px-2.5 text-xs font-medium transition-colors",
                  win === o.v ? "chip-on" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <CopyButton text={text} />
      </div>
      <Textarea
        aria-label="Parâmetros para colar no prontuário"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={Math.min(14, Math.max(4, count + 2))}
        className="font-mono text-[13px] leading-relaxed"
      />
      {ready && count === 0 && (
        <p className="text-xs text-muted-foreground">Nenhuma aferição neste período.</p>
      )}
    </div>
  );
}
