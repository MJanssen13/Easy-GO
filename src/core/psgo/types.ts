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

export const HABITS = ["NEGA", "UDI", "TBG", "ÁLCOOL"];

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

  // pré-natal
  prenatalCount: string;
  prenatalPlace: string;

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
  coombs: "" | "pos" | "neg";
  coombsDate: string;

  // comorbidades
  comorbidities: string[];
  comorbiditiesOther: string;

  // medicamentos
  medications: MedicationUse[];
  medicationsOther: string;

  // cirurgias / alergias / hábitos
  surgeries: string;
  allergies: string;
  habits: string[];
  habitsOther: string;

  // queixa / história
  qp: string;
  hpma: string;

  // exame físico
  weight: string;
  height: string;
  vitals: ExamVitals;
  exam: Record<string, ExamSystemState>;
  gyneco: GynecoState;

  // CTG
  ctg: string;

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

export function emptyPsgoForm(): PsgoForm {
  const exam: Record<string, ExamSystemState> = {};
  for (const s of EXAM_SYSTEMS) exam[s.id] = { mode: "normal", text: "" };

  return {
    date: todayISO(),
    name: "",
    socialName: "",
    rg: "",
    age: "",
    origin: "",
    companion: "",
    companionRelation: "",
    prenatalCount: "",
    prenatalPlace: "",
    priorPregnancies: [],
    lmp: "",
    lmpUncertain: false,
    datingPreference: "auto",
    presentation: "",
    fetuses: "",
    laborOnset: "",
    bloodType: "",
    coombs: "",
    coombsDate: "",
    comorbidities: [],
    comorbiditiesOther: "",
    medications: [],
    medicationsOther: "",
    surgeries: "",
    allergies: "",
    habits: [],
    habitsOther: "",
    qp: "",
    hpma: "",
    weight: "",
    height: "",
    vitals: {},
    exam,
    gyneco: emptyGynecoState(),
    ctg: "",
    cd: "",
    serologyPasted: "",
    serologyGrid: emptySerologyGrid(),
    labs: "",
    imagingExams: [],
  };
}

export type { UsgExam, DatingPreference, PriorPregnancy, MedicationUse, ExamSystemState, ExamVitals };
