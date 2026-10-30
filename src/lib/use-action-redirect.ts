"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/**
 * Navega após uma server action que devolve `redirectTo` em vez de chamar
 * `redirect()`. Se a navegação do roteador não concluir em 4 s (rede ruim,
 * requisição abortada), faz navegação completa em vez de travar o botão.
 * Devolve `true` enquanto aguarda a página de destino.
 */
export function useActionRedirect(state: { redirectTo?: string } | undefined): boolean {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const fallback = useRef<number | undefined>(undefined);
  const to = state?.redirectTo;
  useEffect(() => {
    // Mesma página: a revalidação da action já atualizou a tela.
    if (!to || to === window.location.pathname) return;
    startNavigation(() => router.push(to));
    fallback.current = window.setTimeout(() => window.location.assign(to), 4000);
    return () => window.clearTimeout(fallback.current);
  }, [state, to, router]);
  // Navegação concluída: cancela o plano B.
  useEffect(() => {
    if (!navigating) window.clearTimeout(fallback.current);
  }, [navigating]);
  return navigating;
}
