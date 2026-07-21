/**
 * Exame físico do MODELO DE PRÉ-NATAL (ambulatório): textos padrão "normal" por
 * sistema, com sinais vitais interpolados, e modo "alterado" (texto livre).
 *
 * O abdome gravídico, o toque vaginal e o exame especular NÃO ficam aqui — são
 * detalhados no exame ginecológico/obstétrico (clicável), reaproveitado do PSGO
 * (`@/core/psgo/gyneco-exam`). Aqui ficam os demais sistemas + os específicos do
 * pré-natal (tireoide, mamas e inspeção vulvar).
 */

export type PrenatalExamMode = "normal" | "altered";

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
}

export const PRENATAL_EXAM_SYSTEMS: PrenatalExamSystemDef[] = [
  { id: "geral", label: "Geral" },
  { id: "tireoide", label: "Tireoide" },
  { id: "acv", label: "Ap. cardiovascular" },
  { id: "ar", label: "Ap. respiratório" },
  { id: "mamas", label: "Mamas" },
  { id: "vulva", label: "Inspeção vulvar" },
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
    case "vulva":
      return "INSPEÇÃO VULVAR: SEM LESÕES, PILIFICAÇÃO TÍPICA";
    case "mmii":
      return "MMII: SEM EDEMAS, PANTURRILHAS LIVRES, SEM SINAIS DE EMPASTAMENTO, SEM VARIZES";
    default:
      return "";
  }
}

/** Texto final de um sistema conforme o modo (normal / alterado). */
export function buildPrenatalExamLine(
  def: PrenatalExamSystemDef,
  state: PrenatalExamSystemState,
  vitals: PrenatalVitals,
): string {
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
