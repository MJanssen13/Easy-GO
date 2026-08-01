/**
 * Segurança na **gestação** — categoria de risco por princípio ativo (DCB do
 * CATMAT). Fonte primária: **TGA (Austrália)**, o sistema de letras **atual e
 * mantido** (A, B1, B2, B3, C, D, X). Quando a TGA não classifica o fármaco,
 * recorre-se, como reserva, à antiga letra da **FDA** (descontinuada em 2015) —
 * o selo indica de qual sistema veio a categoria.
 *
 * É **apoio à decisão — validar**: nenhum sistema cobre todos os fármacos, as
 * letras não são estritamente hierárquicas e nada substitui a bula, o trimestre
 * e o julgamento clínico.
 */
import { FDA_PREG_DATA, type FdaPregCat } from "./fda-preg-data";
import { TGA_PREG_DATA, type TgaPregCat } from "./tga-preg-data";
import { normKey } from "./norm-principio";

export type { FdaPregCat, TgaPregCat };
export type Sistema = "TGA" | "FDA";
export type GestCat = TgaPregCat | FdaPregCat;

export interface CatInfo {
  titulo: string;
  desc: string;
}

const TGA_INFO: Record<TgaPregCat, CatInfo> = {
  A: {
    titulo: "TGA A",
    desc: "Usado por muitas gestantes sem aumento observado de malformações ou de efeitos nocivos ao feto.",
  },
  B1: {
    titulo: "TGA B1",
    desc: "Dados humanos limitados sem aumento de dano; estudos animais sem evidência de dano fetal.",
  },
  B2: {
    titulo: "TGA B2",
    desc: "Dados humanos limitados sem aumento de dano; dados animais inadequados, mas sem evidência de dano.",
  },
  B3: {
    titulo: "TGA B3",
    desc: "Dados humanos limitados sem aumento de dano; estudos animais mostraram dano fetal (significado incerto em humanos).",
  },
  C: {
    titulo: "TGA C",
    desc: "Causou ou é suspeito de causar efeitos nocivos (farmacológicos, geralmente reversíveis), sem malformações.",
  },
  D: {
    titulo: "TGA D",
    desc: "Causou ou é suspeito de causar aumento de malformações ou dano irreversível ao feto.",
  },
  X: {
    titulo: "TGA X",
    desc: "Risco alto de dano permanente ao feto — não deve ser usado na gestação.",
  },
};

const FDA_INFO: Record<FdaPregCat, CatInfo> = {
  A: { titulo: "FDA A", desc: "Estudos controlados em gestantes não evidenciaram risco ao feto." },
  B: {
    titulo: "FDA B",
    desc: "Sem evidência de risco em humanos (estudos animais tranquilizadores ou estudos humanos ausentes).",
  },
  C: {
    titulo: "FDA C",
    desc: "Risco não pode ser descartado; usar só se o benefício justificar o risco potencial ao feto.",
  },
  D: {
    titulo: "FDA D",
    desc: "Há evidência de risco fetal; aceitável apenas em situações graves sem alternativa mais segura.",
  },
  X: { titulo: "FDA X", desc: "Contraindicado na gestação — o risco supera qualquer benefício." },
};

// Severidade unificada (0 mais seguro → 5 contraindicado) para escolher o
// componente de maior risco de uma associação e a cor do selo. As letras não
// são estritamente hierárquicas; esta ordem é uma aproximação conservadora.
export const SEVERIDADE: Record<GestCat, number> = {
  A: 0,
  B1: 1,
  B2: 1,
  B: 1,
  B3: 2,
  C: 3,
  D: 4,
  X: 5,
};

interface Componente {
  categoria: GestCat;
  sistema: Sistema;
}

/** Categoria de um componente: TGA (primária) e, na falta, FDA (reserva). */
function lookupOne(part: string): Componente | null {
  const k = normKey(part);
  const t = TGA_PREG_DATA[k];
  if (t) return { categoria: t, sistema: "TGA" };
  const f = FDA_PREG_DATA[k];
  if (f) return { categoria: f, sistema: "FDA" };
  return null;
}

export interface GestResultado {
  categoria: GestCat;
  sistema: Sistema;
  info: CatInfo;
  severidade: number;
  /** true se veio de uma associação (categoria do componente de maior risco). */
  combinacao: boolean;
}

/**
 * Categoria de risco na gestação para um princípio ativo (ou associação "A + B").
 * Prefere a TGA; usa a FDA como reserva. Em associações, devolve o **componente
 * de maior risco**. Devolve `null` quando nenhum componente é classificado.
 */
export function gestacao(principioAtivo: string): GestResultado | null {
  const partes = principioAtivo.split("+").map((p) => p.trim()).filter(Boolean);
  let pior: Componente | null = null;
  for (const p of partes) {
    const c = lookupOne(p);
    if (c && (pior === null || SEVERIDADE[c.categoria] > SEVERIDADE[pior.categoria])) pior = c;
  }
  if (!pior) return null;
  const info = pior.sistema === "TGA" ? TGA_INFO[pior.categoria as TgaPregCat] : FDA_INFO[pior.categoria as FdaPregCat];
  return {
    categoria: pior.categoria,
    sistema: pior.sistema,
    info,
    severidade: SEVERIDADE[pior.categoria],
    combinacao: partes.length > 1,
  };
}
