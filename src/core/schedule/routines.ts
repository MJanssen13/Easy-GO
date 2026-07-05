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

/**
 * Rotinas base (fases do trabalho de parto). Escolhe-se uma por vez; os
 * protocolos abaixo são adicionados por cima.
 */
export const BASE_ROUTINES: MonitoringRoutine[] = [
  {
    id: "latent_induction",
    label: "Indução / Condução / Fase latente",
    description:
      "BCF a cada 30 min; PA a cada 2 h; medicação a cada 4 h (misoprostol) ou ocitocina em dose crescente.",
    rules: [
      { params: ["BCF"], intervalMin: 30 },
      { params: ["PA"], intervalMin: 120 },
      { params: ["Medicação"], intervalMin: 240 },
    ],
    references: [
      "FEBRASGO. Indução do trabalho de parto.",
      "FIGO. Misoprostol recommended dosages, 2017.",
      "MS. Diretriz Nacional de Assistência ao Parto Normal, 2017/2022.",
    ],
  },
  {
    id: "active_phase",
    label: "Fase ativa",
    description: "BCF a cada 30 min; PA a cada 1 h; toque e dinâmica a cada 2 h.",
    rules: [
      { params: ["BCF"], intervalMin: 30 },
      { params: ["PA"], intervalMin: 60 },
      { params: ["Toque", "Dinâmica"], intervalMin: 120 },
    ],
    references: [
      "WHO. Intrapartum care for a positive childbirth experience, 2018.",
      "NICE NG235. Intrapartum care, 2023.",
      "MS. Diretriz Nacional de Assistência ao Parto Normal.",
    ],
  },
  {
    id: "expulsive",
    label: "Período expulsivo",
    description: "BCF a cada 5 min; PA a cada 1 h; toque e dinâmica a cada 1 h.",
    rules: [
      { params: ["BCF"], intervalMin: 5 },
      { params: ["PA"], intervalMin: 60 },
      { params: ["Toque", "Dinâmica"], intervalMin: 60 },
    ],
    references: [
      "WHO. Intrapartum care, 2018.",
      "NICE NG235, 2023 (ausculta a cada 5 min no 2º período).",
    ],
  },
  {
    id: "golden_hour",
    label: "4º período — Hora de ouro",
    description: "PA, FC e dinâmica (tônus/sangramento) a cada 15 min na 1ª hora pós-parto.",
    rules: [{ params: ["PA", "FC", "Dinâmica"], intervalMin: 15 }],
    references: [
      "WHO. Recommendations on postnatal care, 2022.",
      "MS. Diretriz de Assistência ao Parto Normal.",
    ],
  },
];

/**
 * Protocolos específicos — adições às rotinas, ligadas/desligadas por chaves de
 * seleção. Ao desmarcar, o planejamento futuro é removido, mas as aferições já
 * coletadas permanecem no histórico.
 */
export const PROTOCOL_ROUTINES: MonitoringRoutine[] = [
  {
    id: "mgso4",
    label: "Magnésio (MgSO₄)",
    description:
      "Reflexo patelar, FR e diurese a cada hora; PA a cada hora. Suspender se reflexo ausente, FR < 12 irpm ou diurese < 25 ml/h.",
    rules: [
      { params: ["Reflexo", "FR", "Diurese"], intervalMin: 60 },
      { params: ["PA"], intervalMin: 60 },
    ],
    references: [
      "MS. Manual de Gestação de Alto Risco, 2022.",
      "FEBRASGO. Pré-eclâmpsia.",
      "ACOG Practice Bulletin 222, 2020.",
    ],
  },
  {
    id: "diabetes",
    label: "Diabetes (DMG / Overt)",
    description:
      "Glicemia capilar a cada 4 h. Adicionado automaticamente se DMG ou Overt Diabetes.",
    rules: [{ params: ["DXT"], intervalMin: 240 }],
    references: [
      "FEBRASGO. Diabetes na gestação.",
      "MS. Manual de Gestação de Alto Risco, 2022.",
    ],
  },
  {
    id: "methyldopa",
    label: "Metildopa",
    description: "PA aferida em pé e sentada a cada hora.",
    rules: [{ params: ["PA"], intervalMin: 60 }],
    references: ["FEBRASGO. Hipertensão na gestação.", "MS. Gestação de Alto Risco, 2022."],
  },
];

/** Todas as rotinas (base + protocolos) — mantém referências antigas válidas. */
export const MONITORING_ROUTINES: MonitoringRoutine[] = [...BASE_ROUTINES, ...PROTOCOL_ROUTINES];

export function getRoutine(id: string): MonitoringRoutine | undefined {
  return MONITORING_ROUTINES.find((r) => r.id === id);
}

/** Detecta DMG / Overt Diabetes nos fatores de risco (para auto-ativar o protocolo). */
export function hasDiabetesRisk(riskFactors: string[]): boolean {
  return riskFactors.some((r) => /dmg|diabet|overt/i.test(r));
}
