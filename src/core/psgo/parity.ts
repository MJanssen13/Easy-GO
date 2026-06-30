/**
 * Paridade obstétrica detalhada: G (gestações), N (partos normais),
 * F (fórceps), C (cesáreas), A (abortos), E (ectópicas).
 */

export type PriorPregnancyType = "N" | "F" | "C" | "A" | "E";

export interface PriorPregnancy {
  id: string;
  type: PriorPregnancyType;
  year?: string;
  note?: string;
}

export const PRIOR_TYPE_LABELS: Record<PriorPregnancyType, string> = {
  N: "Parto normal",
  F: "Fórceps",
  C: "Cesárea",
  A: "Aborto",
  E: "Ectópica",
};

/** Ordem das categorias no resumo (ex.: G5C1N1A2). */
const SUMMARY_ORDER: PriorPregnancyType[] = ["C", "N", "F", "A", "E"];

export interface ParityResult {
  /** Ex.: "G5C1N1A2". */
  summary: string;
  /** Linhas por gestação prévia, ordenadas por ano. */
  lines: string[];
  cesareanCount: number;
  /** true se multípara (≥1 parto: N, F ou C). */
  multipara: boolean;
}

function countBy(prior: PriorPregnancy[], type: PriorPregnancyType): number {
  return prior.filter((p) => p.type === type).length;
}

/**
 * Monta o resumo e as linhas de paridade. `includesCurrent` soma a gestação
 * atual ao total de G (padrão true para uma gestante).
 */
export function formatParity(prior: PriorPregnancy[], includesCurrent = true): ParityResult {
  const counts = Object.fromEntries(
    SUMMARY_ORDER.map((t) => [t, countBy(prior, t)]),
  ) as Record<PriorPregnancyType, number>;

  const births = counts.N + counts.F + counts.C;
  const g = prior.length + (includesCurrent ? 1 : 0);

  let summary = `G${g}`;
  for (const t of SUMMARY_ORDER) {
    if (counts[t] > 0) summary += `${t}${counts[t]}`;
  }

  // Linhas por gestação, ordenadas por ano; numeração por tipo.
  const sorted = [...prior].sort((a, b) => {
    const ya = a.year ? Number(a.year) : Infinity;
    const yb = b.year ? Number(b.year) : Infinity;
    return ya - yb;
  });
  const perTypeIndex: Record<string, number> = {};
  const lines = sorted.map((p) => {
    perTypeIndex[p.type] = (perTypeIndex[p.type] ?? 0) + 1;
    const tag = `${p.type}${perTypeIndex[p.type]}`;
    const when = p.year ? ` EM ${p.year}` : "";
    const note = p.note ? `, ${p.note.toUpperCase()}` : "";
    return `${tag}${when}${note}`;
  });

  return { summary, lines, cesareanCount: counts.C, multipara: births > 0 };
}
