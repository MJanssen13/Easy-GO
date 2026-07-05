"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createPatient,
  updatePatient,
  resolvePatient,
  reopenPatient,
  deletePatient,
  addObservation,
  updateSchedule,
  getSchedule,
  RepositoryError,
} from "@/core/patients/repository";
import { mergeSchedule, markCompleted, setTaskStatus } from "@/core/schedule/planner";
import { createCtg, deleteCtg as deleteCtgRow } from "@/core/ctg/repository";
import { computeCtgScore, suggestConclusion } from "@/core/ctg/scoring";
import type { NewCtgInput } from "@/core/ctg/types";
import type { ScheduledTask } from "@/core/patients/types";
import { datingFromGestationalAges } from "@/core/obstetric/gestational-age";
import type {
  NewPatientInput,
  UpdatePatientInput,
  NewObservationInput,
  PatientStatus,
  PatientOutcome,
  VitalSigns,
  ObstetricData,
  Medication,
  MagnesiumData,
} from "@/core/patients/types";

/** Fatores de risco separados por vírgula ou "+". */
function splitRiskFactors(s?: string): string[] {
  return s ? s.split(/[,+]/).map((x) => x.trim()).filter(Boolean) : [];
}

const admissionSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da paciente."),
  medicalRecordNumber: z.string().trim().optional(),
  bed: z.string().trim().optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  parity: z.string().trim().optional(),
  bloodType: z.string().trim().optional(),
  babyName: z.string().trim().optional(),
  babyName2: z.string().trim().optional(),
  fetalDeath: z.boolean().optional(),
  dumWeeks: z.coerce.number().int().min(0).max(45).optional(),
  dumDays: z.coerce.number().int().min(0).max(6).optional(),
  usWeeks: z.coerce.number().int().min(0).max(45).optional(),
  usDays: z.coerce.number().int().min(0).max(6).optional(),
  status: z
    .enum(["induction", "conduction", "active_labor", "scheduled_c_section"])
    .default("induction"),
  riskFactors: z.string().trim().optional(),
});

export type AdmissionState = { error?: string };

export async function admitPatient(
  _prev: AdmissionState,
  formData: FormData,
): Promise<AdmissionState> {
  const raw = {
    name: formData.get("name"),
    medicalRecordNumber: formData.get("medicalRecordNumber") || undefined,
    bed: formData.get("bed") || undefined,
    age: formData.get("age") || undefined,
    parity: formData.get("parity") || undefined,
    bloodType: formData.get("bloodType") || undefined,
    babyName: formData.get("babyName") || undefined,
    babyName2: formData.get("babyName2") || undefined,
    fetalDeath: formData.get("fetalDeath") === "on",
    dumWeeks: formData.get("dumWeeks") || undefined,
    dumDays: formData.get("dumDays") || undefined,
    usWeeks: formData.get("usWeeks") || undefined,
    usDays: formData.get("usDays") || undefined,
    status: formData.get("status") || "induction",
    riskFactors: formData.get("riskFactors") || undefined,
  };

  const parsed = admissionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const input: NewPatientInput = {
    module: "pre_parto",
    name: d.name,
    medicalRecordNumber: d.medicalRecordNumber ?? null,
    bed: d.bed ?? null,
    age: d.age ?? null,
    parity: d.parity ?? null,
    bloodType: d.bloodType ?? null,
    babyName: d.babyName ?? null,
    babyName2: d.babyName2 ?? null,
    fetalDeath: d.fetalDeath ?? false,
    status: d.status as PatientStatus,
    riskFactors: splitRiskFactors(d.riskFactors),
  };

  // Datação: IG por DUM e/ou USG (semanas + dias). Guarda um LMP-equivalente
  // para que a IG avance ao longo do tempo (ACOG CO-700 quando ambos presentes).
  const dating = datingFromGestationalAges({
    dumWeeks: d.dumWeeks,
    dumDays: d.dumDays,
    usWeeks: d.usWeeks,
    usDays: d.usDays,
  });
  if (dating) {
    input.lmp = dating.lmp;
    input.edd = dating.edd;
    input.gaWeeks = dating.gaWeeks;
    input.gaDays = dating.gaDays;
    input.usGaWeeks = dating.usGaWeeks;
    input.usGaDays = dating.usGaDays;
    input.datingMethod = dating.datingMethod;
  }

  try {
    await createPatient(input);
  } catch (err) {
    const message =
      err instanceof RepositoryError
        ? err.message
        : "Não foi possível admitir a paciente. Verifique a conexão.";
    return { error: message };
  }

  revalidatePath("/pre-parto");
  redirect("/pre-parto");
}

