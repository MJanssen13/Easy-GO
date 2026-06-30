/**
 * Doppler obstétrico — z/centil de IP das artérias uterinas (médio), PSV da
 * artéria cerebral média e IP do ducto venoso. Portado da Fetal Medicine
 * Foundation (fetalmedicine.org). IG em DIAS. Apoio à decisão.
 */
import { zToCentile } from "./centile";

const log10 = (x: number) => Math.log(x) / Math.LN10;

// --- Artérias uterinas (IP médio) ---
function expectedUtpiLog10(gaDays: number): number | null {
  return gaDays > 139
    ? 0.625710181487661 - 0.0053761907652857 * gaDays + 8.86906485714508e-6 * gaDays * gaDays
    : null;
}

function expectedUtpiSdLog10(gaDays: number): number | null {
  return gaDays > 139 ? 0.132424838 - 0.000104066 * gaDays : null;
}

export function utpiZ(pi: number, gaDays: number): number | null {
  const n = expectedUtpiLog10(gaDays);
  const sd = expectedUtpiSdLog10(gaDays);
  if (n === null || sd === null || !pi || pi <= 0) return null;
  return (log10(pi) - n) / sd;
}

export function utpiCentile(pi: number, gaDays: number): number | null {
  return zToCentile(utpiZ(pi, gaDays));
}

// --- Artéria cerebral média — PSV (cm/s). IG em semanas (18-38). ---
function expectedMcaPsv(gaWeeks: number): number {
  return Math.pow(10, 0.963 + 0.0223 * gaWeeks);
}

function expectedMcaPsvSd(gaWeeks: number): number {
  return Math.pow(10, 1.045981 + 0.0223 * gaWeeks) - expectedMcaPsv(gaWeeks);
}

export function mcaPsvZ(psv: number, gaDays: number): number | null {
  const w = gaDays / 7;
  if (w < 18 || w > 38 || !psv || psv <= 0) return null;
  return (psv - expectedMcaPsv(w)) / expectedMcaPsvSd(w);
}

export function mcaPsvCentile(psv: number, gaDays: number): number | null {
  return zToCentile(mcaPsvZ(psv, gaDays));
}

/** Múltiplos da mediana (MoM) da PSV da ACM — usado no rastreio de anemia. */
export function mcaPsvMoM(psv: number, gaDays: number): number | null {
  const w = gaDays / 7;
  if (w < 18 || w > 38 || !psv || psv <= 0) return null;
  return psv / expectedMcaPsv(w);
}

// --- Ducto venoso (IP) ---
function expectedDvpiSqrt(gaDays: number): number | null {
  const w = gaDays / 7;
  return w >= 18 && w <= 42 ? 0.0002 * w * w - 0.019 * w + 1.0847 : null;
}

function expectedDvpiSdSqrt(gaDays: number): number {
  return 0.00005 * (gaDays / 7) + 0.0912;
}

export function dvpiZ(pi: number, gaDays: number): number | null {
  const sqrtExp = expectedDvpiSqrt(gaDays);
  if (sqrtExp === null || !pi || pi <= 0) return null;
  return (Math.sqrt(pi) - sqrtExp) / expectedDvpiSdSqrt(gaDays);
}

export function dvpiCentile(pi: number, gaDays: number): number | null {
  return zToCentile(dvpiZ(pi, gaDays));
}
