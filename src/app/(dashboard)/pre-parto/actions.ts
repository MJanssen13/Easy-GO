"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createPatient,
  deletePatient,
  addObservation,
  updateSchedule,
  getSchedule,
  RepositoryError,
} from "@/core/patients/repository";
import { mergeSchedule, markCompleted, setTaskStatus } from "@/core/schedule/planner";
import type { ScheduledTask } from "@/core/patients/types";
import { eddFromLMP, gaFromLMP } from "@/core/obstetric/gestational-age";
import type {
  NewPatientInput,
  NewObservationInput,
  PatientStatus,
  VitalSigns,
  ObstetricData,
  Medication,
  MagnesiumData,
} from "@/core/patients/types";

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const admissionSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome da paciente."),
  medicalRecordNumber: z.string().trim().optional(),
  bed: z.string().trim().optional(),
  age: z.coerce.number().int().min(0).max(120).optional(),
  parity: z.string().trim().optional(),
  bloodType: z.string().trim().optional(),
  lmp: z.string().trim().optional(),
  gaWeeks: z.coerce.number().int().min(0).max(45).optional(),
  gaDays: z.coerce.number().int().min(0).max(6).optional(),
  status: z.enum(["admission", "induction", "active_labor"]).default("admission"),
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
    lmp: formData.get("lmp") || undefined,
    gaWeeks: formData.get("gaWeeks") || undefined,
    gaDays: formData.get("gaDays") || undefined,
    status: formData.get("status") || "admission",
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
    status: d.status as PatientStatus,
    riskFactors: d.riskFactors
      ? d.riskFactors.split(",").map((s) => s.trim()).filter(Boolean)
      : [],
  };

  // Dating: prefer DUM (auto-computes DPP + IG snapshot); else manual IG.
  if (d.lmp) {
    const lmpDate = new Date(`${d.lmp}T00:00:00`);
    if (!Number.isNaN(lmpDate.getTime())) {
      const ga = gaFromLMP(lmpDate);
      input.lmp = d.lmp;
      input.edd = toISODate(eddFromLMP(lmpDate));
      input.gaWeeks = ga.weeks;
      input.gaDays = ga.days;
    }
  } else if (d.gaWeeks != null) {
    input.gaWeeks = d.gaWeeks;
    input.gaDays = d.gaDays ?? 0;
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
  cervixConsistency: z.enum(["firm", "intermediate", "soft"]).optional(),
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
    bloodOnGlove: d.bloodOnGlove || undefined,
    cervixObservation: d.cervixObservation,
  };

  let medication: Medication | undefined;
  if (d.misoprostolDose != null || d.oxytocinDose != null || d.antibiotic) {
    medication = {
      misoprostolDose: d.misoprostolDose,
      misoprostolCount: d.misoprostolCount,
      oxytocinDose: d.oxytocinDose,
      antibiotic: d.antibiotic,
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