// ---------------------------------------------------------------------------
// Evolução / observação
// ---------------------------------------------------------------------------

/** Treat empty-string / null form values as undefined so z.coerce won't see "". */
function opt(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : s;
}

const num = z.coerce.number().optional();
const intNum = z.coerce.number().int().optional();

const observationSchema = z.object({
  patientId: z.string().min(1),
  taskId: z.string().optional(),
  recordedAt: z.string().optional(),
  examinerName: z.string().trim().optional(),
  // vitais
  paSystolic: intNum,
  paDiastolic: intNum,
  paStandingSystolic: intNum,
  paStandingDiastolic: intNum,
  fc: intNum,
  tax: num,
  spo2: intNum,
  dxt: intNum,
  // dinâmica / BCF
  bcf: intNum,
  dynamicsSummary: z.string().trim().optional(),
  // toque
  dilation: num,
  effacement: intNum,
  station: intNum,
  presentation: z.enum(["cephalic", "breech", "transverse"]).optional(),
  membranes: z.enum(["intact", "ruptured_clear", "ruptured_meconium"]).optional(),
  cervixPosition: z.enum(["posterior", "intermediate", "central"]).optional(),
  cervixConsistency: z.enum(["nasal", "nasolabial", "labial"]).optional(),
  cervixStatus: z.string().trim().optional(),
  bloodOnGlove: z.boolean().optional(),
  cervixObservation: z.string().trim().optional(),
  // MgSO₄
  magnesiumEnabled: z.boolean().optional(),
  mgReflex: z.enum(["present", "absent", "increased", "decreased"]).optional(),
  mgDiuresis: z.string().trim().optional(),
  mgRespiratoryRate: intNum,
  // medicação
  misoprostolDose: intNum,
  misoprostolCount: intNum,
  oxytocinDose: num,
  antibiotic: z.string().trim().optional(),
  medicationOther: z.string().trim().optional(),
  // conduta
  notes: z.string().trim().optional(),
});

export type ObservationState = { error?: string };

