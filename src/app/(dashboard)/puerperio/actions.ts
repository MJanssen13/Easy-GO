"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addObservation,
  createPatient,
  deletePatient,
  getPatient,
  transferPatient,
  updatePatient,
  RepositoryError,
} from "@/core/patients/repository";
import type { PatientOutcome, VitalSigns } from "@/core/patients/types";
import {
  readPuerperio,
  type DeliveryInfo,
  type PuerperalEvolutionForm,
  type PuerperioSummary,
  type WardHistory,
} from "@/core/puerperio/types";
import { historyFromPsgo } from "@/core/puerperio/history";
import { draftContext } from "@/core/puerperio/render";
import { gaFromLMP } from "@/core/obstetric/gestational-age";

export interface ActionResult {
  error?: string;
  id?: string;
}

function message(err: unknown, fallback: string): string {
  return err instanceof RepositoryError ? err.message : fallback;
}

function outcomeFor(delivery: DeliveryInfo): PatientOutcome {
  return delivery.type === "cesarea" ? "c_section" : "vaginal_delivery";
}

function revalidate(id?: string) {
  revalidatePath("/puerperio");
  revalidatePath("/");
  if (id) revalidatePath(`/puerperio/${id}`);
}

/** Lê o resumo atual e grava `clinical_summary.puerperio` mesclado (preserva PSGO etc.). */
async function patchSummary(
  id: string,
  patch: (current: PuerperioSummary) => PuerperioSummary,
): Promise<void> {
  const patient = await getPatient(id);
  if (!patient) throw new RepositoryError("Paciente não encontrada.");
  const current = readPuerperio(patient.clinicalSummary);
  await updatePatient(id, {
    clinicalSummary: { ...(patient.clinicalSummary ?? {}), puerperio: patch(current) },
  });
}

export interface AdmitInput {
  name: string;
  medicalRecordNumber: string;
  bed: string;
  age: string;
  parity: string;
  bloodType: string;
  riskFactors: string[];
  delivery: DeliveryInfo;
  history: WardHistory;
}

/** Admissão direta no puerpério (paciente que não passou pelo pré-parto do sistema). */
export async function admitPuerperio(input: AdmitInput): Promise<ActionResult> {
  if (!input.name.trim()) return { error: "Informe o nome da paciente." };
  const age = input.age.trim() ? Number(input.age) : null;
  const summary: PuerperioSummary = {
    delivery: input.delivery,
    history: { ...input.history, context: input.history.context.trim() || draftContext(input.delivery) },
    evolutions: [],
  };
  let id: string;
  try {
    const created = await createPatient({
      module: "puerperio",
      name: input.name.trim().toUpperCase(),
      medicalRecordNumber: input.medicalRecordNumber.trim() || null,
      bed: input.bed.trim() || null,
      age: age != null && !Number.isNaN(age) ? age : null,
      parity: input.parity.trim() || null,
      bloodType: input.bloodType.trim() || null,
      status: "postpartum",
      riskFactors: input.riskFactors,
      clinicalSummary: { puerperio: summary },
    });
    id = created.id;
    await updatePatient(id, { outcome: outcomeFor(input.delivery) });
  } catch (err) {
    return { error: message(err, "Não foi possível admitir a paciente. Verifique a conexão.") };
  }
  revalidate(id);
  return { id };
}

/**
 * Pré-Parto → Puerpério após o parto: grava o desfecho (via de parto), limpa
 * aferições pendentes, guarda os dados do parto/RN e troca o módulo
 * (registrado em `patient_transfers`). Os dados comuns viajam com a paciente.
 */
export async function transferToPuerperio(
  patientId: string,
  delivery: DeliveryInfo,
  bed?: string,
): Promise<ActionResult> {
  try {
    const patient = await getPatient(patientId);
    if (!patient) return { error: "Paciente não encontrada." };
    const current = readPuerperio(patient.clinicalSummary);
    // Antecedentes: os já existentes, senão importados da admissão do PSGO.
    const imported = historyFromPsgo(patient.clinicalSummary);
    const history: WardHistory = { ...imported };
    for (const [k, v] of Object.entries(current.history) as [keyof WardHistory, string][]) {
      if (v.trim()) history[k] = v;
    }
    if (!delivery.ga.trim() && patient.lmp) {
      const ga = gaFromLMP(new Date(`${patient.lmp}T00:00:00`), new Date(delivery.at));
      delivery = { ...delivery, ga: `${ga.weeks} SEMANAS E ${ga.days} DIAS` };
    }
    if (!history.context.trim()) history.context = draftContext(delivery);
    const summary: PuerperioSummary = { ...current, delivery, history };
    await updatePatient(patientId, {
      status: "postpartum",
      outcome: outcomeFor(delivery),
      bed: bed?.trim() ? bed.trim() : patient.bed,
      schedule: (patient.schedule ?? []).filter((t) => t.status !== "pending"),
      clinicalSummary: { ...(patient.clinicalSummary ?? {}), puerperio: summary },
    });
    await transferPatient(patientId, "puerperio", "Parto — transferida ao puerpério");
  } catch (err) {
    return { error: message(err, "Não foi possível transferir a paciente.") };
  }
  revalidatePath("/pre-parto");
  revalidatePath(`/pre-parto/${patientId}`);
  revalidate(patientId);
  return { id: patientId };
}

