/**
 * Paridade obstétrica (modelo simples): G (gestações), com o detalhamento dos
 * desfechos concatenado sem o "P" — C (cesárea), N (parto normal) e A (abortos).
 *
 * Regras:
 * - G conta todas as gestações; soma a atual quando a pessoa está gestante.
 * - O detalhamento lista apenas as categorias com contagem > 0, na ordem C, N, A.
 * - Ex.: 1 cesárea + 1 normal, gestante → G3C1N1. 2 abortos → G3A2.
 *
 * (A paridade ainda será calibrada; por ora sem gemelaridade.)
 */

export type PriorPregnancyType = "N" | "C" | "A";

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
  C: "Cesárea",
  A: "Aborto",
};

export function isBirthType(t: PriorPregnancyType): boolean {
  return t === "N" || t === "C";
}

/** Texto do marcador de desfecho sem observações. */
export const NO_COMPLICATIONS_LABEL = "Sem intercorrências";

/** Só parto normal e cesárea podem ser marcados como "sem intercorrências". */
export function canMarkNoComplications(type: PriorPregnancyType): boolean {
  return type === "N" || type === "C";
}

/**
 * Informação obrigatória na nota, conforme o tipo (mostrada em vermelho na
 * caixa de texto): cesárea exige o motivo; aborto exige a IG.
 */
export function requiredNotePrompt(type: PriorPregnancyType): string | null {
  if (type === "C") return "INDICAR MOTIVO";
  if (type === "A") return "INFORMAR IG";
  return null;
}

/**
 * Resumo automático das cesáreas prévias para a linha de CIRURGIAS, a partir da
 * paridade. Ex.: 2 cesáreas em 2005 e 2015 → "2 CESÁREAS (2005 E 2015)"; 1 em
 * 2010 → "1 CESÁREA (2010)". Sem cesáreas → "".
 */
export function formatCesareans(prior: PriorPregnancy[]): string {
  const cesareans = prior.filter((p) => p.type === "C");
  const n = cesareans.length;
  if (n === 0) return "";
  const years = cesareans
    .map((p) => (p.year ?? "").trim())
    .filter(Boolean)
    .sort();
  const noun = n === 1 ? "CESÁREA" : "CESÁREAS";
  let yearsText = "";
  if (years.length === 1) {
    yearsText = ` (${years[0]})`;
  } else if (years.length > 1) {
    yearsText = ` (${years.slice(0, -1).join(", ")} E ${years[years.length - 1]})`;
  }
  return `${n} ${noun}${yearsText}`;
}

/** Ordem das categorias no detalhamento (ex.: G3C1N1). */
const SUMMARY_ORDER = ["C", "N", "A"] as const;
type SummaryCat = (typeof SUMMARY_ORDER)[number];

export interface ParityResult {
  /** Ex.: "G3C1N1", "G3A2", "G1". */
  summary: string;
  /** Linhas por gestação prévia, ordenadas por ano. */
  lines: string[];
  /** Nº de cesáreas. */
  cesareanCount: number;
  /** true se multípara (≥1 parto: N ou C). */
  multipara: boolean;
}

/**
 * Monta o resumo e as linhas de paridade. `includesCurrent` soma a gestação
 * atual ao total de G (true quando a pessoa está gestante no momento).
 */
export function formatParity(prior: PriorPregnancy[], includesCurrent = true): ParityResult {
  const counts: Record<SummaryCat, number> = { C: 0, N: 0, A: 0 };

  // Guarda contra tipos legados (F/E, removidos): só conta C/N/A.
  for (const p of prior) {
    if (p.type === "C" || p.type === "N" || p.type === "A") counts[p.type] += 1;
  }

  const births = counts.N + counts.C;
  const g = prior.length + (includesCurrent ? 1 : 0);

  let detail = "";
  for (const cat of SUMMARY_ORDER) {
    if (counts[cat] === 0) continue;
    detail += `${cat}${counts[cat]}`;
  }
  const summary = `G${g}${detail}`;

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
    // continua na cesárea e no aborto. No parto normal marcado a nota é
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
