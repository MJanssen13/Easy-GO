"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Navega após uma server action que devolve `redirectTo`. Em produção a
 * navegação do roteador às vezes é abortada logo após a action (o botão fica
 * carregando para sempre); se a URL não mudar em 1,5 s, faz navegação completa.
 */
export function useActionRedirect(state: { redirectTo?: string } | undefined) {
  const router = useRouter();
  const to = state?.redirectTo;
  useEffect(() => {
    if (!to) return;
    const from = window.location.pathname;
    const id = window.setTimeout(() => router.push(to), 0);
    const fallback = window.setTimeout(() => {
      if (window.location.pathname === from) window.location.assign(to);
    }, 1500);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(fallback);
    };
  }, [to, router]);
}
