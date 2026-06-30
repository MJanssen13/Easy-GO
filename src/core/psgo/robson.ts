/**
 * Classificação de Robson (Ten Group Classification System).
 * Apoio à decisão — validar com a equipe.
 */

export type RobsonParity = "nullipara" | "multipara";
export type RobsonPresentation = "cephalic" | "breech" | "transverse";
export type RobsonFetuses = "single" | "multiple";
export type RobsonOnset = "spontaneous" | "induced" | "cesarean_before_labor";

export interface RobsonInput {
  parity?: RobsonParity | null;
  priorCesarean?: boolean | null;
  presentation?: RobsonPresentation | null;
  fetuses?: RobsonFetuses | null;
  /** true se IG ≥ 37 semanas. */
  term?: boolean | null;
  onset?: RobsonOnset | null;
}

export interface RobsonResult {
  group: number | null;
  label: string;
  /** Campos ainda necessários para concluir a classificação. */
  missing: string[];
}

export const ROBSON_LABELS: Record<number, string> = {
  1: "Nulípara, feto único cefálico, ≥37s, em trabalho de parto espontâneo",
  2: "Nulípara, feto único cefálico, ≥37s, induzida ou cesárea antes do TP",
  3: "Multípara sem cesárea prévia, feto único cefálico, ≥37s, TP espontâneo",
  4: "Multípara sem cesárea prévia, feto único cefálico, ≥37s, induzida ou cesárea antes do TP",
  5: "Multípara com ≥1 cesárea prévia, feto único cefálico, ≥37s",
  6: "Nulípara, feto único pélvico",
  7: "Multípara, feto único pélvico (inclui cesárea prévia)",
  8: "Gestação múltipla (inclui cesárea prévia)",
  9: "Feto único em situação transversa ou oblíqua (inclui cesárea prévia)",
  10: "Feto único cefálico, <37s (inclui cesárea prévia)",
};

export function classifyRobson(input: RobsonInput): RobsonResult {
  const missing: string[] = [];
  const need = <T>(v: T | null | undefined, field: string): v is T => {
    if (v === null || v === undefined) {
      missing.push(field);
      return false;
    }
    return true;
  };

  const hasFetuses = need(input.fetuses, "número de fetos");
  const hasPresentation = need(input.presentation, "apresentação fetal");

  // 8 — múltiplos
  if (hasFetuses && input.fetuses === "multiple") {
    return { group: 8, label: ROBSON_LABELS[8], missing: [] };
  }

  // 9 — transverso/oblíquo
  if (hasPresentation && input.presentation === "transverse") {
    return { group: 9, label: ROBSON_LABELS[9], missing: [] };
  }

  // 6/7 — pélvico
  if (hasPresentation && input.presentation === "breech") {
    if (!need(input.parity, "paridade")) return { group: null, label: "", missing };
    const g = input.parity === "nullipara" ? 6 : 7;
    return { group: g, label: ROBSON_LABELS[g], missing: [] };
  }

  // A partir daqui precisamos de feto único cefálico
  if (!hasFetuses || !hasPresentation) return { group: null, label: "", missing };
  if (input.presentation !== "cephalic") return { group: null, label: "", missing };

  // 10 — pré-termo cefálico
  if (!need(input.term, "idade gestacional (≥37s?)")) return { group: null, label: "", missing };
  if (input.term === false) {
    return { group: 10, label: ROBSON_LABELS[10], missing: [] };
  }

  // Termo, cefálico, único
  if (!need(input.parity, "paridade")) return { group: null, label: "", missing };

  if (input.parity === "nullipara") {
    if (!need(input.onset, "início do trabalho de parto")) return { group: null, label: "", missing };
    const g = input.onset === "spontaneous" ? 1 : 2;
    return { group: g, label: ROBSON_LABELS[g], missing: [] };
  }

  // multípara termo cefálica
  if (!need(input.priorCesarean, "cesárea anterior")) return { group: null, label: "", missing };
  if (input.priorCesarean) {
    return { group: 5, label: ROBSON_LABELS[5], missing: [] };
  }
  if (!need(input.onset, "início do trabalho de parto")) return { group: null, label: "", missing };
  const g = input.onset === "spontaneous" ? 3 : 4;
  return { group: g, label: ROBSON_LABELS[g], missing: [] };
}
