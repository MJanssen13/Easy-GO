/**
 * Curvas de referência do pré-natal (dados oficiais/publicados, transcritos das
 * tabelas — não fabricados).
 *
 * 1) IMC × idade gestacional (curva de Atalah), classificação do estado
 *    nutricional da gestante adotada pelo Ministério da Saúde.
 *    FONTE: MS/SISVAN — "Orientações para a coleta e análise de dados
 *    antropométricos em serviços de saúde: Norma Técnica do SISVAN" (tabela
 *    "Classificação do estado nutricional da gestante segundo IMC por semana
 *    gestacional"); Atalah E. et al., Rev Med Chil. 1997;125(12):1429-36.
 *    Colunas usadas como limites das faixas: aLow = limite inferior de
 *    "adequado" (baixo peso × adequado); sLow = limite inferior de "sobrepeso"
 *    (adequado × sobrepeso); o = "obesidade" IMC ≥ (sobrepeso × obesidade).
 *
 * 2) Altura uterina × idade gestacional (percentis 10 e 90), gestantes de baixo
 *    risco. FONTE: Freire DMC, Cecatti JG, Paiva CSM. "Curva da altura uterina
 *    por idade gestacional em gestantes de baixo risco", Rev Bras Ginecol
 *    Obstet. 2006;28(1):3-9 (Tabela 1, P10 e P90).
 *
 * Apoio à decisão — validar.
 */

export interface AtalahRow {
  wk: number;
  /** Limite inferior de "adequado" (abaixo → baixo peso). */
  aLow: number;
  /** Limite inferior de "sobrepeso" (abaixo → adequado). */
  sLow: number;
  /** IMC ≥ → obesidade (abaixo → sobrepeso). */
  o: number;
}

export const ATALAH_IMC: AtalahRow[] = [
  { wk: 6, aLow: 20.0, sLow: 25.0, o: 30.1 },
  { wk: 7, aLow: 20.1, sLow: 25.1, o: 30.2 },
  { wk: 8, aLow: 20.2, sLow: 25.1, o: 30.2 },
  { wk: 9, aLow: 20.3, sLow: 25.2, o: 30.3 },
  { wk: 10, aLow: 20.3, sLow: 25.3, o: 30.3 },
  { wk: 11, aLow: 20.4, sLow: 25.4, o: 30.4 },
  { wk: 12, aLow: 20.5, sLow: 25.5, o: 30.4 },
  { wk: 13, aLow: 20.7, sLow: 25.7, o: 30.5 },
  { wk: 14, aLow: 20.8, sLow: 25.8, o: 30.6 },
  { wk: 15, aLow: 20.9, sLow: 25.9, o: 30.7 },
  { wk: 16, aLow: 21.1, sLow: 26.0, o: 30.8 },
  { wk: 17, aLow: 21.2, sLow: 26.1, o: 30.9 },
  { wk: 18, aLow: 21.3, sLow: 26.2, o: 31.0 },
  { wk: 19, aLow: 21.5, sLow: 26.3, o: 31.0 },
  { wk: 20, aLow: 21.6, sLow: 26.4, o: 31.1 },
  { wk: 21, aLow: 21.8, sLow: 26.5, o: 31.2 },
  { wk: 22, aLow: 21.9, sLow: 26.7, o: 31.3 },
  { wk: 23, aLow: 22.1, sLow: 26.9, o: 31.4 },
  { wk: 24, aLow: 22.3, sLow: 27.0, o: 31.6 },
  { wk: 25, aLow: 22.5, sLow: 27.1, o: 31.7 },
  { wk: 26, aLow: 22.7, sLow: 27.3, o: 31.8 },
  { wk: 27, aLow: 22.8, sLow: 27.4, o: 31.9 },
  { wk: 28, aLow: 23.0, sLow: 27.6, o: 32.0 },
  { wk: 29, aLow: 23.2, sLow: 27.7, o: 32.1 },
  { wk: 30, aLow: 23.4, sLow: 27.9, o: 32.2 },
  { wk: 31, aLow: 23.5, sLow: 28.0, o: 32.3 },
  { wk: 32, aLow: 23.7, sLow: 28.1, o: 32.4 },
  { wk: 33, aLow: 23.9, sLow: 28.2, o: 32.5 },
  { wk: 34, aLow: 24.0, sLow: 28.4, o: 32.6 },
  { wk: 35, aLow: 24.2, sLow: 28.5, o: 32.7 },
  { wk: 36, aLow: 24.3, sLow: 28.6, o: 32.8 },
  { wk: 37, aLow: 24.5, sLow: 28.8, o: 32.9 },
  { wk: 38, aLow: 24.6, sLow: 28.9, o: 33.0 },
  { wk: 39, aLow: 24.8, sLow: 29.0, o: 33.1 },
  { wk: 40, aLow: 25.0, sLow: 29.2, o: 33.2 },
  { wk: 41, aLow: 25.1, sLow: 29.3, o: 33.3 },
  { wk: 42, aLow: 25.1, sLow: 29.3, o: 33.3 },
];