export async function recordObservation(
  _prev: ObservationState,
  formData: FormData,
): Promise<ObservationState> {
  const raw = {
    patientId: formData.get("patientId"),
    taskId: opt(formData.get("taskId")),
    recordedAt: opt(formData.get("recordedAt")),
    examinerName: opt(formData.get("examinerName")),
    paSystolic: opt(formData.get("paSystolic")),
    paDiastolic: opt(formData.get("paDiastolic")),
    paStandingSystolic: opt(formData.get("paStandingSystolic")),
    paStandingDiastolic: opt(formData.get("paStandingDiastolic")),
    fc: opt(formData.get("fc")),
    tax: opt(formData.get("tax")),
    spo2: opt(formData.get("spo2")),
    dxt: opt(formData.get("dxt")),
    bcf: opt(formData.get("bcf")),
    dynamicsSummary: opt(formData.get("dynamicsSummary")),
    dilation: opt(formData.get("dilation")),
    effacement: opt(formData.get("effacement")),
    station: opt(formData.get("station")),
    presentation: opt(formData.get("presentation")),
    membranes: opt(formData.get("membranes")),
    cervixPosition: opt(formData.get("cervixPosition")),
    cervixConsistency: opt(formData.get("cervixConsistency")),
    cervixStatus: opt(formData.get("cervixStatus")),
    bloodOnGlove: formData.get("bloodOnGlove") === "on",
    cervixObservation: opt(formData.get("cervixObservation")),
    magnesiumEnabled: formData.get("magnesiumEnabled") === "on",
    mgReflex: opt(formData.get("mgReflex")),
    mgDiuresis: opt(formData.get("mgDiuresis")),
    mgRespiratoryRate: opt(formData.get("mgRespiratoryRate")),
    misoprostolDose: opt(formData.get("misoprostolDose")),
    misoprostolCount: opt(formData.get("misoprostolCount")),
    oxytocinDose: opt(formData.get("oxytocinDose")),
    antibiotic: opt(formData.get("antibiotic")),
    medicationOther: opt(formData.get("medicationOther")),
    notes: opt(formData.get("notes")),
  };

  const parsed = observationSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const vitals: VitalSigns = {
    paSystolic: d.paSystolic,
    paDiastolic: d.paDiastolic,
    paStandingSystolic: d.paStandingSystolic,
    paStandingDiastolic: d.paStandingDiastolic,
    fc: d.fc,
    tax: d.tax,
    spo2: d.spo2,
    dxt: d.dxt,
  };

  const obstetric: ObstetricData = {
    bcf: d.bcf,
    dynamicsSummary: d.dynamicsSummary,
    dilation: d.dilation,
    effacement: d.effacement,
    station: d.station,
    presentation: d.presentation,
    membranes: d.membranes,
    cervixPosition: d.cervixPosition,
    cervixConsistency: d.cervixConsistency,
    cervixStatus: d.cervixStatus
      ? d.cervixStatus.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    bloodOnGlove: d.bloodOnGlove || undefined,
    cervixObservation: d.cervixObservation,
  };

  let medication: Medication | undefined;
  if (d.misoprostolDose != null || d.oxytocinDose != null || d.antibiotic || d.medicationOther) {
    medication = {
      misoprostolDose: d.misoprostolDose,
      misoprostolCount: d.misoprostolCount,
      oxytocinDose: d.oxytocinDose,
      antibiotic: d.antibiotic,
      other: d.medicationOther,
    };
  }

  let magnesiumData: MagnesiumData | undefined;
  if (d.magnesiumEnabled) {
    magnesiumData = {
      reflex: d.mgReflex ?? "present",
      diuresis: d.mgDiuresis ?? "",
      respiratoryRate: d.mgRespiratoryRate,
    };
  }

  const input: NewObservationInput = {
    patientId: d.patientId,
    recordedAt: d.recordedAt ? new Date(d.recordedAt).toISOString() : undefined,
    vitals,
    obstetric,
    medication,
    magnesiumData,
    examinerName: d.examinerName ?? null,
    notes: d.notes ?? null,
  };

  try {
    await addObservation(input);
  } catch (err) {
    const message =
      err instanceof RepositoryError
        ? err.message
        : "Não foi possível registrar a evolução. Verifique a conexão.";
    return { error: message };
  }

  // Best-effort: if this evolution fulfils a scheduled task, mark it done.
  if (d.taskId) {
    try {
      const schedule = await getSchedule(d.patientId);
      await updateSchedule(d.patientId, markCompleted(schedule, d.taskId));
    } catch {
      // schedule update is non-critical; the observation is already saved
    }
  }

  revalidatePath(`/pre-parto/${d.patientId}`);
  revalidatePath("/pre-parto/cronograma");
  redirect(`/pre-parto/${d.patientId}`);
}

// ---------------------------------------------------------------------------
// Rotina de aferições (planejamento)
// ---------------------------------------------------------------------------

const incomingTaskSchema = z.object({
  timestamp: z.string().min(1),
  focus: z.array(z.string()).default([]),
});

const routineSchema = z.object({
  patientId: z.string().min(1),
  replaceFuture: z.boolean().optional(),
  tasks: z.array(incomingTaskSchema),
});

export type RoutineState = { error?: string };

