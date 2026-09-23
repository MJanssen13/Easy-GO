"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, LayoutDashboard, LogOut, Menu, X } from "lucide-react";
import { MODULES, type ModuleDef } from "@/lib/modules";
import { cn } from "@/lib/utils";
import { ModuleTile } from "@/components/module-tile";

const GROUPS: ModuleDef["group"][] = ["Internação", "Atendimento", "Utilitários"];

function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[linear-gradient(135deg,hsl(var(--grad-from)),hsl(var(--grad-to)))] text-white shadow-md shadow-primary/25">
        <Activity className="h-5 w-5" />
      </span>
      <span className="leading-tight">
        <span className="block text-[15px] font-bold tracking-tight">Easy-GO</span>
        <span className="block text-[11px] font-medium text-muted-foreground">GO · HC-UFTM</span>
      </span>
    </Link>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = (href: string, label: string, icon: React.ReactNode, active: boolean) => (
    <Link
      key={href}
      href={href}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-white text-foreground shadow-card ring-1 ring-border/60" : "text-muted-foreground hover:bg-white/60 hover:text-foreground",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />}
    </Link>
  );
  return (
    <nav className="space-y-5">
      <div>
        {item(
          "/",
          "Plantão",
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <LayoutDashboard className="h-3.5 w-3.5" />
          </span>,
          isActive(pathname, "/"),
        )}
      </div>
      {GROUPS.map((g) => (
        <div key={g} className="space-y-1">
          <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">{g}</p>
          {MODULES.filter((m) => m.group === g).map((m) =>
            item(`/${m.slug}`, m.label, <ModuleTile m={m} size="sm" />, isActive(pathname, `/${m.slug}`)),
          )}
        </div>
      ))}
    </nav>
  );
}

function UserBox({ signOut }: { signOut: () => Promise<void> }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-white/70 p-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">E</span>
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
  useEffect(() => setDrawer(false), [pathname]);
  const current = MODULES.find((m) => isActive(pathname, `/${m.slug}`));

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Barra lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-6 border-r border-border/60 bg-[hsl(var(--sidebar))] px-3 py-5 lg:flex print:hidden">
        <Brand />
        <div className="flex-1 overflow-y-auto">
          <NavList />
        </div>
        <UserBox signOut={signOut} />
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
            { href: "/", label: "Plantão", node: <LayoutDashboard className="h-5 w-5" /> },
            ...MOBILE_TABS.map((slug) => {
              const m = MODULES.find((x) => x.slug === slug)!;
              const Icon = m.icon;
              return { href: `/${slug}`, label: m.label.replace("Onco-Ginecologia", "Onco"), node: <Icon className="h-5 w-5" /> };
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
