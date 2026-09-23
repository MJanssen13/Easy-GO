"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Seções colapsáveis dos formulários longos (PSGO, Pré-Natal) + índice fixo.
 * Cada `Section` dentro de um `SectionNavProvider` se registra no índice
 * (`SectionIndex`), que mostra as seções em ordem, marca as preenchidas e, ao
 * clicar, abre a seção e rola até ela.
 */

interface NavItem {
  label: string;
  filled: boolean;
  el: HTMLElement | null;
  reveal: () => void;
}

interface NavCtx {
  items: Record<string, NavItem>;
  register: (key: string, item: NavItem) => void;
  unregister: (key: string) => void;
}

const SectionNavContext = createContext<NavCtx | null>(null);

/** Provedor do índice; renderiza uma `div` (use `className` para o layout). */
export function SectionNavProvider({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [items, setItems] = useState<Record<string, NavItem>>({});

  const register = useCallback((key: string, item: NavItem) => {
    setItems((prev) => {
      const cur = prev[key];
      if (cur && cur.label === item.label && cur.filled === item.filled && cur.el === item.el) {
        // Só atualiza a função de abrir (sem re-render).
        cur.reveal = item.reveal;
        return prev;
      }
      return { ...prev, [key]: item };
    });
  }, []);

  const unregister = useCallback((key: string) => {
    setItems((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const value = useMemo(() => ({ items, register, unregister }), [items, register, unregister]);
  return (
    <SectionNavContext.Provider value={value}>
      <div className={className}>{children}</div>
    </SectionNavContext.Provider>
  );
}

/**
 * Card de seção colapsável. `headerExtra` recebe ações/badges (fora do toggle).
 * Pode ser controlada por `open`/`onOpenChange` (ex.: abrir ao adicionar item).
 * `navLabel` (rótulo curto no índice; padrão = `title` se texto) e `filled`
 * (marca ✓ no índice) só têm efeito dentro de um `SectionNavProvider`.
 */
export function Section({
  title,
  children,
  headerExtra,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  id,
  contentClassName,
  navLabel,
  filled = false,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  id?: string;
  contentClassName?: string;
  navLabel?: string;
  filled?: boolean;
}) {
  const [openState, setOpenState] = useState(defaultOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : openState;
  const setOpen = (updater: boolean | ((o: boolean) => boolean)) => {
    const next = typeof updater === "function" ? updater(open) : updater;
    if (isControlled) onOpenChange?.(next);
    else setOpenState(next);
  };

  const nav = useContext(SectionNavContext);
  const key = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const label = navLabel ?? (typeof title === "string" ? title : "");
  const register = nav?.register;
  const unregister = nav?.unregister;
  const revealRef = useRef(() => {});
  revealRef.current = () => setOpen(true);

  useEffect(() => {
    if (!register || !label) return;
    register(key, { label, filled, el: cardRef.current, reveal: () => revealRef.current() });
  }, [register, key, label, filled]);
  useEffect(() => {
    if (!unregister) return;
    return () => unregister(key);
  }, [unregister, key]);

  return (
    <Card id={id} ref={cardRef} className="scroll-mt-32 lg:scroll-mt-24">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 sm:px-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-9 flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "" : "-rotate-90"
            }`}
          />
          <span className="text-base font-semibold leading-none tracking-tight">{title}</span>
          {nav && filled && (
            <Check className="h-4 w-4 shrink-0 text-emerald-600" aria-label="Preenchida" />
          )}
        </button>
        {headerExtra && <div className="ml-auto flex max-w-full items-center gap-2">{headerExtra}</div>}
      </div>
      {open && (
        <div className={`px-5 pb-5 sm:px-6 sm:pb-6 ${contentClassName ?? ""}`}>
          {children}
          {/* Botão de recolher a seção (^), ao fim do conteúdo. */}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Recolher seção"
              title="Recolher"
              className="inline-flex h-8 w-14 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/**
 * Índice fixo (sticky) das seções: um chip por seção, na ordem da página, com ✓
 * nas preenchidas e destaque na seção visível. Clicar abre e rola até ela.
 */
export function SectionIndex({ className }: { className?: string }) {
  const nav = useContext(SectionNavContext);
  const [active, setActive] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  const entries = useMemo(() => {
    const list = Object.entries(nav?.items ?? {});
    return list.sort(([, a], [, b]) => {
      if (!a.el || !b.el) return 0;
      return a.el.compareDocumentPosition(b.el) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    });
  }, [nav?.items]);

  // Seção ativa = última cujo topo já passou logo abaixo do índice.
  useEffect(() => {
    const onScroll = () => {
      const limit = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 48;
      let cur: string | null = entries[0]?.[0] ?? null;
      for (const [k, it] of entries) {
        if (it.el && it.el.getBoundingClientRect().top <= limit) cur = k;
      }
      // No fim da página as últimas seções não chegam ao topo: ativa a última visível.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        for (const [k, it] of entries) {
          if (it.el && it.el.getBoundingClientRect().top < window.innerHeight) cur = k;
        }
      }
      setActive(cur);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [entries]);

  // Mantém o chip ativo visível na barra (rolagem horizontal).
  useEffect(() => {
    if (!active) return;
    // Rola só a barra (scrollIntoView interromperia a rolagem suave da página).
    const bar = barRef.current;
    const chip = bar?.querySelector<HTMLElement>(`[data-key="${CSS.escape(active)}"]`);
    if (!bar || !chip) return;
    const left = chip.offsetLeft - bar.offsetLeft;
    if (left < bar.scrollLeft) bar.scrollLeft = left - 8;
    else if (left + chip.offsetWidth > bar.scrollLeft + bar.clientWidth)
      bar.scrollLeft = left + chip.offsetWidth - bar.clientWidth + 8;
  }, [active]);

  if (!nav || entries.length === 0) return null;
  const done = entries.filter(([, it]) => it.filled).length;

  function go(it: NavItem) {
    it.reveal();
    // Espera a seção abrir antes de rolar.
    requestAnimationFrame(() => it.el?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <div
      className={cn(
        "sticky top-16 z-10 -mx-1 rounded-2xl border bg-white/90 px-2 py-2 shadow-card backdrop-blur-xl lg:top-4",
        className,
      )}
    >
      <div ref={barRef} className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:thin]">
        <span
          className="shrink-0 px-1 text-xs font-medium text-muted-foreground"
          title="Seções preenchidas"
        >
          {done}/{entries.length}
        </span>
        {entries.map(([k, it]) => (
          <button
            key={k}
            data-key={k}
            type="button"
            onClick={() => go(it)}
            className={cn(
              "inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active === k
                ? "border-primary bg-primary text-primary-foreground"
                : it.filled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {it.filled && <Check className="h-3 w-3" />}
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
