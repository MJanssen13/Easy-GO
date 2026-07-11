/**
 * Translucência nucal (TN) — percentil pela Fetal Medicine Foundation.
 *
 * Fórmulas portadas VERBATIM da calculadora oficial da FMF
 * (fetalmedicine.org — `_fmf.min.js`, objeto `NT`). A distribuição da TN em
 * função do CCN (CRL) é um **modelo de mistura de duas populações** (regressão
 * log10 no CRL + componente de TN aumentada), como na FMF. Válido para
 * CRL 45–84 mm (≈ 11–13+6 semanas). Apoio à decisão — validar com a equipe.
 */
import { normalcdf } from "./centile";

const log10 = (x: number) => Math.log(x) / Math.LN10;

// Parâmetros FMF (verbatim de `NT.p`).
const P = {
  b0: -0.8951,
  b1: 0.0294,
  b2: -1.812e-4,
  a0: -0.3319,
  a1: -0.0379,
  m1: 0.3019,
  sdev1: 0.1945,
  sd_reg: 0.079,
  sd_op: 0.0289,
  tp: 81.12582781, // ponto de truncamento do CRL
};
// DP efetivos (regressão e 2ª população) combinam o erro do operador `sd_op`.
const SD_REG = Math.sqrt(P.sd_reg * P.sd_reg + P.sd_op * P.sd_op);
const SDEV1 = Math.sqrt(P.sdev1 * P.sdev1 + P.sd_op * P.sd_op);

const crlTrunc = (crl: number) => (crl > P.tp ? P.tp : crl);

/** log10 da mediana de TN para o CRL (regressão FMF, com CRL truncado). */
export function expectedNtLog10(crl: number): number {
  const c = crlTrunc(crl);
  return P.b0 + P.b1 * c + P.b2 * c * c;
}

/** Mediana de TN (mm) para o CRL. */
export function expectedNt(crl: number): number {
  return Math.pow(10, expectedNtLog10(crl));
}

/** Proporção da 2ª população (TN aumentada) para o CRL. */
const p1 = (crl: number) => 1 / (1 + Math.exp(-(P.a0 + P.a1 * crl)));

/**
 * Percentil (0-100) de uma medida de TN (mm) para o CCN/CRL informado (mm).
 * Reproduz `NT.centile` da FMF (mistura das duas populações). Fora de 45–84 mm
 * de CRL ou com TN inválida, retorna null.
 */
export function ntCentile(nt: number, crl: number): number | null {
  if (!nt || nt <= 0 || !crl || crl < 45 || crl > 84) return null;
  const l = log10(nt);
  const pp =
    (1 - p1(crl)) * normalcdf(expectedNtLog10(crl), SD_REG, l) +
    p1(crl) * normalcdf(P.m1, SDEV1, l);
  return pp * 100;
}
