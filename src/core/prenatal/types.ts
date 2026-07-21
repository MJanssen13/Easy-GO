/**
 * Modelo do formulário de consulta de PRÉ-NATAL (ambulatório). Reaproveita os
 * tipos de domínio puros do PSGO (paridade, medicamentos, datação, sorologias,
 * exames de imagem) e acrescenta o que é específico do pré-natal: cartão de
 * vacinas, bloco CONTEXTO e o exame físico da caderneta (com AU/CA/BCF).
 *
 * Assim como o PSGO, é um GERADOR sem estado — monta o texto do prontuário e não
 * persiste dados.
 */
import type { PriorPregnancy } from "@/core/psgo/parity";
import type { MedicationUse } from "@/core/psgo/medications";
import type { DatingPreference } from "@/core/psgo/dating";
import type { SerologyGrid } from "@/core/psgo/serology";
import { emptySerologyGrid } from "@/core/psgo/serology";
import type { ImagingExam } from "@/core/psgo/imaging";
import type { CoombsEntry } from "@/core/psgo/types";
import type { GynecoState } from "@/core/psgo/gyneco-exam";
import { emptyGynecoState } from "@/core/psgo/gyneco-exam";
import type { PrenatalVitals, PrenatalExamState } from "./exam";
import { emptyPrenatalExam } from "./exam";
import type { VaccineCard } from "./vaccines";
import { emptyVaccineCard } from "./vaccines";

export interface PrenatalForm {
  date: string; // data da consulta (ISO)

  // identificação
  name: string;
  socialName: string;
  rg: string;
  age: string;
  origin: string;

  // acompanhamento pré-natal
  prenatalPlace: string;
  prenatalCount: string;
  prenatalIrregular: boolean;

  // paridade (GPA)
  priorPregnancies: PriorPregnancy[];

  // datação (a IG por USG vem do quadro de exames de imagem)
  lmp: string;
  lmpUncertain: boolean;
  datingPreference: DatingPreference;

  // tipo sanguíneo / coombs indireto
  bloodType: string;
  coombsList: CoombsEntry[];

  // comorbidades / medicamentos / cirurgias / alergias / hábitos
  comorbidities: string[];
  comorbiditiesOther: string;
  medications: MedicationUse[];
  medicationsOther: string;
  medicationsPast: string;
  surgeries: string;
  surgeriesDenied: boolean;
  allergies: string;
  allergiesDenied: boolean;
  habits: string[];
  habitsOther: string;
  udiWhich: string;

  // cartão de vacinas
  vaccines: VaccineCard;

  /** VCE — resultado da colpocitologia oncótica (Papanicolau); texto livre. */
  vce: string;
  /** Data do VCE (Papanicolau), opcional. */
  vceDate: string;

  // sorologias
  serologyPasted: string;
  serologyGrid: SerologyGrid;

  // contexto da consulta (HPMA adaptada do PSGO: revisão dirigida + queixas atuais)
  /** Valores da revisão dirigida (chaves `rev.<id>` e sub-campos). */
  revision: Record<string, string>;
  /** Queixas atuais (texto livre). */
  currentComplaints: string;

  // exame físico
  weight: string;
  /** Peso pré-gestacional (kg) — para IMC pré-gestacional e ganho de peso. */
  prePregnancyWeight: string;
  height: string;
  vitals: PrenatalVitals;
  exam: PrenatalExamState;
  /** Exame ginecológico/obstétrico clicável (abdome, toque, especular) — reuso do PSGO. */
  gyneco: GynecoState;

  // laboratoriais / imagem
  labs: string;
  imagingExams: ImagingExam[];
  otherImaging: string;

  // hipótese diagnóstica (vazia = HD automática)
  hd: string;

  // conduta
  cd: string;
}

function todayISO(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

/**
 * Formulário vazio. `date` pode ser passada (calculada no servidor) para evitar
 * divergência de hidratação; sem ela usa a data local de hoje.
 */
export function emptyPrenatalForm(date?: string): PrenatalForm {
  return {
    date: date ?? todayISO(),
    name: "",
    socialName: "",
    rg: "",
    age: "",
    origin: "",
    prenatalPlace: "",
    prenatalCount: "",
    prenatalIrregular: false,
    priorPregnancies: [],
    lmp: "",
    lmpUncertain: false,
    datingPreference: "auto",
    bloodType: "",
    coombsList: [],
    comorbidities: [],
    comorbiditiesOther: "",
    medications: [],
    medicationsOther: "",
    medicationsPast: "",
    surgeries: "",
    surgeriesDenied: false,
    allergies: "",
    allergiesDenied: false,
    habits: [],
    habitsOther: "",
    udiWhich: "",
    vaccines: emptyVaccineCard(),
    vce: "",
    vceDate: "",
    serologyPasted: "",
    serologyGrid: emptySerologyGrid(),
    revision: {},
    currentComplaints: "",
    weight: "",
    prePregnancyWeight: "",
    height: "",
    vitals: {},
    exam: emptyPrenatalExam(),
    gyneco: emptyGynecoState(),
    labs: "",
    imagingExams: [],
    otherImaging: "",
    hd: "",
    cd: "",
  };
}

export type { PrenatalVitals, PrenatalExamState } from "./exam";
export type { VaccineCard } from "./vaccines";