function num(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? undefined : n;
}

export interface Basics {
  name: string;
  medicalRecordNumber: string;
  bed: string;
  age: string;
  parity: string;
  bloodType: string;
}

/**
 * Salva a tela de trabalho da paciente: dados comuns (colunas de `patients`),
 * parto/RN e antecedentes (`clinical_summary.puerperio`). Com `evolve`, grava
 * também a evolução do dia no histórico, o formulário como base para o dia
 * seguinte e os sinais vitais como `observation` compartilhada.
 */
export async function saveWorkspace(
  patientId: string,
  data: {
    basics: Basics;
    delivery: DeliveryInfo;
    history: WardHistory;
    form: PuerperalEvolutionForm;
    text: string;
    author: string;
    evolve: boolean;
  },
): Promise<ActionResult> {
  const at = new Date().toISOString();
  const age = data.basics.age.trim() ? Number(data.basics.age) : null;
  try {
    const patient = await getPatient(patientId);
    if (!patient) return { error: "Paciente não encontrada." };
    const current = readPuerperio(patient.clinicalSummary);
    const next: PuerperioSummary = {
      ...current,
      delivery: data.delivery,
      history: data.history,
      lastForm: data.evolve ? data.form : current.lastForm,
      evolutions: data.evolve
        ? [
            { id: crypto.randomUUID(), at, author: data.author.trim() || undefined, text: data.text },
            ...current.evolutions,
          ].slice(0, 60)
        : current.evolutions,
    };
    await updatePatient(patientId, {
      name: data.basics.name.trim().toUpperCase() || patient.name,
      medicalRecordNumber: data.basics.medicalRecordNumber.trim() || null,
      bed: data.basics.bed.trim() || null,
      age: age != null && !Number.isNaN(age) ? age : null,
      parity: data.basics.parity.trim() || null,
      bloodType: data.basics.bloodType.trim() || null,
      outcome: outcomeFor(data.delivery),
      clinicalSummary: { ...(patient.clinicalSummary ?? {}), puerperio: next },
    });
    if (data.evolve) {
      const vitals: VitalSigns = {
        paSystolic: num(data.form.vitals.paSystolic),
        paDiastolic: num(data.form.vitals.paDiastolic),
        fc: num(data.form.vitals.fc),
        tax: num(data.form.vitals.tax),
        spo2: num(data.form.vitals.spo2),
      };
      if (Object.values(vitals).some((v) => v != null)) {
        await addObservation({
          patientId,
          recordedAt: at,
          vitals,
          obstetric: {},
          examinerName: data.author.trim() || null,
          notes: "EVOLUÇÃO PUERPÉRIO",
        });
      }
    }
  } catch (err) {
    return { error: message(err, "Não foi possível salvar.") };
  }
  revalidate(patientId);
  return { id: patientId };
}

export async function removeEvolution(formData: FormData): Promise<void> {
  const id = String(formData.get("patientId") ?? "");
  const evoId = String(formData.get("evolutionId") ?? "");
  if (!id || !evoId) return;
  try {
    await patchSummary(id, (s) => ({ ...s, evolutions: s.evolutions.filter((e) => e.id !== evoId) }));
  } catch {
    // best-effort
  }
  revalidate(id);
}

export async function dischargePuerperio(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("dischargeTime") ?? "");
  if (!id) return;
  try {
    await updatePatient(id, {
      status: "resolved",
      dischargeTime: raw ? new Date(raw).toISOString() : new Date().toISOString(),
    });
  } catch {
    // best-effort
  }
  revalidate(id);
  redirect(`/puerperio/${id}`);
}

export async function reopenPuerperio(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await updatePatient(id, { status: "postpartum", dischargeTime: null });
  } catch {
    // best-effort
  }
  revalidate(id);
  redirect(`/puerperio/${id}`);
}

export async function removePuerperio(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await deletePatient(id);
  } catch {
    // best-effort
  }
  revalidate();
  redirect("/puerperio");
}
