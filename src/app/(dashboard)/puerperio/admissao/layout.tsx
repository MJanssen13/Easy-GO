/**
 * Página de admissão sempre dinâmica. Pré-gerada como estática, a resposta da
 * Server Action (admitir → redirecionar à paciente) voltava como cache da
 * página estática e o navegador ficava "carregando" para sempre em produção.
 */
export const dynamic = "force-dynamic";

export default function AdmissionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
