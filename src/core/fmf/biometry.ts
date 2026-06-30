/**
 * Biometria fetal — peso estimado e percentis.
 *
 * - PFE a partir da biometria: Hadlock (1985).
 * - Percentil de PESO por IG: Hadlock FP et al., "In utero analysis of fetal
 *   growth: a sonographic weight standard", Radiology 1991;181:129-33
 *   (PMID 1887021).
 * - Percentil de CIRC. ABDOMINAL por IG: Hadlock FP et al., "Estimating fetal
 *   age: computer-assisted analysis of multiple fetal growth parameters",
 *   Radiology 1984;152:497-501 (PMID 6739822).
 * - CC e CF: referência FMF (fetalmedicine.org).
 *
 * Entradas de biometria em mm e IG em DIAS, salvo indicado. Apoio à decisão.
 */
import { zToCentile } from "./centile";

const log10 = (x: number) => Math.log(x) / Math.LN10;

/** Peso fetal estimado (g) por Hadlock 1985 (CC, CA, CF). Entradas em mm. */
export function efwFromHcAcFl(hcMm: number, acMm: number, flMm: number): number | null {
  const hc = hcMm / 10;
  const ac = acMm / 10;
  const fl = flMm / 10;
  if (hc < 4 || hc > 50 || ac < 4 || ac > 50 || fl < 0.5 || fl > 10) return null;
  return Math.pow(10, 1.326 - 0.00326 * ac * fl + 0.0107 * hc + 0.0438 * ac + 0.158 * fl);
}

// --- Padrão de peso fetal por IG (Hadlock 1991, PMID 1887021) ---
// Mediana (g) = exp(0.578 + 0.332·GA − 0.00354·GA²), GA em semanas.
// Distribuição normal com coeficiente de variação constante de 11,7%, que
// reproduz os percentis publicados (3/10/90/97 ≈ 0,78/0,85/1,15/1,22 × mediana).
const EFW_CV = 0.117;

/** Peso fetal esperado (mediana, g) para a IG — Hadlock 1991. */
export function expectedEfw(gaDays: number): number | null {
  const w = gaDays / 7;
  if (w < 10 || w > 42) return null;
  return Math.exp(0.578 + 0.332 * w - 0.00354 * w * w);
}

/** Z-score do peso estimado (g) para a IG (dias) — Hadlock 1991. */
export function efwZ(weightG: number, gaDays: number): number | null {
  if (!weightG || weightG <= 0) return null;
  const median = expectedEfw(gaDays);
  if (median === null) return null;
  return (weightG - median) / (EFW_CV * median);
}

export function efwCentile(weightG: number, gaDays: number): number | null {
  return zToCentile(efwZ(weightG, gaDays));
}

// --- Circunferência abdominal por IG (Hadlock 1984, PMID 6739822) ---
// CA média (cm) = −13.3 + 1.61·GA − 0.00998·GA²; DP = 13,4 mm (constante).
const AC_SD_MM = 13.4;

/** CA esperada (mediana, mm) para a IG — Hadlock 1984. */
export function expectedAc(gaDays: number): number | null {
  const w = gaDays / 7;
  if (w < 12 || w > 42) return null;
  return (-13.3 + 1.61 * w - 0.00998 * w * w) * 10;
}

/** Z-score da circunferência abdominal (mm) para a IG (dias) — Hadlock 1984. */
export function acZ(acMm: number, gaDays: number): number | null {
  if (!acMm || acMm <= 0) return null;
  const mean = expectedAc(gaDays);
  if (mean === null) return null;
  return (acMm - mean) / AC_SD_MM;
}

export function acCentile(acMm: number, gaDays: number): number | null {
  return zToCentile(acZ(acMm, gaDays));
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
