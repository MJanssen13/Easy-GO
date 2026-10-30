"use client";

import { createContext, useActionState, useContext } from "react";
import { useActionRedirect } from "@/lib/use-action-redirect";

export type RedirectState = { redirectTo?: string };
type FormAction = (prev: RedirectState, formData: FormData) => Promise<RedirectState>;

const BusyContext = createContext(false);

/** `true` enquanto o formulário envia ou aguarda a página de destino abrir. */
export const useActionFormBusy = () => useContext(BusyContext);

/**
 * Formulário para Server Actions que devolvem `{ redirectTo }` em vez de
 * chamar `redirect()` (que às vezes trava a navegação em produção).
 */
export function ActionForm({
  action,
  className,
  children,
}: {
  action: FormAction;
  className?: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const navigating = useActionRedirect(state);
  const busy = pending || navigating;
  return (
    <form action={formAction} className={className} aria-busy={busy}>
      <BusyContext.Provider value={busy}>{children}</BusyContext.Provider>
    </form>
  );
}
