"use client";

import { useEffect, useState } from "react";
import { FileText } from "lucide-react";

/**
 * Botão flutuante (celular/tablet) que leva ao prontuário gerado, que fica
 * no fim de formulários longos. Some quando o alvo já está na tela.
 */
export function JumpToOutput({ target = "prontuario", label = "Prontuário" }: { target?: string; label?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = document.getElementById(target);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, [target]);
  if (visible) return null;
  return (
    <button
      type="button"
      onClick={() => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" })}
      className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-20 inline-flex h-11 items-center gap-2 rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-lift lg:hidden print:hidden"
    >
      <FileText className="h-4 w-4" /> {label}
    </button>
  );
}
