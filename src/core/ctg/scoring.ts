/**
 * Cardiotocografia anteparto — escore simplificado 0-5 pontos.
 * Regras (apoio à decisão; validar com a equipe):
 *   - Linha de base 110-160 bpm ............ 1 pt
 *   - Variabilidade 6-25 bpm ............... 1 pt
 *   - Relação AT/MF > 60% (ou 2 AT/20min) .. 2 pt
 *   - Desacelerações ausentes .............. 1 pt
 * Conclusão sugerida: 4-5 Feto ativo · 2-3 Feto hipoativo · 0-1 Feto inativo.
 */

export type CtgVariability = "absent" | "lt5" | "6-25" | "gt25" | "sinusoidal";
export type CtgPresence = "present" | "absent";
export type CtgAtMfRatio = "lt60" | "gte60";
export type CtgDecelType = "early" | "late" | "variable";
export type CtgSoundStimulus = "done" | "not_done";
export type CtgConclusion =
  | "Feto ativo"
  | "Feto hipoativo"
  | "Feto inativo"
  | "Reativo"
  | "Hiporreativo"
  | "Não reativo"
  | "Bifásico";

export const VARIABILITY_LABELS: Record<CtgVariability, string> = {
  absent: "Ausente",
  lt5: "< 5",
  "6-25": "6-25",
  gt25: "> 25",
  sinusoidal: "Sinusoidal",
};

export const AT_MF_LABELS: Record<CtgAtMfRatio, string> = {
  lt60: "< 60%",
  gte60: "> 60% ou 2 AT em 20 min",
};

export const DECEL_TYPE_LABELS: Record<CtgDecelType, string> = {
  early: "Precoce",
  late: "Tardia",
  variable: "Variável",
};

export const PRESENCE_LABELS: Record<CtgPresence, string> = {
  present: "Presentes",
  absent: "Ausentes",
};

export interface CtgScoreInput {
  baseline?: number | null;
  variability?: CtgVariability | null;
  atMfRatio?: CtgAtMfRatio | null;
  decelerations?: CtgPresence | null;
}

export function computeCtgScore(input: CtgScoreInput): number {
  let score = 0;
  if (input.baseline != null && input.baseline >= 110 && input.baseline <= 160) score += 1;
  if (input.variability === "6-25") score += 1;
  if (input.atMfRatio === "gte60") score += 2;
  if (input.decelerations === "absent") score += 1;
  return score;
}

export function suggestConclusion(score: number): CtgConclusion {
  if (score >= 4) return "Feto ativo";
  if (score >= 2) return "Feto hipoativo";
  return "Feto inativo";
}
