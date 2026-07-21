/**
 * Exame físico do MODELO DE PRÉ-NATAL (ambulatório): textos padrão "normal" por
 * sistema, com sinais vitais interpolados, e modo "alterado" (texto livre) ou
 * "não realizado" (exame especular / toque vaginal na consulta de rotina).
 *
 * Reaproveita o conceito de `ExamMode`/`ExamSystemState` do PSGO, mas com as
 * frases da caderneta de pré-natal e a inclusão de AU/CA/BCF no abdome gravídico.
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
  /** Permite marcar "não realizado" (exame especular / toque de rotina). */
  canSkip?: boolean;
  /** Rótulo usado na linha "NÃO REALIZADO". */
  notdoneLabel?: string;
}

export const PRENATAL_EXAM_SYSTEMS: PrenatalExamSystemDef[] = [
  { id: "geral", label: "Geral" },
  { id: "tireoide", label: "Tireoide" },
  { id: "acv", label: "Ap. cardiovascular" },
  { id: "ar", label: "Ap. respiratório" },
  { id: "mamas", label: "Mamas" },
  { id: "abdome", label: "Abdome (gravídico)" },
  { id: "vulva", label: "Inspeção vulvar" },
  { id: "especular", label: "Exame especular", canSkip: true, notdoneLabel: "EXAME ESPECULAR" },
  { id: "toque", label: "Toque vaginal", canSkip: true, notdoneLabel: "TOQUE VAGINAL" },
  { id: "mmii", label: "MMII" },
];

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
    case "abdome":
      return `ABDOME: GRAVÍDICO, INDOLOR, AU: ${v.au ?? ""} CM, CA: ${v.ca ?? ""} CM, BCF: ${v.bcf ?? ""} BPM`;
    case "vulva":
      return "INSPEÇÃO VULVAR: SEM LESÕES, PILIFICAÇÃO TÍPICA";
    case "especular":
      return "EXAME ESPECULAR: COLO DE SUPERFÍCIE LISA, OE EM FENDA CIRCULAR, SECREÇÃO FISIOLÓGICA, PAREDES VAGINAIS RUGOSAS";
    case "toque":
      return "TOQUE VAGINAL: COLO G, P, NL, OEI, SEM SANGUE EM DEDO DE LUVAS";
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
  for (const s of PRENATAL_EXAM_SYSTEMS) exam[s.id] = { mode: "normal", text: "" };
  return exam;
}
