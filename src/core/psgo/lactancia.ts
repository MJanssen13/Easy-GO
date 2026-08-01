/**
 * Segurança na **amamentação** — nível de risco do **e-lactancia.org** (APILAM)
 * por princípio ativo (DCB do CATMAT). Quatro níveis: 0 (mais seguro) → 3
 * (evitar). Em associações, devolve o **componente de maior risco**.
 *
 * É **apoio à decisão — validar**: o e-lactancia não cobre todos os fármacos e
 * não substitui a bula, a idade do lactente e o julgamento clínico.
 */
import { LACTANCIA_DATA, type LactNivel } from "./lactancia-data";
import { componentes } from "./norm-principio";

export type { LactNivel };

export interface LactInfo {
  titulo: string;
  desc: string;
}

export const LACT_INFO: Record<LactNivel, LactInfo> = {
  0: {
    titulo: "Risco muito baixo",
    desc: "Compatível com a amamentação — seguro para o lactente e para a produção de leite.",
  },
  1: {
    titulo: "Risco baixo",
    desc: "Provavelmente compatível; risco leve/improvável — preferir alternativa mais segura quando houver.",
  },
  2: {
    titulo: "Risco alto",
    desc: "Pouco seguro — usar com cautela; avaliar alternativa mais segura ou monitorar o lactente.",
  },
  3: {
    titulo: "Risco muito alto",
    desc: "Evitar na amamentação — buscar alternativa; se imprescindível, avaliar suspender o aleitamento.",
  },
};

export interface LactResultado {
  nivel: LactNivel;
  info: LactInfo;
  /** true se veio de uma associação (nível do componente de maior risco). */
  combinacao: boolean;
}

/**
 * Nível de risco na amamentação para um princípio ativo (ou associação "A + B").
 * Em associações, devolve o **componente de maior risco**. `null` quando nenhum
 * componente é avaliado pelo e-lactancia.
 */
export function lactancia(principioAtivo: string): LactResultado | null {
  const partes = componentes(principioAtivo);
  let pior: LactNivel | null = null;
  for (const p of partes) {
    const n = LACTANCIA_DATA[p];
    if (n !== undefined && (pior === null || n > pior)) pior = n;
  }
  if (pior === null) return null;
  return { nivel: pior, info: LACT_INFO[pior], combinacao: partes.length > 1 };
}
