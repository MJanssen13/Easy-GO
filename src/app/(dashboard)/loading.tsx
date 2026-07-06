import { Loader2 } from "lucide-react";

/**
 * Route-level loading UI. Next.js mostra isto instantaneamente ao navegar entre
 * páginas do dashboard enquanto o Server Component busca os dados — dá resposta
 * imediata ao clique em vez de tela travada.
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm">Carregando…</p>
      </div>
    </div>
  );
}
