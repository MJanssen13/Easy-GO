import type { PatientStatus, PatientOutcome } from "@/types/database";

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  admission: "Admissão",
  active_labor: "Trabalho de parto ativo",
  induction: "Indução",
  expectant: "Conduta expectante",
  postpartum: "Puerpério imediato",
  observation: "Observação",
  inpatient: "Internada",
  partogram_open: "Partograma aberto",
  resolved: "Resolvida",
};

export type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

export const PATIENT_STATUS_BADGE: Record<PatientStatus, BadgeVariant> = {
  admission: "secondary",
  active_labor: "warning",
  induction: "warning",
  expectant: "secondary",
  postpartum: "success",
  observation: "secondary",
  inpatient: "default",
  partogram_open: "warning",
  resolved: "outline",
};

export const PATIENT_OUTCOME_LABELS: Record<PatientOutcome, string> = {
  vaginal_delivery: "Parto normal",
  c_section: "Cesárea",
  discharge: "Alta",
  transfer: "Transferência",
  none: "—",
};

/** Statuses considered resolved (out of the active board). */
export const RESOLVED_STATUSES: PatientStatus[] = ["resolved"];

/** Initial statuses offered at admission. */
export const ADMISSION_STATUS_OPTIONS: PatientStatus[] = ["admission", "induction", "active_labor"];

/** Statuses selectable when editing a patient (all active/non-resolved). */
export const EDITABLE_STATUS_OPTIONS: PatientStatus[] = [
  "admission",
  "active_labor",
  "induction",
  "expectant",
  "observation",
  "inpatient",
  "partogram_open",
  "postpartum",
];
