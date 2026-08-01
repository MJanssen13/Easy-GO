"use client";

import { useState } from "react";
import { Check, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Copia a **passagem de plantão** mantendo a formatação (nome em negrito): grava
 * no clipboard o `text/html` (Calibri 9pt) e o `text/plain` de fallback. Ao colar
 * no documento (Word/Docs) o negrito e a estrutura são preservados.
 */
export function PassagemButton({
  text,
  html,
  count,
  label,
  size = "default",
}: {
  text: string;
  html: string;
  count: number;
  /** Rótulo do botão; padrão "Passagem (N)". */
  label?: string;
  size?: "default" | "sm";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    };
    try {
      if (
        typeof ClipboardItem !== "undefined" &&
        navigator.clipboard &&
        "write" in navigator.clipboard
      ) {
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([html], { type: "text/html" }),
            "text/plain": new Blob([text], { type: "text/plain" }),
          }),
        ]);
        done();
        return;
      }
      await navigator.clipboard.writeText(text);
      done();
    } catch {
      try {
        await navigator.clipboard.writeText(text);
        done();
      } catch {
        /* clipboard indisponível (contexto inseguro) */
      }
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size={size}
      onClick={copy}
      disabled={!count}
      title={count ? "Copiar a passagem de plantão (mantém o formato)" : "Sem dados para a passagem"}
    >
      {copied ? <Check className="h-4 w-4" /> : <ClipboardList className="h-4 w-4" />}
      {copied ? "Copiado" : (label ?? `Passagem (${count})`)}
    </Button>
  );
}
