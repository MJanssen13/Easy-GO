/**
 * Gerador da EVOLUÇÃO DE PLANTÃO do Pré-Parto (formato HC-UFTM): nota narrativa
 * de passagem de plantão + seção PARÂMETROS alimentada pelo log de evoluções
 * (linhas compactas) + equipe de plantão. Puro (roda no cliente).
 */
import type { Patient, Observation } from "@/core/patients/types";
import { gaFromLMP } from "@/core/obstetric/gestational-age";
import { resolveDating } from "@/core/obstetric/gestational-age";
import { renderObservationLine } from "./preparto";

export type ShiftPeriod = "diurno" | "noturno";
export type InductionMode = "none" | "iniciada" | "mantida";
export type ParamsWindow = "12H" | "24H";

export interface InductionInput {
  mode: InductionMode;
  drug: string; // ex.: "MISOPROSTOL 25 MCG VV"
  startDate?: string; // ISO
  startTime?: string; // "07H" ou "07:00"
  count?: string; // nº de comprimidos
  pressureCurve: boolean; // "CURVA PRESSÓRICA"
}

/** Equipe de plantão — um campo por cargo; vários nomes separados por vírgula. */
export interface TeamInput {
  chefia: string;
  r3: string;
  r2: string;
  r1: string;
  internos: string;
}

export interface ShiftNoteInput {
  shift: ShiftPeriod;
  noteDate: string; // ISO
  admissionDate: string; // ISO (data ou datetime)
  reason: string; // motivo da admissão
  clinicalText: string; // "PACIENTE SE ENCONTRA EM BEG..."
  induction: InductionInput;
  reviewOfSystems: string; // "NEGA PERDAS..."
  window: ParamsWindow;
  team: TeamInput;
}

const TEAM_ROLE_LABELS: Array<[keyof TeamInput, string]> = [
  ["chefia", "CHEFIA"],
  ["r3", "R3"],
  ["r2", "R2"],
  ["r1", "R1"],
  ["internos", "INTERNOS"],
];

const DEFAULT_CLINICAL =
  "PACIENTE SE ENCONTRA EM BEG, REFERINDO ENRIJECIMENTO ABDOMINAL ESPORÁDICO COM DOR DURANTE AS CONTRAÇÕES.";
const DEFAULT_ROS =
  "NEGA PERDAS TRANSVAGINAIS. NEGA ALTERAÇÕES URINÁRIAS E INTESTINAIS. REFERE BOA MOVIMENTAÇÃO FETAL. NEGA FEBRE. NEGA OUTRAS QUEIXAS.";

function todayISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/** Valores iniciais da nota, derivados da paciente. */
export function defaultShiftInput(patient: Patient): ShiftNoteInput {
  const h = new Date().getHours();
  return {
    shift: h >= 7 && h < 19 ? "diurno" : "noturno",
    noteDate: todayISO(),
    admissionDate: (patient.admissionDate ?? "").slice(0, 10),
    reason: "INDUÇÃO AO PARTO VAGINAL",
    clinicalText: DEFAULT_CLINICAL,
    induction: {
      mode: "none",
      drug: "MISOPROSTOL 25 MCG VV",
      startDate: "",
      startTime: "",
      count: "",
      pressureCurve: !!patient.useMethyldopa,
    },
    reviewOfSystems: DEFAULT_ROS,
    window: "12H",
    team: { chefia: "", r3: "", r2: "", r1: "", internos: "" },
  };
}

