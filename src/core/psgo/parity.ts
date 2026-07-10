/**
 * Paridade obstétrica (modelo simples, notação padrão): G (gestações),
 * P (partos: N normal, C cesárea, F fórceps) e A (abortos; ectópicas contam
 * como aborto e aparecem aninhadas, ex.: A2(E1)).
 *
 * Regras:
 * - G conta todas as gestações; soma a atual quando a pessoa está gestante.
 * - P soma apenas os partos (N + C + F). Abortos NÃO entram em P.
 * - Ex.: 2 cesáreas + 1 aborto + 1 normal, gestante → G5P3(N1C2A1).
 *
 * (A paridade ainda será calibrada; por ora sem gemelaridade.)
 */

export type PriorPregnancyType = "N" | "F" | "C" | "A" | "E";

export interface PriorPregnancy {
  id: string;
  type: PriorPregnancyType;
  year?: string;
  note?: string;
  /**
   * Marca "sem intercorrências" (só parto normal/cesárea). No parto normal
   * oculta a nota; na cesárea a nota continua (motivo obrigatório).
   */
  noComplications?: boolean;
}

export const PRIOR_TYPE_LABELS: Record<PriorPregnancyType, string> = {
  N: "Parto normal",
  F: "Fórceps",
  C: "Cesárea",
  A: "Aborto",
  E: "Ectópica",
};

export function isBirthType(t: PriorPregnancyType): boolean {
  return t === "N" || t === "F" || t === "C";
}

/** Texto do marcador de desfecho sem observações. */
export const NO_COMPLICATIONS_LABEL = "Sem intercorrências";

/** Só parto normal e cesárea podem ser marcados como "sem intercorrências". */
export function canMarkNoComplications(type: PriorPregnancyType): boolean {
  return type === "N" || type === "C";
}

/**
 * Informação obrigatória na nota, conforme o tipo (mostrada em vermelho na
 * caixa de texto): cesárea/fórceps exigem o motivo; aborto e ectópica exigem a IG.
 */
export function requiredNotePrompt(type: PriorPregnancyType): string | null {
  if (type === "C" || type === "F") return "INDICAR MOTIVO";
  if (type === "A" || type === "E") return "INFORMAR IG";
  return null;
}

/** Ordem das categorias no detalhamento (ex.: G5P3(N1C2A1)). */
const SUMMARY_ORDER = ["N", "C", "F", "A"] as const;
type SummaryCat = (typeof SUMMARY_ORDER)[number];

export interface ParityResult {
  /** Ex.: "G5P3(N1C2A1)", "G4P2(N2A2(E1))". */
  summary: string;
  /** Linhas por gestação prévia, ordenadas por ano. */
  lines: string[];
  /** Nº de cesáreas. */
  cesareanCount: number;
  /** true se multípara (≥1 parto: N, F ou C). */
  multipara: boolean;
}

/**
 * Monta o resumo e as linhas de paridade. `includesCurrent` soma a gestação
 * atual ao total de G (true quando a pessoa está gestante no momento).
 */
export function formatParity(prior: PriorPregnancy[], includesCurrent = true): ParityResult {
  const counts: Record<SummaryCat, number> = { N: 0, C: 0, F: 0, A: 0 };
  let ectopics = 0;

  for (const p of prior) {
    if (p.type === "A" || p.type === "E") {
      counts.A += 1;
      if (p.type === "E") ectopics += 1;
    } else {
      counts[p.type] += 1;
    }
  }

  const births = counts.N + counts.C + counts.F;
  const g = prior.length + (includesCurrent ? 1 : 0);

  let detail = "";
  for (const cat of SUMMARY_ORDER) {
    if (counts[cat] === 0) continue;
    detail += `${cat}${counts[cat]}`;
    if (cat === "A" && ectopics > 0) detail += `(E${ectopics})`;
  }
  const summary = `G${g}P${births}${detail ? `(${detail})` : ""}`;

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
    // Cesárea/normal marcados exibem "SEM INTERCORRÊNCIAS"; a nota (motivo/IG)
    // continua na cesárea, fórceps e aborto. No parto normal marcado a nota é
    // omitida (a caixa fica oculta na UI).
    const marked = !!p.noComplications && canMarkNoComplications(p.type);
    const noteHidden = marked && !requiredNotePrompt(p.type);
    const parts: string[] = [];
    const noteText = !noteHidden && p.note ? p.note.trim().replace(/\s*\n+\s*/g, "; ") : "";
    if (noteText) parts.push(noteText.toUpperCase());
    if (marked) parts.push(NO_COMPLICATIONS_LABEL.toUpperCase());
    const noteSuffix = parts.length ? `, ${parts.join(", ")}` : "";
    return `${tag}${when}${noteSuffix}`;
  });

  return { summary, lines, cesareanCount: counts.C, multipara: births > 0 };
}
