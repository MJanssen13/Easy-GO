/**
 * Evidence-based monitoring routines (rotinas de aferição) for labor and the
 * obstetric protocols. Each routine is a set of (parameters → interval) rules
 * the planner expands into scheduled tasks.
 *
 * DECISION SUPPORT ONLY — intervals reflect common guideline recommendations
 * for LOW-RISK labor and standard protocols, and must be validated by the
 * assistant team for each patient. References are listed per routine.
 */

export interface RoutineRule {
  /** Parameters measured together at this cadence. */
  params: string[];
  /** Interval in minutes between measurements. */
  intervalMin: number;
}

export interface MonitoringRoutine {
  id: string;
  label: string;
  description: string;
  rules: RoutineRule[];
  references: string[];
}

export const MONITORING_ROUTINES: MonitoringRoutine[] = [
  {
    id: "labor_first_stage",
    label: "TP ativo — 1º período",
    description:
      "Trabalho de parto ativo de baixo risco: ausculta intermitente do BCF e dinâmica a cada 30 min; sinais vitais maternos a cada hora; toque conforme evolução (~2/2h).",
    rules: [
      { params: ["BCF", "Dinâmica"], intervalMin: 30 },
      { params: ["PA", "FC"], intervalMin: 60 },
      { params: ["Toque"], intervalMin: 120 },
    ],
    references: [
      "WHO. Intrapartum care for a positive childbirth experience, 2018.",
      "MS. Diretriz Nacional de Assistência ao Parto Normal, 2017/2022.",
      "NICE NG235. Intrapartum care, 2023.",
    ],
  },
  {
    id: "labor_second_stage",
    label: "2º período — expulsivo",
    description:
      "Período expulsivo: ausculta do BCF a cada 5 min (após contração); dinâmica e avaliação contínuas.",
    rules: [
      { params: ["BCF"], intervalMin: 5 },
      { params: ["Dinâmica"], intervalMin: 15 },
    ],
    references: [
      "WHO. Intrapartum care, 2018.",
      "NICE NG235, 2023 (ausculta a cada 5 min no 2º período).",
    ],
  },
  {
    id: "induction",
    label: "Indução / preparo de colo",
    description:
      "Indução com misoprostol/ocitocina: BCF e dinâmica a cada 30 min para vigilância de taquissistolia; PA/FC a cada hora; reavaliar colo antes de nova dose.",
    rules: [
      { params: ["BCF", "Dinâmica"], intervalMin: 30 },
      { params: ["PA", "FC"], intervalMin: 60 },
      { params: ["Toque"], intervalMin: 360 },
    ],
    references: [
      "FEBRASGO. Indução do trabalho de parto.",
      "FIGO. Misoprostol recommended dosages, 2017.",
      "MS. Diretriz de Assistência ao Parto Normal.",
    ],
  },
  {
    id: "mgso4",
    label: "MgSO₄ — pré-eclâmpsia/eclâmpsia",
    description:
      "Vigilância da sulfatação: reflexo patelar, FR e diurese a cada hora; PA a cada hora. Suspender se reflexo ausente, FR < 12 irpm ou diurese < 25 ml/h.",
    rules: [
      { params: ["Reflexo", "FR", "Diurese"], intervalMin: 60 },
      { params: ["PA"], intervalMin: 60 },
    ],
    references: [
      "MS. Manual de Gestação de Alto Risco, 2022.",
      "FEBRASGO. Pré-eclâmpsia.",
      "ACOG Practice Bulletin 222. Gestational Hypertension and Preeclampsia, 2020.",
    ],
  },
  {
    id: "severe_hypertension",
    label: "Crise hipertensiva",
    description:
      "PA em níveis graves (≥160×110): aferir PA a cada 15 min até estabilizar; vigiar sintomas de iminência.",
    rules: [{ params: ["PA"], intervalMin: 15 }],
    references: [
      "ACOG Committee Opinion 767. Emergent therapy for acute-onset severe hypertension, 2019.",
      "MS. Gestação de Alto Risco, 2022.",
    ],
  },
  {
    id: "immediate_postpartum",
    label: "Pós-parto imediato (4º período)",
    description:
      "Primeira hora pós-parto: PA, FC, tônus uterino e sangramento a cada 15 min.",
    rules: [{ params: ["PA", "FC", "Dinâmica"], intervalMin: 15 }],
    references: [
      "WHO. Recommendations on postnatal care, 2022.",
      "MS. Diretriz de Assistência ao Parto Normal.",
    ],
  },
];

export function getRoutine(id: string): MonitoringRoutine | undefined {
  return MONITORING_ROUTINES.find((r) => r.id === id);
}
