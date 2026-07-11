/**
 * IP da artéria uterina (média) — percentil pela Fetal Medicine Foundation.
 *
 * Fórmulas portadas VERBATIM da calculadora oficial da FMF
 * (fetalmedicine.org — `_fmf.min.js`, funções `expectedUtpiLog10` /
 * `expectedUtpiSdLog10` / `centileUtpi`). Distribuição log10-gaussiana; IG em
 * DIAS; válidas para IG > 139 dias (≈ 20 semanas). Percentil pela CDF normal
 * padrão (mesma `normalcdf` do resto do app). Apoio à decisão — validar.
 */
import { zToCentile } from "./centile";

const log10 = (x: number) => Math.log(x) / Math.LN10;

/** Média de log10(IP-AUt) — polinômio de 2º grau na IG (dias). */
export function expectedUtPiLog10(gaDays: number): number | null {
  return gaDays > 139
    ? 0.625710181487661 - 0.0053761907652857 * gaDays + 8.86906485714508e-6 * gaDays * gaDays
    : null;
}

/** Mediana do IP-AUt (valor, não log). */
export function expectedUtPi(gaDays: number): number | null {
  const m = expectedUtPiLog10(gaDays);
  return m === null ? null : Math.pow(10, m);
}

/** Desvio-padrão de log10(IP-AUt) — linear na IG (dias). */
function expectedUtPiSdLog10(gaDays: number): number | null {
  return gaDays > 139 ? 0.132424838 - 0.000104066 * gaDays : null;
}

export function utPiZ(pi: number, gaDays: number): number | null {
  const m = expectedUtPiLog10(gaDays);
  const sd = expectedUtPiSdLog10(gaDays);
  if (m === null || sd === null || !pi || pi <= 0) return null;
  return (log10(pi) - m) / sd;
}

/** Percentil (0-100) do IP-AUt para a IG informada (dias). */
export function utPiCentile(pi: number, gaDays: number): number | null {
  return zToCentile(utPiZ(pi, gaDays));
}
