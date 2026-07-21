/**
 * IMC pré-gestacional e ganho de peso recomendado na gestação.
 *
 * FONTE: Institute of Medicine / National Academy of Medicine (IOM, 2009) —
 * "Weight Gain During Pregnancy: Reexamining the Guidelines"; adotado pela
 * Caderneta da Gestante (MS). Faixas para gestação ÚNICA. Apoio à decisão —
 * validar; casos de gemelaridade e extremos de IMC exigem individualização.
 */

export type BmiCategoryKey = "low" | "normal" | "overweight" | "obese";

export interface PreGestBmi {
  imc: number;
  key: BmiCategoryKey;
  label: string;
}

/** Ganho total recomendado (kg) por categoria de IMC pré-gestacional (IOM 2009). */
const TOTAL_GAIN: Record<BmiCategoryKey, { low: number; high: number }> = {
  low: { low: 12.5, high: 18 }, // baixo peso (< 18,5)
  normal: { low: 11.5, high: 16 }, // adequado (18,5–24,9)
  overweight: { low: 7, high: 11.5 }, // sobrepeso (25–29,9)
  obese: { low: 5, high: 9 }, // obesidade (≥ 30)
};

/** Taxa de ganho no 2º/3º trimestre (kg/semana) por categoria (IOM 2009). */
const WEEKLY_RATE: Record<BmiCategoryKey, { low: number; high: number }> = {
  low: { low: 0.44, high: 0.58 },
  normal: { low: 0.35, high: 0.5 },
  overweight: { low: 0.23, high: 0.33 },
  obese: { low: 0.17, high: 0.27 },
};

/** Ganho aproximado do 1º trimestre (kg), comum a todas as categorias (IOM). */
const FIRST_TRIMESTER_GAIN = { low: 0.5, high: 2 };

const CATEGORY_LABELS: Record<BmiCategoryKey, string> = {
  low: "BAIXO PESO",
  normal: "ADEQUADO",
  overweight: "SOBREPESO",
  obese: "OBESIDADE",
};

/** Classifica o IMC pré-gestacional (categorias da OMS/IOM). */
export function classifyPreGestBmi(weightKg?: number | null, heightM?: number | null): PreGestBmi | null {
  if (!weightKg || !heightM || heightM <= 0) return null;
  const imc = Math.round((weightKg / (heightM * heightM)) * 10) / 10;
  let key: BmiCategoryKey;
  if (imc < 18.5) key = "low";
  else if (imc < 25) key = "normal";
  else if (imc < 30) key = "overweight";
  else key = "obese";
  return { imc, key, label: CATEGORY_LABELS[key] };
}

export function recommendedTotalGain(key: BmiCategoryKey): { low: number; high: number } {
  return TOTAL_GAIN[key];
}

/** Faixa de ganho esperada até a IG atual (1º tri + taxa semanal do 2º/3º tri). */
export function expectedGainAt(key: BmiCategoryKey, gaWeeks: number | null): { low: number; high: number } | null {
  if (gaWeeks == null || Number.isNaN(gaWeeks) || gaWeeks < 0) return null;
  if (gaWeeks <= 13) return { ...FIRST_TRIMESTER_GAIN };
  const wk = gaWeeks - 13;
  const rate = WEEKLY_RATE[key];
  return {
    low: Math.round((FIRST_TRIMESTER_GAIN.low + wk * rate.low) * 10) / 10,
    high: Math.round((FIRST_TRIMESTER_GAIN.high + wk * rate.high) * 10) / 10,
  };
}

export type GainStatus = "below" | "within" | "above";

export interface WeightGainAssessment {
  bmi: PreGestBmi;
  totalTarget: { low: number; high: number };
  expectedNow: { low: number; high: number } | null;
  /** Ganho atual (kg) = peso atual − peso pré-gestacional (null se faltar dado). */
  currentGain: number | null;
  status: GainStatus | null;
  /** Linha para o prontuário (ex.: "IMC PRÉ-GESTACIONAL: 24.1 (ADEQUADO) …"). */
  summaryLine: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Avaliação completa do ganho de peso. Requer peso pré-gestacional, altura e
 * (opcional) peso atual e IG. Sem altura/peso pré-gestacional, devolve null.
 */
export function assessWeightGain(input: {
  prePregnancyWeightKg?: number | null;
  currentWeightKg?: number | null;
  heightM?: number | null;
  gaWeeks?: number | null;
}): WeightGainAssessment | null {
  const bmi = classifyPreGestBmi(input.prePregnancyWeightKg, input.heightM);
  if (!bmi) return null;

  const totalTarget = recommendedTotalGain(bmi.key);
  const expectedNow = expectedGainAt(bmi.key, input.gaWeeks ?? null);

  let currentGain: number | null = null;
  if (input.currentWeightKg != null && input.prePregnancyWeightKg != null) {
    currentGain = round1(input.currentWeightKg - input.prePregnancyWeightKg);
  }

  let status: GainStatus | null = null;
  if (currentGain != null && expectedNow) {
    if (currentGain < expectedNow.low) status = "below";
    else if (currentGain > expectedNow.high) status = "above";
    else status = "within";
  }

  const parts = [`IMC PRÉ-GESTACIONAL: ${bmi.imc} KG/M² (${bmi.label})`];
  parts.push(`META DE GANHO: ${totalTarget.low}–${totalTarget.high} KG`);
  if (currentGain != null) {
    const statusText =
      status === "below" ? "ABAIXO" : status === "above" ? "ACIMA" : status === "within" ? "ADEQUADO" : "";
    const sign = currentGain > 0 ? "+" : "";
    const suffix = statusText && expectedNow ? ` (${statusText} P/ IG: ${expectedNow.low}–${expectedNow.high} KG)` : "";
    parts.push(`GANHO ATUAL: ${sign}${currentGain} KG${suffix}`);
  }

  return { bmi, totalTarget, expectedNow, currentGain, status, summaryLine: parts.join(" // ") };
}
