/**
 * Comorbidades (CMB) frequentes na gestação + regras automáticas
 * (obesidade pelo IMC, iteratividade por cesáreas).
 */

export const COMMON_COMORBIDITIES: string[] = [
  "DMG (DIETA)",
  "DMG (INSULINO-REQUERENTE)",
  "DM2",
  "DM2 (INSULINO-REQUERENTE)",
  "HAC",
  "HAG",
  "PE",
  "HAC COM PE SOBREPOSTA",
  "ANEMIA MATERNA",
  "HIPOTIREOIDISMO",
  "HIPOTIREOIDISMO SUBCLÍNICO",
  "ITU DE REPETIÇÃO",
];

export interface BmiClass {
  imc: number;
  label: string | null; // null se < 25 (sem comorbidade de peso)
}

/** Classifica o IMC e devolve o rótulo de sobrepeso/obesidade (com IMC). */
export function classifyBmi(weightKg?: number | null, heightM?: number | null): BmiClass | null {
  if (!weightKg || !heightM || heightM <= 0) return null;
  const imc = weightKg / (heightM * heightM);
  const rounded = Math.round(imc * 10) / 10;
  let label: string | null = null;
  if (imc >= 40) label = `OBESIDADE GRAU III (IMC ${rounded})`;
  else if (imc >= 35) label = `OBESIDADE GRAU II (IMC ${rounded})`;
  else if (imc >= 30) label = `OBESIDADE GRAU I (IMC ${rounded})`;
  else if (imc >= 25) label = `SOBREPESO (IMC ${rounded})`;
  return { imc: rounded, label };
}

/** Comorbidades inseridas automaticamente a partir dos dados da consulta. */
export function autoComorbidities(params: {
  weightKg?: number | null;
  heightM?: number | null;
  cesareanCount?: number;
}): string[] {
  const auto: string[] = [];
  const bmi = classifyBmi(params.weightKg, params.heightM);
  if (bmi?.label) auto.push(bmi.label);
  if ((params.cesareanCount ?? 0) >= 2) auto.push("ITERATIVIDADE");
  return auto;
}
