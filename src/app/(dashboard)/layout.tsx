import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { DashboardNav } from "@/components/dashboard-nav";
import { ModuleTheme } from "@/components/module-theme";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // AUTH TEMPORARIAMENTE DESATIVADA
  const displayName = "Equipe HC-UFTM";
  const initial = "E";

  return (
    <ModuleTheme className="app-surface flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[linear-gradient(105deg,hsl(var(--grad-from)),hsl(var(--grad-via))_52%,hsl(var(--grad-to)))] text-white shadow-soft">
        <div className="flex h-14 w-full items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white ring-1 ring-white/20 backdrop-blur">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white">Easy-GO</span>
          </Link>

          <div className="hidden flex-1 md:block">
            <DashboardNav />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-white">{displayName}</p>
              <p className="text-xs text-white/60">HC-UFTM</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-sm font-bold text-white ring-1 ring-white/20">
              {initial}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                title="Sair"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
        <div className="border-t border-white/10 px-2 py-1 md:hidden">
          <DashboardNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t bg-white/70 px-4 py-3 text-center text-xs text-muted-foreground">
        Easy-GO · Ferramenta de apoio à decisão clínica. Não substitui o julgamento médico. Todo
        conteúdo deve ser validado pela equipe assistencial.
      </footer>
    </ModuleTheme>
  );
}
