"use client";

import { History, X } from "lucide-react";

/** Aviso de rascunho recuperado, com opção de descartar e começar do zero. */
export function DraftNotice({ restoredAt, onDiscard }: { restoredAt: string | null; onDiscard: () => void }) {
  if (!restoredAt) return null;
  const when = new Date(restoredAt).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900">
      <History className="h-4 w-4 shrink-0" />
      <span className="flex-1">Rascunho de {when} recuperado neste aparelho.</span>
      <button
        type="button"
        onClick={onDiscard}
        className="inline-flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium hover:bg-sky-100"
      >
        <X className="h-4 w-4" /> Descartar e começar do zero
      </button>
    </div>
  );
}
