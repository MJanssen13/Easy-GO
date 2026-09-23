"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Rascunho local de formulários longos (localStorage, só neste aparelho):
 * protege contra recarregar a página ou fechar a aba por engano.
 * Não substitui o salvamento no banco — serve para o que ainda não foi salvo.
 */

interface Stored<T> {
  value: T;
  savedAt: string;
}

const PREFIX = "easygo.draft.";

export function readDraft<T>(key: string): Stored<T> | null {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as Stored<T>) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(PREFIX + key);
  } catch {
    // sem localStorage
  }
}

/**
 * Restaura o rascunho ao montar (via `restore`) e grava as mudanças com
 * debounce. `key = null` desliga o rascunho (ex.: admissão já salva no banco).
 * `isEmpty` evita gravar/restaurar formulário vazio.
 * Retorna o horário do rascunho restaurado (para avisar o usuário) e `discard`.
 */
export function useDraft<T>(
  key: string | null,
  value: T,
  restore: (v: T) => void,
  isEmpty: (v: T) => boolean,
): { restoredAt: string | null; discard: () => void } {
  const [restoredAt, setRestoredAt] = useState<string | null>(null);
  const ready = useRef(false);

  useEffect(() => {
    if (!key) return;
    const d = readDraft<T>(key);
    if (d && !isEmpty(d.value)) {
      restore(d.value);
      setRestoredAt(d.savedAt);
    }
    ready.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (!key || !ready.current) return;
    const t = setTimeout(() => {
      if (isEmpty(value)) return clearDraft(key);
      try {
        window.localStorage.setItem(
          PREFIX + key,
          JSON.stringify({ value, savedAt: new Date().toISOString() } satisfies Stored<T>),
        );
      } catch {
        // cota cheia / sem localStorage
      }
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, value]);

  return {
    restoredAt,
    discard: () => {
      if (key) clearDraft(key);
      setRestoredAt(null);
    },
  };
}
