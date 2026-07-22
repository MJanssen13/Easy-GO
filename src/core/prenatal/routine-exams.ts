/**
 * Rotina de exames do pré-natal por trimestre.
 *
 * FONTE: Ministério da Saúde — Manual de Gestação de Alto Risco / Cadernos de
 * Atenção Básica (Pré-Natal de Baixo Risco); Febrasgo. Lista curada de apoio à
 * decisão — SEMPRE validar com o protocolo do serviço e a individualização do
 * caso (fatores de risco, exames já realizados, disponibilidade).
 */

export type Trimester = 1 | 2 | 3;

export interface RoutineExam {
  label: string;
  /** Observação/condição (ex.: "se Rh negativo", "24–28 sem"). */
  note?: string;
}

/** Trimestre a partir das semanas completas de IG. */
export function trimesterOf(gaWeeks: number | null): Trimester | null {
  if (gaWeeks == null || Number.isNaN(gaWeeks)) return null;
  if (gaWeeks < 14) return 1;
  if (gaWeeks < 28) return 2;
  return 3;
}

const FIRST: RoutineExam[] = [
  { label: "Hemograma" },
  { label: "Tipagem sanguínea ABO/Rh" },
  { label: "Coombs indireto", note: "se Rh negativo (mensal a partir de 24 sem)" },
  { label: "Glicemia de jejum" },
  { label: "HIV", note: "1º trimestre" },
  { label: "Sífilis (VDRL ou teste rápido)", note: "1º trimestre" },
  { label: "Hepatite B (HBsAg)", note: "1º trimestre" },
  { label: "Hepatite C (Anti-HCV)" },
  { label: "Toxoplasmose IgG/IgM" },
  { label: "Rubéola IgG" },
  { label: "Urina tipo I (EAS) + urocultura c/ antibiograma" },
  { label: "TSH", note: "se fator de risco" },
  { label: "Eletroforese de hemoglobina" },
  { label: "Colpocitologia oncótica (VCE)", note: "se fora do rastreio/indicada" },
  { label: "USG obstétrico", note: "idealmente 11–13 sem 6 d (translucência nucal)" },
];

const SECOND: RoutineExam[] = [
  { label: "TOTG 75 g", note: "24–28 sem (rastreio de DMG)" },
  { label: "Coombs indireto", note: "mensal se Rh negativo" },
  { label: "USG morfológico de 2º trimestre", note: "20–24 sem" },
  { label: "Urocultura", note: "se indicada" },
];

const THIRD: RoutineExam[] = [
  { label: "HIV (repetir)", note: "3º trimestre" },
  { label: "Sífilis (VDRL/teste rápido, repetir)", note: "3º trimestre" },
  { label: "Hepatite B (HBsAg, repetir)", note: "3º trimestre" },
  { label: "Hemograma" },
  { label: "Glicemia de jejum" },
  { label: "Coombs indireto", note: "se Rh negativo" },
  { label: "Cultura para EGB (swab vaginal e retal)", note: "35–37 sem" },
  { label: "Urocultura" },
  { label: "USG obstétrico", note: "crescimento/apresentação/ILA — se indicado" },
];

const BY_TRIMESTER: Record<Trimester, RoutineExam[]> = { 1: FIRST, 2: SECOND, 3: THIRD };

export function routineExamsFor(trimester: Trimester): RoutineExam[] {
  return BY_TRIMESTER[trimester];
}

/** Rótulo curto do trimestre (ex.: "1º trimestre"). */
export function trimesterLabel(trimester: Trimester): string {
  return `${trimester}º trimestre`;
}

/** Linha "SOLICITO: A / B / C" para colar na conduta. */
export function routineExamsRequestLine(trimester: Trimester): string {
  const items = routineExamsFor(trimester).map((e) => e.label);
  return `SOLICITO (ROTINA ${trimesterLabel(trimester).toUpperCase()}): ${items.join(" / ")}`;
}
