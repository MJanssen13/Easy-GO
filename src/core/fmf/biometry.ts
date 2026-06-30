/**
 * Biometria fetal — peso estimado (Hadlock) e z/centil de CA, CC, CF.
 * Portado da Fetal Medicine Foundation (fetalmedicine.org).
 * Entradas em mm (biometria) e IG em DIAS, salvo indicado. Apoio à decisão.
 */
import { zToCentile } from "./centile";

const log10 = (x: number) => Math.log(x) / Math.LN10;

/** Peso fetal estimado (g) por Hadlock (CC, CA, CF). Entradas em mm. */
export function efwFromHcAcFl(hcMm: number, acMm: number, flMm: number): number | null {
  const hc = hcMm / 10;
  const ac = acMm / 10;
  const fl = flMm / 10;
  if (hc < 4 || hc > 50 || ac < 4 || ac > 50 || fl < 0.5 || fl > 10) return null;
  return Math.pow(10, 1.326 - 0.00326 * ac * fl + 0.0107 * hc + 0.0438 * ac + 0.158 * fl);
}

function expectedFwLog10(gaDays: number): number {
  const e = gaDays - 199;
  const t = e * e;
  return 3.0893 + 0.00835 * e - 0.00002965 * t - t * e * 6.062e-8;
}

function expectedFwSdLog10(gaDays: number): number {
  return 0.02464 + 0.00005639669 * gaDays;
}

/** Peso fetal esperado (mediana, g) para a IG. */
export function expectedEfw(gaDays: number): number | null {
  return gaDays >= 150 ? Math.pow(10, expectedFwLog10(gaDays)) : null;
}

/** Z-score do peso estimado (g) para a IG (dias). */
export function efwZ(weightG: number, gaDays: number): number | null {
  if (!weightG || weightG <= 0) return null;
  const n = expectedFwLog10(gaDays);
  const sd = expectedFwSdLog10(gaDays);
  if (!sd) return null;
  return (log10(weightG) - n) / sd;
}

export function efwCentile(weightG: number, gaDays: number): number | null {
  return zToCentile(efwZ(weightG, gaDays));
}

/** Z-score da circunferência abdominal (mm) para a IG (dias). */
export function acZ(acMm: number, gaDays: number): number | null {
  const w = gaDays / 7;
  if (acMm < 40 || acMm > 500 || w < 12) return null;
  return (log10(acMm + 9) - 1.3257977 - 0.0552337 * w + 0.0006146021 * w * w) / 0.02947;
}

export function acCentile(acMm: number, gaDays: number): number | null {
  return zToCentile(acZ(acMm, gaDays));
}

/** Z-score da circunferência cefálica (mm) para a IG (dias). */
export function hcZ(hcMm: number, gaDays: number): number | null {
  const w = gaDays / 7;
  if (hcMm < 40 || hcMm > 500 || w < 12) return null;
  return (log10(hcMm + 1) - 1.3369692 - 0.0596493 * w + 0.0007494 * w * w) / 0.01997;
}

export function hcCentile(hcMm: number, gaDays: number): number | null {
  return zToCentile(hcZ(hcMm, gaDays));
}

/** Z-score do comprimento femoral (mm) para a IG (dias). */
export function flZ(flMm: number, gaDays: number): number | null {
  const w = gaDays / 7;
  if (flMm < 5 || flMm > 100 || w < 12) return null;
  return (Math.sqrt(flMm) + 1.1132444 - 0.4263429 * w + 0.0045992 * w * w) / 0.1852;
}

export function flCentile(flMm: number, gaDays: number): number | null {
  return zToCentile(flZ(flMm, gaDays));
}
