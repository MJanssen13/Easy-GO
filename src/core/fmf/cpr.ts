/**
 * Doppler da insuficiência placentária (tríade do CIUR): IP da artéria
 * umbilical (IP-AUmb), IP da artéria cerebral média (IP-ACM) e relação
 * cérebro-placentária (RCP = IP-ACM / IP-AUmb).
 *
 * Modelo de referência: Fetal Medicine Foundation — Ciobanu et al.,
 * "FMF reference ranges for umbilical artery and middle cerebral artery
 * pulsatility index and cerebroplacental ratio", Ultrasound Obstet Gynecol
 * 2019; 53: 465–472. Distribuição log10-gaussiana; mediana LINEAR (IP-AUmb)
 * e CÚBICA (IP-ACM, RCP) na IG; DP log-quadrático nos três. IG em DIAS.
 *
 * IMPORTANTE: os coeficientes da Tabela S1 do artigo ainda NÃO foram
 * preenchidos (a base da FMF está bloqueada pela política de rede deste
 * ambiente). Enquanto `COEFFS` permanecer null para um índice, a função
 * devolve `null` e o prontuário simplesmente omite o "(P …)" — nada de
 * percentil fabricado. Basta colar os coeficientes verificados abaixo para
 * ativar os três percentis de uma só vez. Apoio à decisão — validar.
 */
import { zToCentile } from "./centile";

const log10 = (x: number) => Math.log(x) / Math.LN10;

/** Coeficientes de um índice: mediana polinomial e DP quadrático em log10. */
export interface CentileCoeffs {
  /** Faixa de validade (semanas). */
  minWeeks: number;
  maxWeeks: number;
  /** Mediana de log10(valor) = Σ meanPoly[i] · semana^i. */
  meanPoly: number[];
  /** DP de log10(valor) = sdPoly[0] + sdPoly[1]·semana + sdPoly[2]·semana². */
  sdPoly: [number, number, number];
}

/**
 * Tabela S1 (Ciobanu 2019). PENDENTE — preencher com os coeficientes
 * verificados. Enquanto null, o percentil correspondente fica indisponível.
 */
export const CIOBANU_2019: {
  uaPi: CentileCoeffs | null;
  mcaPi: CentileCoeffs | null;
  cpr: CentileCoeffs | null;
} = {
  uaPi: null,
  mcaPi: null,
  cpr: null,
};

function poly(coeffs: number[], x: number): number {
  return coeffs.reduce((acc, c, i) => acc + c * Math.pow(x, i), 0);
}

/** Z-score genérico log10-gaussiano para um índice com coeficientes definidos. */
function centile(value: number, gaDays: number, c: CentileCoeffs | null): number | null {
  if (!c || !value || value <= 0) return null;
  const w = gaDays / 7;
  if (w < c.minWeeks || w > c.maxWeeks) return null;
  const mean = poly(c.meanPoly, w);
  const sd = c.sdPoly[0] + c.sdPoly[1] * w + c.sdPoly[2] * w * w;
  if (!sd) return null;
  return zToCentile((log10(value) - mean) / sd);
}

export function uaPiCentile(pi: number, gaDays: number): number | null {
  return centile(pi, gaDays, CIOBANU_2019.uaPi);
}

export function mcaPiCentile(pi: number, gaDays: number): number | null {
  return centile(pi, gaDays, CIOBANU_2019.mcaPi);
}

export function cprCentile(cpr: number, gaDays: number): number | null {
  return centile(cpr, gaDays, CIOBANU_2019.cpr);
}

/** RCP = IP-ACM / IP-AUmb (apenas aritmética; sempre disponível). */
export function cprValue(mcaPi: number | null, uaPi: number | null): number | null {
  if (!mcaPi || !uaPi || uaPi <= 0) return null;
  return mcaPi / uaPi;
}
