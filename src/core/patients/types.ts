import type { PatientModule, PatientStatus, PatientOutcome } from "@/types/database";

export type { PatientModule, PatientStatus, PatientOutcome };

/** Vital signs captured in an observation. */
export interface VitalSigns {
  fc?: number; // bpm
  tax?: number; // °C
  spo2?: number; // %
  dxt?: number; // mg/dL
  paSystolic?: number;
  paDiastolic?: number;
  paStandingSystolic?: number; // protocolo metildopa
  paStandingDiastolic?: number;
}

export type MembraneStatus = "intact" | "ruptured_clear" | "ruptured_meconium";

/** Obstetric exam (toque, dinâmica, BCF). */
export interface ObstetricData {
  bcf?: number;
  dynamicsSummary?: string; // ex.: "2x30''/10'"
  dilation?: number; // cm (0-10)
  /** Colo sem dilatação numérica (ex.: OEI, OEEA, OII). */
  cervixStatus?: string[];
  effacement?: number; // %
  cervixPosition?: "posterior" | "intermediate" | "central";
  /** Consistência do colo (mnemônico nasal/nasolabial/labial → N/NL/L). */
  cervixConsistency?: "nasal" | "nasolabial" | "labial";
  station?: number; // De Lee (-4 a +4)
  presentation?: "cephalic" | "breech" | "transverse";
  membranes?: MembraneStatus;
  bloodOnGlove?: boolean;
  cervixObservation?: string;
}

export interface MagnesiumData {
  reflex: "present" | "absent" | "increased" | "decreased";
  diuresis: string;
  respiratoryRate?: number; // irpm
}

export interface Medication {
  misoprostolDose?: number; // mcg
  misoprostolCount?: number;
  oxytocinDose?: number; // ml/h
  antibiotic?: string;
  notes?: string;
}

export type ScheduledTaskStatus = "pending" | "completed" | "cancelled";

export interface ScheduledTask {
  id: string;
  timestamp: string; // ISO
  focus: string[];
  status: ScheduledTaskStatus;
}

export interface Observation {
  id: string;
  patientId: string;
  recordedAt: string; // ISO
  vitals: VitalSigns;
  obstetric: ObstetricData;
  medication?: Medication;
  magnesiumData?: MagnesiumData;
  examinerName?: string | null;
  notes?: string | null;
}

export interface Patient {
  id: string;
  module: PatientModule;
  name: string;
  medicalRecordNumber?: string | null;
  bed?: string | null;
  age?: number | null;
  parity?: string | null;
  bloodType?: string | null;
  lmp?: string | null; // DUM (ISO date)
  edd?: string | null; // DPP (ISO date)
  gaWeeks?: number | null;
  gaDays?: number | null;
  babyName?: string | null;
  status: PatientStatus;
  outcome: PatientOutcome;
  riskFactors: string[];
  useMethyldopa: boolean;
  methyldopaStartTime?: string | null;
  methyldopaEndTime?: string | null;
  useMagnesiumSulfate: boolean;
  magnesiumSulfateStartTime?: string | null;
  magnesiumSulfateEndTime?: string | null;
  schedule: ScheduledTask[];
  admissionDate: string;
  dischargeTime?: string | null;
  createdAt: string;
  updatedAt: string;
  // Loaded on demand
  observations?: Observation[];
  lastObservation?: Observation | null;
}

/** Input accepted when admitting/creating a patient. */
export interface NewPatientInput {
  module?: PatientModule;
  name: string;
  medicalRecordNumber?: string | null;
  bed?: string | null;
  age?: number | null;
  parity?: string | null;
  bloodType?: string | null;
  lmp?: string | null;
  edd?: string | null;
  gaWeeks?: number | null;
  gaDays?: number | null;
  status?: PatientStatus;
  riskFactors?: string[];
}

/** Campos editáveis de uma paciente (edição + protocolos). */
export interface UpdatePatientInput {
  name?: string;
  bed?: string | null;
  medicalRecordNumber?: string | null;
  age?: number | null;
  parity?: string | null;
  bloodType?: string | null;
  babyName?: string | null;
  lmp?: string | null;
  edd?: string | null;
  gaWeeks?: number | null;
  gaDays?: number | null;
  status?: PatientStatus;
  riskFactors?: string[];
  useMethyldopa?: boolean;
  methyldopaStartTime?: string | null;
  methyldopaEndTime?: string | null;
  useMagnesiumSulfate?: boolean;
  magnesiumSulfateStartTime?: string | null;
  magnesiumSulfateEndTime?: string | null;
}

export interface NewObservationInput {
  patientId: string;
  recordedAt?: string;
  vitals?: VitalSigns;
  obstetric?: ObstetricData;
  medication?: Medication;
  magnesiumData?: MagnesiumData;
  examinerName?: string | null;
  notes?: string | null;
}
