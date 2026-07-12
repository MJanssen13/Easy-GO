"use client";

import { useState } from "react";
import { Printer, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { renderTermosHtml } from "@/core/psgo/termos";
import { letterheadFor } from "@/core/ctg/laudo";
import { printHtml } from "@/lib/print";

/**
 * Botão "Termos" com menu: imprime os termos de consentimento do PSGO com o
 * nome/RG da paciente e a **data do momento da impressão**. Compartilhado pela
 * admissão e pela página da paciente. "Tudo exceto indução" omite o termo de
 * indução do parto.
 */
export function PsgoTermosButton({
  name,
  rg,
  size = "sm",
  variant = "outline",
}: {
  name: string;
  rg: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "secondary";
}) {
  const [open, setOpen] = useState(false);

  function print(includeInducao: boolean) {
    setOpen(false);
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const html = renderTermosHtml(
      {
        name,
        rg,
        date: new Date().toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "2-digit",
        }),
      },
      letterheadFor(origin),
      { includeInducao },
    );
    printHtml(html);
  }

  return (
    <span className="relative inline-flex">
      <Button
        type="button"
        size={size}
        variant={variant}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Imprimir os termos de consentimento"
      >
        <Printer className="h-4 w-4" /> Termos <ChevronDown className="h-3.5 w-3.5 opacity-70" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-52 overflow-hidden rounded-md border bg-background p-1 shadow-lg">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => print(true)}
            className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
          >
            Imprimir tudo
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => print(false)}
            className="block w-full rounded px-3 py-1.5 text-left text-sm hover:bg-muted"
          >
            Tudo exceto indução
          </button>
        </div>
      )}
    </span>
  );
}
