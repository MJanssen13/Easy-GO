/**
 * Exame físico do MODELO DE PRÉ-NATAL (ambulatório): textos padrão "normal" por
 * sistema, com sinais vitais interpolados, e modo "alterado" (texto livre) ou
 * "não realizado" (mamas / inspeção vulvar).
 *
 * O abdome gravídico, o toque vaginal e o exame especular NÃO ficam aqui — são
 * detalhados no exame ginecológico/obstétrico (clicável), reaproveitado do PSGO
 * (`@/core/psgo/gyneco-exam`). Mamas e inspeção vulvar também são exibidas nesse
 * exame ginecológico, mas seguem o modelo normal/alterado/não realizado daqui.
 */

export type PrenatalExamMode = "normal" | "altered" | "notdone";

export interface PrenatalExamSystemState {
  mode: PrenatalExamMode;
  /** Texto usado quando `mode === "altered"`. */
  text: string;
}

/** Sinais vitais do exame de pré-natal (PA, FC, SatO2, AU, CA, BCF). */
export interface PrenatalVitals {
  pas?: string;
  pad?: string;
  fc?: string;
  sat?: string;
  temp?: string;
  /** Altura uterina (cm). */
  au?: string;
  /** Circunferência abdominal (cm). */
  ca?: string;
  /** Batimentos cardiofetais (bpm). */
  bcf?: string;
}

export interface PrenatalExamSystemDef {
  id: string;
  label: string;
  /** Permite marcar "não realizado" (mamas / inspeção vulvar). */
  canSkip?: boolean;
  /** Rótulo usado na linha "NÃO REALIZADO". */
  notdoneLabel?: string;
}

/** Sistemas do card "Exame físico". */
export const PRENATAL_PHYS_SYSTEMS: PrenatalExamSystemDef[] = [
  { id: "geral", label: "Geral" },
  { id: "tireoide", label: "Tireoide" },
  { id: "acv", label: "Ap. cardiovascular" },
  { id: "ar", label: "Ap. respiratório" },
  { id: "mmii", label: "MMII" },
];

/** Mamas e inspeção vulvar — exibidas no exame ginecológico/obstétrico. */
export const PRENATAL_GYN_EXAM_SYSTEMS: PrenatalExamSystemDef[] = [
  { id: "mamas", label: "Mamas", canSkip: true, notdoneLabel: "MAMAS" },
  { id: "vulva", label: "Inspeção vulvar", canSkip: true, notdoneLabel: "INSPEÇÃO VULVAR" },
];

const ALL_SYSTEMS = [...PRENATAL_PHYS_SYSTEMS, ...PRENATAL_GYN_EXAM_SYSTEMS];

export function prenatalExamDef(id: string): PrenatalExamSystemDef {
  return ALL_SYSTEMS.find((s) => s.id === id)!;
}

/** Texto "normal" de um sistema, com os sinais vitais preenchidos. */
export function prenatalNormalLine(id: string, v: PrenatalVitals): string {
  switch (id) {
    case "geral": {
      const temp = v.temp?.trim() ? `TAX ${v.temp.trim()}°C` : "AFEBRIL";
      return `BEG, CORADA, HIDRATADA, ACIANÓTICA, ANICTÉRICA, ${temp}`;
    }
    case "tireoide":
      return "TIREOIDE NORMOPALPÁVEL, SEM NÓDULOS OU ABAULAMENTOS";
    case "acv": {
      const pa = v.pas && v.pad ? `${v.pas}X${v.pad}` : "";
      return `ACV: BRNF A 2T, SEM SOPROS, PA: ${pa} MMHG, FC: ${v.fc ?? ""} BPM`;
    }
    case "ar":
      return `AR: MV+ SEM RA, EUPNEICA, SATO2: ${v.sat ?? ""}% EM AA`;
    case "mamas":
      return "MAMAS: EM NÚMERO DE 2, PTÓTICAS, MAMILOS EVERTIDOS, DE MÉDIO VOLUME, SEM ABAULAMENTOS, RETRAÇÕES E CICATRIZES, PARÊNQUIMA HETEROGÊNEO, SEM NÓDULOS PALPÁVEIS, FOSSAS AXILARES E FOSSAS INFRA E SUPRACLAVICULARES LIVRES";
    case "vulva":
      return "INSPEÇÃO VULVAR: SEM LESÕES, PILIFICAÇÃO TÍPICA";
    case "mmii":
      return "MMII: SEM EDEMAS, PANTURRILHAS LIVRES, SEM SINAIS DE EMPASTAMENTO, SEM VARIZES";
    default:
      return "";
  }
}

/** Texto final de um sistema conforme o modo (normal / alterado / não realizado). */
export function buildPrenatalExamLine(
  def: PrenatalExamSystemDef,
  state: PrenatalExamSystemState,
  vitals: PrenatalVitals,
): string {
  if (state.mode === "notdone" && def.canSkip) {
    return `${def.notdoneLabel ?? def.label.toUpperCase()}: NÃO REALIZADO`;
  }
  if (state.mode === "altered" && state.text.trim() !== "") {
    return state.text.trim();
  }
  return prenatalNormalLine(def.id, vitals);
}

export type PrenatalExamState = Record<string, PrenatalExamSystemState>;

export function emptyPrenatalExam(): PrenatalExamState {
  const exam: PrenatalExamState = {};
  for (const s of ALL_SYSTEMS) exam[s.id] = { mode: "normal", text: "" };
  return exam;
}
