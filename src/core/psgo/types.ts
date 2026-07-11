import type { PriorPregnancy } from "./parity";
import type { MedicationUse } from "./medications";
import type { ExamSystemState, ExamVitals } from "./exam";
import { EXAM_SYSTEMS } from "./exam";
import type { UsgExam, DatingPreference } from "./dating";
import type { RobsonPresentation, RobsonFetuses, RobsonOnset } from "./robson";
import type { SerologyGrid } from "./serology";
import { emptySerologyGrid } from "./serology";
import type { ImagingExam } from "./imaging";
import type { GynecoState } from "./gyneco-exam";
import { emptyGynecoState } from "./gyneco-exam";
import type { PsgoCtg } from "./ctg";

export const HABITS = ["NEGA", "UDI", "TBG", "ALCOOLISMO", "ERRO ALIMENTAR", "SEDENTARISMO"];

/** Um resultado de Coombs indireto (CI) com sua data. */
export interface CoombsEntry {
  id: string;
  result: "" | "pos" | "neg";
  date: string;
}

export const COMPANION_RELATIONS = [
  "ESPOSO",
  "COMPANHEIRO(A)",
  "MÃE",
  "PAI",
  "IRMÃ(O)",
  "FILHO(A)",
  "AMIGO(A)",
  "OUTRO",
];

export interface PsgoForm {
  date: string; // data da consulta (ISO)

  // identificação
  name: string;
  socialName: string;
  rg: string;
  age: string;
  origin: string;
  companion: string;
  companionRelation: string;
  /** Preenchido quando `companionRelation === "OUTRO"`. */
  companionRelationOther: string;

  // pré-natal
  prenatalCount: string;
  prenatalPlace: string;
  prenatalIrregular: boolean;

  // situação atual (o PSGO também atende pessoas não gestantes)
  pregnant: boolean;

  // paridade
  priorPregnancies: PriorPregnancy[];

  // datação (o USG usado para datar vem do quadro de exames de imagem)
  lmp: string;
  lmpUncertain: boolean;
  datingPreference: DatingPreference;

  // dados clínicos para Robson
  presentation: RobsonPresentation | "";
  fetuses: RobsonFetuses | "";
  laborOnset: RobsonOnset | "";

  // tipo sanguíneo / coombs
  bloodType: string;
  /** Coombs indiretos (CI) realizados, cada um com sua data. */
  coombsList: CoombsEntry[];
  /** Legado (CI único) — migrado para `coombsList` ao reabrir. */
  coombs?: "" | "pos" | "neg";
  coombsDate?: string;

  // comorbidades
  comorbidities: string[];
  comorbiditiesOther: string;

  // medicamentos
  medications: MedicationUse[];
  medicationsOther: string;
  /** Texto livre de medicamentos que a paciente já usou ("fez uso"). */
  medicationsPast: string;

  // cirurgias / alergias / hábitos
  surgeries: string;
  allergies: string;
  habits: string[];
  habitsOther: string;
  /** Droga(s) informada(s) quando UDI está marcado. */
  udiWhich: string;

  // queixa / história
  qp: string;
  hpma: string;

  // exame físico
  weight: string;
  height: string;
  vitals: ExamVitals;
  exam: Record<string, ExamSystemState>;
  gyneco: GynecoState;

  // CTG (laudos estruturados; `ctg` legado = texto livre)
  ctg: string;
  ctgLaudos: PsgoCtg[];

  // conduta
  cd: string;

  // sorologias
  serologyPasted: string;
  serologyGrid: SerologyGrid;

  // laboratoriais
  labs: string;

  // exames de imagem (USG)
  imagingExams: ImagingExam[];
}

function todayISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/**
 * Formulário vazio. `date` pode ser passada (ex.: calculada no servidor) para
 * evitar divergência de hidratação; sem ela, usa a data local de hoje.
 */
export function emptyPsgoForm(date?: string): PsgoForm {
  const exam: Record<string, ExamSystemState> = {};
  for (const s of EXAM_SYSTEMS) exam[s.id] = { mode: "normal", text: "" };

  return {
    date: date ?? todayISO(),
    name: "",
    socialName: "",
    rg: "",
    age: "",
    origin: "",
    companion: "",
    companionRelation: "",
    companionRelationOther: "",
    prenatalCount: "",
    prenatalPlace: "",
    prenatalIrregular: false,
    pregnant: true,
    priorPregnancies: [],
    lmp: "",
    lmpUncertain: false,
    datingPreference: "auto",
    presentation: "",
    fetuses: "",
    laborOnset: "",
    bloodType: "",
    coombsList: [],
    comorbidities: [],
    comorbiditiesOther: "",
    medications: [],
    medicationsOther: "",
    medicationsPast: "",
    surgeries: "",
    allergies: "",
    habits: [],
    habitsOther: "",
    udiWhich: "",
    qp: "",
    hpma: "",
    weight: "",
    height: "",
    vitals: {},
    exam,
    gyneco: emptyGynecoState(),
    ctg: "",
    ctgLaudos: [],
    cd: "",
    serologyPasted: "",
    serologyGrid: emptySerologyGrid(),
    labs: "",
    imagingExams: [],
  };
}

export type { UsgExam, DatingPreference, PriorPregnancy, MedicationUse, ExamSystemState, ExamVitals };
