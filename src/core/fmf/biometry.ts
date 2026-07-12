/**
 * Biometria fetal — percentil de PESO, CIRCUNFERÊNCIA ABDOMINAL e CIRCUNFERÊNCIA
 * CEFÁLICA por IG.
 *
 * Replica a calculadora "Fetal Biometry 3.1" (Perinatology.com), baseada em
 * Hadlock:
 *
 * - PESO: Hadlock FP et al., "In utero analysis of fetal growth: a sonographic
 *   weight standard", Radiology 1991;181:129-33 (PMID 1887021). Mediana (g) pela
 *   fórmula analítica PFE = exp(0,578 + 0,332·IG − 0,00354·IG²) (IG em semanas);
 *   percentil normal: z = (PFE − p50) / (0,1325·p50). O peso é DADO pelo laudo —
 *   a plataforma só determina o percentil, não estima o peso.
 * - CIRC. ABDOMINAL: Hadlock FP et al., "Estimating fetal age...", Radiology
 *   1984;152:497-501 (PMID 6739822). Média (cm) = −13,3 + 1,61·IG − 0,00998·IG²
 *   (IG limitada a 12–42 sem), DP = 1,34 cm (13,4 mm); z normal.
 * - CIRC. CEFÁLICA: mesmo Hadlock 1984. Média (cm) = −11,48 + 1,56·IG −
 *   0,0002548·IG³, DP = 1,0 cm (10 mm); z normal.
 * - CF: referência FMF (fetalmedicine.org).
 *
 * IG em DIAS; biometria em mm. Percentil pela CDF normal padrão. Apoio à decisão.
 */
import { zToCentile } from "./centile";

/** Peso fetal estimado (g) por Hadlock 1985 (CC, CA, CF) — entradas em mm. */
export function efwFromHcAcFl(hcMm: number, acMm: number, flMm: number): number | null {
  const hc = hcMm / 10;
  const ac = acMm / 10;
  const fl = flMm / 10;
  if (hc < 4 || hc > 50 || ac < 4 || ac > 50 || fl < 0.5 || fl > 10) return null;
  return Math.pow(10, 1.326 - 0.00326 * ac * fl + 0.0107 * hc + 0.0438 * ac + 0.158 * fl);
}

// --- PESO: Hadlock 1991, como no Fetal Biometry 3.1 (Perinatology.com) ---
// Mediana (g) pela fórmula analítica; DP normal = 13,25% da mediana.
const EFW_CV = 0.1325; // DP como fração da mediana (Fetal Biometry 3.1)

/** Peso fetal esperado (mediana, g) para a IG — Hadlock 1991 (Fetal Biometry 3.1):
 *  PFE = exp(0,578 + 0,332·IG − 0,00354·IG²), IG em semanas; arredondado ao grama. */
export function expectedEfw(gaDays: number): number | null {
  if (!Number.isFinite(gaDays)) return null;
  const w = gaDays / 7;
  return Math.round(Math.exp(0.578 + 0.332 * w - 0.00354 * w * w));
}

/** Z-score do peso (g) para a IG (dias) — normal, DP = 13,25% da mediana. */
export function efwZ(weightG: number, gaDays: number): number | null {
  if (!weightG || weightG <= 0) return null;
  const p50 = expectedEfw(gaDays);
  if (p50 === null || p50 <= 0) return null;
  return (weightG - p50) / (EFW_CV * p50);
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

// --- CIRC. CEFÁLICA (CC): Hadlock 1984, como no Fetal Biometry 3.1 ---
const HC_SD_MM = 10; // DP = 1,0 cm

/** CC esperada (mediana, mm) para a IG — Hadlock 1984 (Fetal Biometry 3.1). */
export function expectedHc(gaDays: number): number | null {
  if (!Number.isFinite(gaDays)) return null;
  const w = gaDays / 7;
  return (-11.48 + 1.56 * w - 0.0002548 * w * w * w) * 10;
}

/** Z-score da circunferência cefálica (mm) para a IG (dias) — normal, DP 1,0 cm. */
export function hcZ(hcMm: number, gaDays: number): number | null {
  if (!hcMm || hcMm <= 0) return null;
  const mean = expectedHc(gaDays);
  if (mean === null) return null;
  return (hcMm - mean) / HC_SD_MM;
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
