/**
 * Exame físico do MODELO PS: textos padrão "normal" por sistema, com sinais
 * vitais interpolados, e modo "alterado" (texto livre editável).
 */

export type ExamMode = "normal" | "altered";

export interface ExamVitals {
  temp?: string;
  fr?: string;
  sat?: string;
  pas?: string;
  pad?: string;
  fc?: string;
  au?: string;
  bcf?: string;
}

export interface ExamSystemState {
  mode: ExamMode;
  /** Texto usado quando mode === "altered". */
  text: string;
}

export interface ExamSystemDef {
  id: string;
  label: string;
}

export const EXAM_SYSTEMS: ExamSystemDef[] = [
  { id: "geral", label: "Geral" },
  { id: "ar", label: "Ap. respiratório" },
  { id: "acv", label: "Ap. cardiovascular" },
  { id: "abd", label: "Abdome (gravídico)" },
  { id: "toque", label: "Toque vaginal" },
  { id: "mmii", label: "MMII" },
];

/** Texto "normal" de um sistema, com os sinais vitais preenchidos. */
export function buildNormalLine(id: string, v: ExamVitals): string {
  switch (id) {
    case "geral":
      return `GERAL: BEG, LOTE, ACIANÓTICA, ANICTÉRICA, TEMP: (${v.temp ?? ""}), HIDRATADA, CORADA.`;
    case "ar":
      return `AR: MVUA, S/RA, FR ${v.fr ?? ""} IRPM, SAT ${v.sat ?? ""}%`;
    case "acv": {
      const pa = v.pas && v.pad ? `${v.pas}X${v.pad}` : "";
      return `ACV: BNF, RR 2T, S/SOPRO, PA ${pa} MMHG, FC ${v.fc ?? ""} BPM`;
    }
    case "abd":
      return `ABD: RHA+, S/ DOR A PALPAÇÃO, SEM SINAIS DE IRRITAÇÃO PERITONEAL. GRAVÍDICO, SEM DU, TONUS HABITUAL, AU: ${v.au ?? ""}, BCF: ${v.bcf ?? ""} BPM`;
    case "toque":
      return "TOQUE VAGINAL (AUTORIZADO PELA PACIENTE): COLO G, P, NL, OEI, SEM SANGUE EM DEDO DE LUVAS";
    case "mmii":
      return "MMII: PANTURRILHAS LIVRES, S/EDEMA, S/ SINAIS DE EMPASTAMENTO, PULSOS PERIFÉRICOS PRESENTES E SIMÉTRICOS.";
    default:
      return "";
  }
}

/** Texto final de um sistema, conforme o modo. */
export function buildExamLine(id: string, state: ExamSystemState, vitals: ExamVitals): string {
  if (state.mode === "altered" && state.text.trim() !== "") {
    const prefix = id.toUpperCase();
    const text = state.text.trim();
    // Evita duplicar o prefixo se o usuário já o escreveu.
    return text.toUpperCase().startsWith(prefix) ? text : `${prefix}: ${text}`;
  }
  return buildNormalLine(id, vitals);
}