export interface AuRow {
  wk: number;
  p10: number;
  p90: number;
}

export const AU_PERCENTILES: AuRow[] = [
  { wk: 13, p10: 7.9, p90: 13.0 },
  { wk: 14, p10: 9.5, p90: 14.3 },
  { wk: 15, p10: 10.5, p90: 16.9 },
  { wk: 16, p10: 12.5, p90: 18.5 },
  { wk: 17, p10: 13.6, p90: 18.6 },
  { wk: 18, p10: 14.0, p90: 19.0 },
  { wk: 19, p10: 15.0, p90: 21.0 },
  { wk: 20, p10: 16.3, p90: 21.9 },
  { wk: 21, p10: 18.4, p90: 23.0 },
  { wk: 22, p10: 19.0, p90: 24.4 },
  { wk: 23, p10: 19.7, p90: 25.7 },
  { wk: 24, p10: 20.9, p90: 27.4 },
  { wk: 25, p10: 22.0, p90: 27.0 },
  { wk: 26, p10: 22.4, p90: 27.4 },
  { wk: 27, p10: 23.5, p90: 27.4 },
  { wk: 28, p10: 25.0, p90: 28.0 },
  { wk: 29, p10: 25.4, p90: 31.9 },
  { wk: 30, p10: 25.5, p90: 30.3 },
  { wk: 31, p10: 26.1, p90: 31.8 },
  { wk: 32, p10: 27.3, p90: 31.6 },
  { wk: 33, p10: 27.7, p90: 33.2 },
  { wk: 34, p10: 29.8, p90: 34.2 },
  { wk: 35, p10: 29.7, p90: 34.2 },
  { wk: 36, p10: 31.0, p90: 35.6 },
  { wk: 37, p10: 31.5, p90: 35.7 },
  { wk: 38, p10: 32.5, p90: 36.6 },
  { wk: 39, p10: 32.5, p90: 37.2 },
];

export type AtalahCategory = "baixo peso" | "adequado" | "sobrepeso" | "obesidade";

function atalahRowAt(gaWeeks: number): AtalahRow {
  const wk = Math.min(42, Math.max(6, Math.round(gaWeeks)));
  return ATALAH_IMC.find((r) => r.wk === wk) ?? ATALAH_IMC[ATALAH_IMC.length - 1];
}

/** Classifica o IMC pela curva de Atalah na IG informada (null se faltar dado). */
export function classifyAtalah(imc: number | null, gaWeeks: number | null): AtalahCategory | null {
  if (imc == null || gaWeeks == null || Number.isNaN(gaWeeks)) return null;
  if (gaWeeks < 6 || gaWeeks > 42) return null;
  const r = atalahRowAt(gaWeeks);
  if (imc < r.aLow) return "baixo peso";
  if (imc < r.sLow) return "adequado";
  if (imc < r.o) return "sobrepeso";
  return "obesidade";
}
