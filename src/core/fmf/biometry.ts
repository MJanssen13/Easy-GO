/**
 * Biometria fetal — percentil de PESO e de CIRCUNFERÊNCIA ABDOMINAL por IG.
 *
 * Replica exatamente a calculadora "Fetal Biometry 5.0" (Perinatology.com),
 * baseada em Hadlock:
 *
 * - PESO: tabela de mediana (p50) de Hadlock FP et al., "In utero analysis of
 *   fetal growth: a sonographic weight standard", Radiology 1991;181:129-33
 *   (PMID 1887021), interpolada linearmente entre semanas (10–40). Percentil
 *   log-normal: z = (ln(PFE) − ln(p50)) / 0,127. O peso é DADO pelo laudo — a
 *   plataforma só determina o percentil, não estima o peso.
 * - CIRC. ABDOMINAL: Hadlock FP et al., "Estimating fetal age...", Radiology
 *   1984;152:497-501 (PMID 6739822). Média (cm) = −13,3 + 1,61·IG − 0,00998·IG²
 *   (IG limitada a 12–42 sem), DP = 1,34 cm (13,4 mm); z normal.
 * - DBP (BPD): mesmo Hadlock 1984. Média (cm) = −3,08 + 0,41·IG − 0,000061·IG³
 *   (IG limitada a 12–42 sem), DP = 0,30 cm (3,0 mm); z normal.
 * - CC e CF: referência FMF (fetalmedicine.org).
 *
 * IG em DIAS; biometria em mm. Percentil pela CDF normal padrão. Apoio à decisão.
 */
import { zToCentile } from "./centile";

const log10 = (x: number) => Math.log(x) / Math.LN10;

/** Peso fetal estimado (g) por Hadlock 1985 (CC, CA, CF) — entradas em mm. */
export function efwFromHcAcFl(hcMm: number, acMm: number, flMm: number): number | null {
  const hc = hcMm / 10;
  const ac = acMm / 10;
  const fl = flMm / 10;
  if (hc < 4 || hc > 50 || ac < 4 || ac > 50 || fl < 0.5 || fl > 10) return null;
  return Math.pow(10, 1.326 - 0.00326 * ac * fl + 0.0107 * hc + 0.0438 * ac + 0.158 * fl);
}

// --- PESO: padrão de peso de Hadlock 1991 (tabela p50), como no Fetal Biometry 5.0 ---
// Mediana (g) por semana completa; entre semanas usa-se interpolação linear.
const HADLOCK_P50_WEEKS = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
  34, 35, 36, 37, 38, 39, 40,
];
const HADLOCK_P50_G = [
  35, 45, 58, 73, 93, 117, 146, 181, 223, 273, 331, 399, 478, 568, 670, 785, 913, 1055, 1210, 1379,
  1559, 1751, 1953, 2162, 2377, 2595, 2813, 3028, 3236, 3435, 3619,
];
const EFW_SD_LN = 0.127; // DP na escala ln (Fetal Biometry 5.0)

/** Interpolação linear da mediana (p50) de peso; IG (semanas) limitada a 10–40. */
function hadlockP50(gaWeeks: number): number {
  const w = HADLOCK_P50_WEEKS;
  const g = Math.max(w[0], Math.min(w[w.length - 1], gaWeeks));
  let i = 0;
  while (i < w.length - 1 && w[i + 1] < g) i++;
  const j = Math.min(i + 1, w.length - 1);
  if (w[j] === w[i]) return HADLOCK_P50_G[i];
  return (
    HADLOCK_P50_G[i] + ((g - w[i]) * (HADLOCK_P50_G[j] - HADLOCK_P50_G[i])) / (w[j] - w[i])
  );
}

/** Peso fetal esperado (mediana, g) para a IG — Hadlock 1991 (tabela). */
export function expectedEfw(gaDays: number): number | null {
  if (!Number.isFinite(gaDays)) return null;
  return hadlockP50(gaDays / 7);
}

/** Z-score do peso (g) para a IG (dias) — log-normal, DP ln = 0,127. */
export function efwZ(weightG: number, gaDays: number): number | null {
  if (!weightG || weightG <= 0) return null;
  const p50 = expectedEfw(gaDays);
  if (p50 === null || p50 <= 0) return null;
  return (Math.log(weightG) - Math.log(p50)) / EFW_SD_LN;
}

export function efwCentile(weightG: number, gaDays: number): number | null {
  return zToCentile(efwZ(weightG, gaDays));
}

// --- CIRC. ABDOMINAL: Hadlock 1984, como no Fetal Biometry 5.0 ---
const AC_SD_MM = 13.4; // DP = 1,34 cm

/** CA esperada (mediana, mm) para a IG — Hadlock 1984 (IG limitada a 12–42 sem). */
export function expectedAc(gaDays: number): number | null {
  if (!Number.isFinite(gaDays)) return null;
  const g = Math.max(12, Math.min(42, gaDays / 7));
  return (-13.3 + 1.61 * g - 0.00998 * g * g) * 10;
}

/** Z-score da circunferência abdominal (mm) para a IG (dias) — normal, DP 13,4 mm. */
export function acZ(acMm: number, gaDays: number): number | null {
  if (!acMm || acMm <= 0) return null;
  const mean = expectedAc(gaDays);
  if (mean === null) return null;
  return (acMm - mean) / AC_SD_MM;
}

export function acCentile(acMm: number, gaDays: number): number | null {
  return zToCentile(acZ(acMm, gaDays));
}

// --- DBP (BPD): Hadlock 1984, como no Fetal Biometry 5.0 ---
const BPD_SD_MM = 3.0; // DP = 0,30 cm

/** DBP esperado (mediana, mm) para a IG — Hadlock 1984 (IG limitada a 12–42 sem). */
export function expectedBpd(gaDays: number): number | null {
  if (!Number.isFinite(gaDays)) return null;
  const g = Math.max(12, Math.min(42, gaDays / 7));
  return (-3.08 + 0.41 * g - 0.000061 * g * g * g) * 10;
}

/** Z-score do DBP (mm) para a IG (dias) — normal, DP 3,0 mm. */
export function bpdZ(bpdMm: number, gaDays: number): number | null {
  if (!bpdMm || bpdMm <= 0) return null;
  const mean = expectedBpd(gaDays);
  if (mean === null) return null;
  return (bpdMm - mean) / BPD_SD_MM;
}

export function bpdCentile(bpdMm: number, gaDays: number): number | null {
  return zToCentile(bpdZ(bpdMm, gaDays));
}

/** Z-score da circunferência cefálica (mm) para a IG (dias) — FMF. */
export function hcZ(hcMm: number, gaDays: number): number | null {
  const w = gaDays / 7;
  if (hcMm < 40 || hcMm > 500 || w < 12) return null;
  return (log10(hcMm + 1) - 1.3369692 - 0.0596493 * w + 0.0007494 * w * w) / 0.01997;
}

export function hcCentile(hcMm: number, gaDays: number): number | null {
  return zToCentile(hcZ(hcMm, gaDays));
}

/** Z-score do comprimento femoral (mm) para a IG (dias) — FMF. */
export function flZ(flMm: number, gaDays: number): number | null {
  const w = gaDays / 7;
  if (flMm < 5 || flMm > 100 || w < 12) return null;
  return (Math.sqrt(flMm) + 1.1132444 - 0.4263429 * w + 0.0045992 * w * w) / 0.1852;
}

export function flCentile(flMm: number, gaDays: number): number | null {
  return zToCentile(flZ(flMm, gaDays));
}
