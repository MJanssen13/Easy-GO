"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, Hospital, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { MODULES, type ModuleDef } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { ModuleTile } from "@/components/module-tile";

const GROUPS: ModuleDef["group"][] = ["Internação", "Atendimento", "Utilitários"];
const COLLAPSE_KEY = "easygo.sidebarCollapsed";

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Dica ao lado do item quando o menu está recolhido. */
function Tip({ show, children }: { show: boolean; children: React.ReactNode }) {
  if (!show) return null;
  return (
    <span className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
      {children}
    </span>
  );
}

function Brand({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", collapsed ? "justify-center" : "px-2")}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[linear-gradient(135deg,hsl(var(--grad-from)),hsl(var(--grad-to)))] text-white shadow-md shadow-primary/25">
        <Activity className="h-5 w-5" />
      </span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-[15px] font-bold tracking-tight">Easy-GO</span>
          <span className="block text-[11px] font-medium text-muted-foreground">GO · HC-UFTM</span>
        </span>
      )}
    </Link>
  );
}

function NavList({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = (href: string, label: string, icon: React.ReactNode, active: boolean) => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      aria-label={label}
      className={cn(
        "group relative flex items-center gap-3 rounded-xl py-1.5 text-sm font-medium transition-colors",
        collapsed ? "justify-center px-0" : "px-2",
        active
          ? "bg-white text-foreground shadow-card ring-1 ring-border/60"
          : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
      )}
    >
      {icon}
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
      {collapsed && active && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
      <Tip show={!!collapsed}>{label}</Tip>
    </Link>
  );
  return (
    <nav className={cn(collapsed ? "space-y-3" : "space-y-5")}>
      <div>
        {item(
          "/",
          "Plantão",
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <Hospital className="h-[18px] w-[18px]" />
          </span>,
          isActive(pathname, "/"),
        )}
      </div>
      {GROUPS.map((g) => (
        <div key={g} className="space-y-1">
          {collapsed ? (
            <div className="mx-auto mb-2 h-px w-6 bg-border" />
          ) : (
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g}</p>
          )}
          {MODULES.filter((m) => m.group === g).map((m) =>
            item(`/${m.slug}`, m.label, <ModuleTile m={m} size="sm" />, isActive(pathname, `/${m.slug}`)),
          )}
        </div>
      ))}
    </nav>
  );
}

function UserBox({ signOut, collapsed }: { signOut: () => Promise<void>; collapsed?: boolean }) {
  if (collapsed)
    return (
      <form action={signOut} className="flex justify-center">
        <button
          type="submit"
          aria-label="Sair"
          className="group relative flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white"
        >
          E
          <Tip show>Equipe HC-UFTM · sair</Tip>
        </button>
      </form>
    );
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-white/70 p-2">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
        E
      </span>
      <span className="min-w-0 flex-1 leading-tight">
        <span className="block truncate text-sm font-semibold">Equipe HC-UFTM</span>
        <span className="block truncate text-[11px] text-muted-foreground">Obstetrícia e Ginecologia</span>
      </span>
      <form action={signOut}>
        <button
          type="submit"
          title="Sair"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

/** Abas inferiores no celular (uso à beira-leito): os módulos mais usados + menu. */
const MOBILE_TABS = ["pre-parto", "puerperio", "psgo", "pre-natal"];

export function AppShell({ children, signOut }: { children: React.ReactNode; signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setDrawer(false), [pathname]);

  // Estado do menu lembrado no aparelho; Ctrl/⌘+B alterna.
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // sem localStorage
    }
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        // sem localStorage
      }
      return !c;
    });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const current = MODULES.find((m) => isActive(pathname, `/${m.slug}`));

  return (
    <div className={cn("min-h-screen transition-[padding] duration-200", collapsed ? "lg:pl-[4.5rem]" : "lg:pl-64")}>
      {/* Barra lateral (desktop) — recolhível */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col gap-6 border-r border-border/60 bg-[hsl(var(--sidebar))] py-5 transition-[width] duration-200 lg:flex print:hidden",
          collapsed ? "w-[4.5rem] px-3" : "w-64 px-3",
        )}
      >
        <div className={cn("flex items-center", collapsed ? "flex-col gap-3" : "justify-between")}>
          <Brand collapsed={collapsed} />
          <button
            type="button"
            onClick={toggle}
            title={collapsed ? "Expandir menu (Ctrl+B)" : "Recolher menu (Ctrl+B)"}
            aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-white hover:text-foreground"
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        <div className={cn("flex-1", collapsed ? "overflow-visible" : "overflow-y-auto")}>
          <NavList collapsed={collapsed} />
        </div>
        <UserBox signOut={signOut} collapsed={collapsed} />
      </aside>

      {/* Topo (celular/tablet) */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-white/80 px-4 backdrop-blur-xl lg:hidden print:hidden">
        <Brand />
        {current && (
          <span className="ml-auto flex items-center gap-2 text-sm font-semibold">
            <ModuleTile m={current} size="sm" /> {current.label}
          </span>
        )}
      </header>

      <main className="mx-auto w-full max-w-[1600px] px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-8 print:max-w-none print:p-0">
        {children}
        <p className="mt-10 text-center text-[11px] text-muted-foreground/80 print:hidden">
          Easy-GO · Ferramenta de apoio à decisão clínica. Não substitui o julgamento médico. Todo conteúdo deve ser validado pela
          equipe assistencial.
        </p>
      </main>

      {/* Abas inferiores (celular) */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden print:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-6">
          {[
            { href: "/", label: "Plantão", node: <Hospital className="h-5 w-5" /> },
            ...MOBILE_TABS.map((slug) => {
              const m = MODULES.find((x) => x.slug === slug)!;
              const Icon = m.icon;
              return { href: `/${slug}`, label: m.label, node: <Icon className="h-5 w-5" /> };
            }),
          ].map((t) => {
            const active = isActive(pathname, t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span className={cn("rounded-full px-3 py-0.5 transition-colors", active && "bg-primary/10")}>{t.node}</span>
                <span className="max-w-full truncate px-0.5">{t.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium text-muted-foreground"
          >
            <span className="px-3 py-0.5">
              <Menu className="h-5 w-5" />
            </span>
            Mais
          </button>
        </div>
      </nav>

      {/* Gaveta (celular) */}
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawer(false)}>
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm" />
          <div
            className="absolute inset-y-0 left-0 flex w-72 flex-col gap-6 bg-[hsl(var(--sidebar))] px-3 py-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <Brand />
              <button type="button" onClick={() => setDrawer(false)} className="rounded-lg p-2 hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavList onNavigate={() => setDrawer(false)} />
            </div>
            <UserBox signOut={signOut} />
          </div>
        </div>
      )}
    </div>
  );
}
