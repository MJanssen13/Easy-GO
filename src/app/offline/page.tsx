import type { Metadata } from "next";
import Link from "next/link";
import { WifiOff } from "lucide-react";

export const metadata: Metadata = { title: "Sem conexão" };
export const dynamic = "force-static";

/** Mostrada pelo service worker quando não há internet. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-sm space-y-4 rounded-2xl border bg-white p-6 text-center shadow-card">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
          <WifiOff className="h-6 w-6" />
        </span>
        <h1 className="text-xl font-bold text-slate-900">Sem conexão</h1>
        <p className="text-sm text-slate-600">
          Os dados das pacientes só abrem com internet, para nunca mostrar informação desatualizada. As ferramentas que
          funcionam no aparelho continuam disponíveis se já foram abertas antes:
        </p>
        <ul className="space-y-1 text-sm font-medium">
          <li><Link className="text-pink-700 hover:underline" href="/pre-natal">Consulta de pré-natal</Link></li>
          <li><Link className="text-pink-700 hover:underline" href="/ferramentas/receita">Receita</Link></li>
          <li><Link className="text-pink-700 hover:underline" href="/ferramentas/documentos">Documentos de apoio</Link></li>
        </ul>
      </div>
    </main>
  );
}
