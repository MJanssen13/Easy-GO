/**
 * Doppler da insuficiência placentária (tríade do CIUR): IP da artéria
 * umbilical (IP-AUmb), IP da artéria cerebral média (IP-ACM) e relação
 * cérebro-placentária (RCP = IP-ACM / IP-AUmb).
 *
 * Fórmulas portadas VERBATIM da calculadora oficial da Fetal Medicine
 * Foundation (fetalmedicine.org, "Assessment: Fetal Doppler" — _fmf.min.js).
 * Distribuição log10-gaussiana; IG em DIAS; válidas para IG > 139 dias
 * (≈ 20 semanas). Percentil pela CDF normal padrão (mesma do resto do app).
 * Apoio à decisão — validar com a equipe.
 */
import { zToCentile } from "./centile";

const log10 = (x: number) => Math.log(x) / Math.LN10;

// --- Artéria umbilical (IP) ---
/** Mediana do IP-AUmb (valor, não log) — linear na IG (dias). */
export function expectedUaPi(gaDays: number): number | null {
  return gaDays > 139 ? 1.64737123 - 0.003004566 * gaDays : null;
}
function expectedUaSdLog10(gaDays: number): number | null {
  return gaDays > 139
    ? 0.0871258999174847 - 0.000293587139447361 * gaDays + 9.35493584242832e-7 * gaDays * gaDays
    : null;
}
export function uaPiZ(pi: number, gaDays: number): number | null {
  const median = expectedUaPi(gaDays);
  const sd = expectedUaSdLog10(gaDays);
  if (median === null || median <= 0 || sd === null || !pi || pi <= 0) return null;
  return (log10(pi) - log10(median)) / sd;
}
export function uaPiCentile(pi: number, gaDays: number): number | null {
  return zToCentile(uaPiZ(pi, gaDays));
}

// --- Artéria cerebral média (IP) ---
function expectedMcaLog10(gaDays: number): number | null {
  return gaDays > 139
    ? 0.3117131 -
        0.007099515 * gaDays +
        6.345179e-5 * gaDays * gaDays -
        1.442668e-7 * gaDays * gaDays * gaDays
    : null;
}
/** Mediana do IP-ACM (valor). */
export function expectedMcaPi(gaDays: number): number | null {
  const m = expectedMcaLog10(gaDays);
  return m === null ? null : Math.pow(10, m);
}
export function mcaPiZ(pi: number, gaDays: number): number | null {
  const m = expectedMcaLog10(gaDays);
  // A FMF usa DP log10 constante de 0,06349 para o z do IP-ACM.
  if (m === null || !pi || pi <= 0) return null;
  return (log10(pi) - m) / 0.06349;
}
export function mcaPiCentile(pi: number, gaDays: number): number | null {
  return zToCentile(mcaPiZ(pi, gaDays));
}

// --- Relação cérebro-placentária (RCP / CPR) ---
function expectedCprLog10(gaDays: number): number | null {
  return gaDays > 139
    ? -0.3564455 +
        0.0003969296 * gaDays +
        3.199398e-5 * gaDays * gaDays -
        9.265749e-8 * gaDays * gaDays * gaDays
    : null;
}
function expectedCprSdLog10(gaDays: number): number | null {
  return gaDays > 139
    ? 0.1948405 - 0.001220327 * gaDays + 3.26213e-6 * gaDays * gaDays
    : null;
}
/** Mediana da RCP (valor). */
export function expectedCpr(gaDays: number): number | null {
  const m = expectedCprLog10(gaDays);
  return m === null ? null : Math.pow(10, m);
}
export function cprZ(cpr: number, gaDays: number): number | null {
  const m = expectedCprLog10(gaDays);
  const sd = expectedCprSdLog10(gaDays);
  if (m === null || sd === null || !cpr || cpr <= 0) return null;
  return (log10(cpr) - m) / sd;
}
export function cprCentile(cpr: number, gaDays: number): number | null {
  return zToCentile(cprZ(cpr, gaDays));
}

/** RCP = IP-ACM / IP-AUmb (apenas aritmética; sempre disponível). */
export function cprValue(mcaPi: number | null, uaPi: number | null): number | null {
  if (!mcaPi || !uaPi || uaPi <= 0) return null;
  return mcaPi / uaPi;
}