export async function saveRoutine(
  _prev: RoutineState,
  formData: FormData,
): Promise<RoutineState> {
  let tasksParsed: unknown = [];
  try {
    tasksParsed = JSON.parse(String(formData.get("tasks") ?? "[]"));
  } catch {
    return { error: "Cronograma inválido." };
  }

  const parsed = routineSchema.safeParse({
    patientId: formData.get("patientId"),
    replaceFuture: formData.get("replaceFuture") === "on",
    tasks: tasksParsed,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { patientId, replaceFuture, tasks } = parsed.data;

  if (tasks.length === 0) {
    return { error: "Selecione ao menos um horário e parâmetro." };
  }

  const incoming: ScheduledTask[] = tasks.map((t) => ({
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${t.timestamp}-${Math.random().toString(16).slice(2)}`,
    timestamp: new Date(t.timestamp).toISOString(),
    focus: t.focus,
    status: "pending" as const,
  }));

  try {
    const existing = await getSchedule(patientId);
    await updateSchedule(patientId, mergeSchedule(existing, incoming, replaceFuture ?? false));
  } catch (err) {
    const message =
      err instanceof RepositoryError ? err.message : "Não foi possível salvar a rotina.";
    return { error: message };
  }

  revalidatePath(`/pre-parto/${patientId}`);
  revalidatePath("/pre-parto/cronograma");
  redirect(`/pre-parto/${patientId}`);
}

// ---------------------------------------------------------------------------
// Cardiotocografia (CTG)
// ---------------------------------------------------------------------------

const ctgSchema = z.object({
  patientId: z.string().min(1),
  recordedAt: z.string().optional(),
  baseline: intNum,
  variability: z.enum(["absent", "lt5", "6-25", "gt25", "sinusoidal"]).optional(),
  accelerations: z.enum(["present", "absent"]).optional(),
  atMfRatio: z.enum(["lt60", "gte60"]).optional(),
  movements: z.enum(["present", "absent"]).optional(),
  decelerations: z.enum(["present", "absent"]).optional(),
  decelerationType: z.enum(["early", "late", "variable"]).optional(),
  decelerationCount: z.string().trim().optional(),
  contractions: z.enum(["present", "absent"]).optional(),
  soundStimulus: z.enum(["done", "not_done"]).optional(),
  stimulusCount: z.string().trim().optional(),
  conclusion: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export type CtgState = { error?: string };

export async function saveCtg(_prev: CtgState, formData: FormData): Promise<CtgState> {
  const raw = {
    patientId: formData.get("patientId"),
    recordedAt: opt(formData.get("recordedAt")),
    baseline: opt(formData.get("baseline")),
    variability: opt(formData.get("variability")),
    accelerations: opt(formData.get("accelerations")),
    atMfRatio: opt(formData.get("atMfRatio")),
    movements: opt(formData.get("movements")),
    decelerations: opt(formData.get("decelerations")),
    decelerationType: opt(formData.get("decelerationType")),
    decelerationCount: opt(formData.get("decelerationCount")),
    contractions: opt(formData.get("contractions")),
    soundStimulus: opt(formData.get("soundStimulus")),
    stimulusCount: opt(formData.get("stimulusCount")),
    conclusion: opt(formData.get("conclusion")),
    notes: opt(formData.get("notes")),
  };

  const parsed = ctgSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const score = computeCtgScore({
    baseline: d.baseline,
    variability: d.variability,
    atMfRatio: d.atMfRatio,
    decelerations: d.decelerations,
  });

  const input: NewCtgInput = {
    patientId: d.patientId,
    recordedAt: d.recordedAt ? new Date(d.recordedAt).toISOString() : undefined,
    baseline: d.baseline,
    variability: d.variability,
    accelerations: d.accelerations,
    atMfRatio: d.atMfRatio,
    movements: d.movements,
    decelerations: d.decelerations,
    decelerationType: d.decelerationType,
    decelerationCount: d.decelerationCount,
    contractions: d.contractions,
    soundStimulus: d.soundStimulus,
    stimulusCount: d.stimulusCount,
    score,
    conclusion: d.conclusion && d.conclusion !== "" ? d.conclusion : suggestConclusion(score),
    notes: d.notes ?? null,
  };

  try {
    await createCtg(input);
  } catch (err) {
    const message =
      err instanceof RepositoryError ? err.message : "Não foi possível salvar a CTG.";
    return { error: message };
  }

  revalidatePath(`/pre-parto/${d.patientId}`);
  redirect(`/pre-parto/${d.patientId}`);
}

export async function removeCtg(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const patientId = String(formData.get("patientId") ?? "");
  if (!id) return;
  try {
    await deleteCtgRow(id);
  } catch {
    // best-effort
  }
  if (patientId) revalidatePath(`/pre-parto/${patientId}`);
}

/** Quick status change for a task (concluir/cancelar) from the cronograma. */
export async function updateTaskStatus(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "");
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!patientId || !taskId) return;
  if (status !== "completed" && status !== "cancelled" && status !== "pending") return;

  try {
    const schedule = await getSchedule(patientId);
    await updateSchedule(patientId, setTaskStatus(schedule, taskId, status));
  } catch {
    // best-effort
  }
  revalidatePath("/pre-parto/cronograma");
  revalidatePath(`/pre-parto/${patientId}`);
}

// ---------------------------------------------------------------------------
// Edição da paciente + protocolos
// ---------------------------------------------------------------------------

const editSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1, "Informe o nome da paciente."),
  bed: z.string().trim().optional(),
  medicalRecordNumber: z.string().trim().optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  parity: z.string().trim().optional(),
  bloodType: z.string().trim().optional(),
  babyName: z.string().trim().optional(),
  babyName2: z.string().trim().optional(),
  fetalDeath: z.boolean().optional(),
  dumWeeks: z.coerce.number().int().min(0).max(45).optional(),
  dumDays: z.coerce.number().int().min(0).max(6).optional(),
  usWeeks: z.coerce.number().int().min(0).max(45).optional(),
  usDays: z.coerce.number().int().min(0).max(6).optional(),
  status: z
    .enum([
      "admission",
      "active_labor",
      "induction",
      "conduction",
      "scheduled_c_section",
      "expectant",
      "observation",
      "inpatient",
      "partogram_open",
      "postpartum",
    ])
    .optional(),
  riskFactors: z.string().trim().optional(),
  useMethyldopa: z.boolean().optional(),
  methyldopaStartTime: z.string().trim().optional(),
  methyldopaEndTime: z.string().trim().optional(),
  useMagnesiumSulfate: z.boolean().optional(),
  magnesiumSulfateStartTime: z.string().trim().optional(),
  magnesiumSulfateEndTime: z.string().trim().optional(),
});

export type EditPatientState = { error?: string };

export async function editPatient(
  _prev: EditPatientState,
  formData: FormData,
): Promise<EditPatientState> {
  const raw = {
    id: formData.get("id"),
    name: formData.get("name"),
    bed: opt(formData.get("bed")),
    medicalRecordNumber: opt(formData.get("medicalRecordNumber")),
    age: opt(formData.get("age")),
    parity: opt(formData.get("parity")),
    bloodType: opt(formData.get("bloodType")),
    babyName: opt(formData.get("babyName")),
    babyName2: opt(formData.get("babyName2")),
    fetalDeath: formData.get("fetalDeath") === "on",
    dumWeeks: opt(formData.get("dumWeeks")),
    dumDays: opt(formData.get("dumDays")),
    usWeeks: opt(formData.get("usWeeks")),
    usDays: opt(formData.get("usDays")),
    status: opt(formData.get("status")),
    riskFactors: opt(formData.get("riskFactors")),
    useMethyldopa: formData.get("useMethyldopa") === "on",
    methyldopaStartTime: opt(formData.get("methyldopaStartTime")),
    methyldopaEndTime: opt(formData.get("methyldopaEndTime")),
    useMagnesiumSulfate: formData.get("useMagnesiumSulfate") === "on",
    magnesiumSulfateStartTime: opt(formData.get("magnesiumSulfateStartTime")),
    magnesiumSulfateEndTime: opt(formData.get("magnesiumSulfateEndTime")),
  };

  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;

  const input: UpdatePatientInput = {
    name: d.name,
    bed: d.bed ?? null,
    medicalRecordNumber: d.medicalRecordNumber ?? null,
    age: d.age ?? null,
    parity: d.parity ?? null,
    bloodType: d.bloodType ?? null,
    babyName: d.babyName ?? null,
    babyName2: d.babyName2 ?? null,
    fetalDeath: d.fetalDeath ?? false,
    status: d.status as PatientStatus | undefined,
    riskFactors: splitRiskFactors(d.riskFactors),
    useMethyldopa: d.useMethyldopa ?? false,
    methyldopaStartTime: d.methyldopaStartTime ?? null,
    methyldopaEndTime: d.methyldopaEndTime ?? null,
    useMagnesiumSulfate: d.useMagnesiumSulfate ?? false,
    magnesiumSulfateStartTime: d.magnesiumSulfateStartTime ?? null,
    magnesiumSulfateEndTime: d.magnesiumSulfateEndTime ?? null,
  };

  // Datação: IG por DUM e/ou USG (semanas + dias). Sem IG → limpa a datação.
  const dating = datingFromGestationalAges({
    dumWeeks: d.dumWeeks,
    dumDays: d.dumDays,
    usWeeks: d.usWeeks,
    usDays: d.usDays,
  });
  if (dating) {
    input.lmp = dating.lmp;
    input.edd = dating.edd;
    input.gaWeeks = dating.gaWeeks;
    input.gaDays = dating.gaDays;
    input.usGaWeeks = dating.usGaWeeks;
    input.usGaDays = dating.usGaDays;
    input.datingMethod = dating.datingMethod;
  } else {
    input.lmp = null;
    input.edd = null;
    input.gaWeeks = null;
    input.gaDays = null;
    input.usGaWeeks = null;
    input.usGaDays = null;
    input.datingMethod = null;
  }

  try {
    await updatePatient(d.id, input);
  } catch (err) {
    const message =
      err instanceof RepositoryError ? err.message : "Não foi possível atualizar a paciente.";
    return { error: message };
  }

  revalidatePath(`/pre-parto/${d.id}`);
  revalidatePath("/pre-parto");
  redirect(`/pre-parto/${d.id}`);
}

// ---------------------------------------------------------------------------
// Desfecho / reabertura
// ---------------------------------------------------------------------------

const RESOLVE_OUTCOMES = ["vaginal_delivery", "c_section", "discharge", "transfer"] as const;

export async function resolvePatientAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const outcome = String(formData.get("outcome") ?? "");
  const dischargeRaw = opt(formData.get("dischargeTime"));
  if (!id || !RESOLVE_OUTCOMES.includes(outcome as (typeof RESOLVE_OUTCOMES)[number])) return;

  const iso = dischargeRaw ? new Date(dischargeRaw).toISOString() : undefined;
  try {
    await resolvePatient(id, outcome as PatientOutcome, iso);
  } catch {
    // best-effort; surfaced on reload
  }
  revalidatePath("/pre-parto");
  revalidatePath(`/pre-parto/${id}`);
  redirect(`/pre-parto/${id}`);
}

export async function reopenPatientAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await reopenPatient(id);
  } catch {
    // best-effort
  }
  revalidatePath("/pre-parto");
  revalidatePath(`/pre-parto/${id}`);
  redirect(`/pre-parto/${id}`);
}

export async function removePatient(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await deletePatient(id);
  } catch {
    // surfaced on next load; deletion is best-effort from the detail page
  }
  revalidatePath("/pre-parto");
  redirect("/pre-parto");
}
