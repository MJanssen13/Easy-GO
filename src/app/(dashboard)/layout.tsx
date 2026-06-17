import Link from "next/link";
import { Activity, LogOut } from "lucide-react";
import { DashboardNav } from "@/components/dashboard-nav";
import { Button } from "@/components/ui/button";
import { signOut } from "./actions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // AUTH TEMPORARIAMENTE DESATIVADA
  const displayName = "Equipe HC-UFTM";
  const initial = "E";

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-20 border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight">
              Easy<span className="text-primary">-GO</span>
            </span>
          </Link>

          <div className="hidden flex-1 md:block">
            <DashboardNav />
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{displayName}</p>
              <p className="text-xs text-muted-foreground">HC-UFTM</p>
            </div>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
              {initial}
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="icon" title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
        <div className="border-t px-2 py-1 md:hidden">
          <DashboardNav />
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>

      <footer className="border-t bg-white px-4 py-3 text-center text-xs text-muted-foreground">
        Easy-GO · Ferramenta de apoio à decisão clínica. Não substitui o julgamento médico. Todo
        conteúdo deve ser validado pela equipe assistencial.
      </footer>
    </div>
  );
}