function dateShort(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = String(d.getFullYear()).slice(-2);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${y}`;
}

/** IG atual em "X SEMANAS E Y DIAS" + método (DUM/USG). */
function gaPhrase(patient: Patient): { phrase: string; method: string } | null {
  // Método vigente: usa o registrado; senão infere (lmp → DUM).
  const method =
    patient.datingMethod === "ultrasound"
      ? "USG"
      : patient.datingMethod === "lmp"
        ? "DUM"
        : patient.lmp
          ? "DUM"
          : "USG";

  if (patient.lmp) {
    try {
      const ga = resolveDating({ lmp: new Date(`${patient.lmp}T00:00:00`) }).ga;
      return { phrase: `${ga.weeks} SEMANAS E ${ga.days} DIAS`, method };
    } catch {
      const ga = gaFromLMP(new Date(`${patient.lmp}T00:00:00`));
      return { phrase: `${ga.weeks} SEMANAS E ${ga.days} DIAS`, method };
    }
  }
  if (patient.gaWeeks != null) {
    return { phrase: `${patient.gaWeeks} SEMANAS E ${patient.gaDays ?? 0} DIAS`, method };
  }
  return null;
}

export function renderShiftEvolution(
  patient: Patient,
  observations: Observation[],
  input: ShiftNoteInput,
  now: Date = new Date(),
): string {
  const L: string[] = [];

  L.push(`### EVOLUÇÃO ${input.shift === "noturno" ? "NOTURNA" : "DIURNA"} PRÉ-PARTO - ${dateShort(input.noteDate)} ###`);
  L.push("");

  // Narrativa
  const ga = gaPhrase(patient);
  const gaStr = ga ? `${ga.phrase} (${ga.method})` : "";
  const comorb = (patient.riskFactors ?? []).join(" + ");
  const hora = input.shift === "noturno" ? "19HS" : "7HS";

  const narrative: string[] = [];
  narrative.push(
    `ASSUMO PLANTÃO ${input.shift === "noturno" ? "NOTURNO" : "DIURNO"} AS ${hora} DIA ${dateShort(input.noteDate)}, PACIENTE INTERNADA EM ${dateShort(input.admissionDate)} DEVIDO A GESTAÇÃO DE ${gaStr}${comorb ? ` + ${comorb}` : ""}, ADMITIDA PARA ${input.reason}, A FIM DE PROSSEGUIR ASSISTÊNCIA A MESMA.`,
  );
  if (input.clinicalText.trim()) narrative.push(input.clinicalText.trim());

  if (input.induction.mode !== "none") {
    const verb = input.induction.mode === "iniciada" ? "INICIADA" : "FOI MANTIDA";
    let ind = `${verb} INDUÇÃO COM ${input.induction.drug}`;
    if (input.induction.mode === "iniciada" && (input.induction.startDate || input.induction.startTime)) {
      const when = [
        input.induction.startDate ? `EM ${dateShort(input.induction.startDate)}` : "",
        input.induction.startTime ? `ÀS ${input.induction.startTime}` : "",
      ]
        .filter(Boolean)
        .join(" ");
      ind += ` ${when}`;
    }
    if (input.induction.count) ind += `, SENDO REALIZADOS ATÉ O MOMENTO ${input.induction.count}CP`;
    ind += ".";
    narrative.push(ind);
    narrative.push(
      `MANTIDAS DINÂMICAS UTERINAS${input.induction.pressureCurve ? ", CURVA PRESSÓRICA" : ""} E REAVALIAÇÕES SERIADAS CONSTANTES.`,
    );
  }
  if (input.reviewOfSystems.trim()) narrative.push(input.reviewOfSystems.trim());

  L.push(narrative.join(" "));
  L.push("");

  // Parâmetros (alimentados pelo log de evoluções na janela do plantão)
  L.push(`PARÂMETROS EM ${input.window}:`);
  const windowMs = (input.window === "24H" ? 24 : 12) * 3600 * 1000;
  const start = now.getTime() - windowMs;
  const lines = observations
    .filter((o) => {
      const t = new Date(o.recordedAt).getTime();
      return !Number.isNaN(t) && t >= start;
    })
    .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
    .map((o) => renderObservationLine(o));
  for (const line of lines) L.push(line);

  L.push("");
  L.push("MANTENHO VIGILÂNCIA CLÍNICA E OBSTÉTRICA");

  // Equipe de plantão — só os cargos preenchidos.
  const teamLines = TEAM_ROLE_LABELS.flatMap(([key, label]) => {
    const value = (input.team[key] ?? "").trim();
    return value ? [`${label}: ${value}`] : [];
  });
  if (teamLines.length > 0) {
    L.push("");
    L.push("EQUIPE DE PLANTÃO:");
    for (const line of teamLines) L.push(line);
  }

  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim().toUpperCase();
}
