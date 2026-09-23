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
import type { VitalSigns } from "@/core/patients/types";
import {
  readOnco,
  type OncoEvolutionForm,
  type OncoHistory,
  type OncoSummary,
} from "@/core/oncogineco/types";
import { draftOncoContext } from "@/core/oncogineco/render";

export interface ActionResult {
  error?: string;
  id?: string;
}

export interface Basics {
  name: string;
  medicalRecordNumber: string;
  bed: string;
  age: string;
  parity: string;
  bloodType: string;
}

function message(err: unknown, fallback: string): string {
  return err instanceof RepositoryError ? err.message : fallback;
}

function revalidate(id?: string) {
  revalidatePath("/oncogineco");
  revalidatePath("/");
  if (id) revalidatePath(`/oncogineco/${id}`);
}

function toAge(v: string): number | null {
  const n = v.trim() ? Number(v) : NaN;
  return Number.isNaN(n) ? null : n;
}

function num(v: string): number | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? undefined : n;
}

export async function admitOnco(basics: Basics, history: OncoHistory): Promise<ActionResult> {
  if (!basics.name.trim()) return { error: "Informe o nome da paciente." };
  const summary: OncoSummary = {
    history: { ...history, context: history.context.trim() || draftOncoContext(history) },
    evolutions: [],
  };
  let id: string;
  try {
    const created = await createPatient({
      module: "oncogineco",
      name: basics.name.trim().toUpperCase(),
      medicalRecordNumber: basics.medicalRecordNumber.trim() || null,
      bed: basics.bed.trim() || null,
      age: toAge(basics.age),
      parity: basics.parity.trim() || null,
      bloodType: basics.bloodType.trim() || null,
      status: "inpatient",
      clinicalSummary: { onco: summary },
    });
    id = created.id;
  } catch (err) {
    return { error: message(err, "Não foi possível admitir a paciente. Verifique a conexão.") };
  }
  revalidate(id);
  return { id };
}

/**
 * Salva a tela de trabalho: dados comuns (colunas de `patients`) e antecedentes
 * (`clinical_summary.onco`). Com `evolve`, grava a evolução no histórico, o
 * formulário como base do dia seguinte e os vitais como `observation`.
 */
export async function saveOncoWorkspace(
  patientId: string,
  data: {
    basics: Basics;
    history: OncoHistory;
    form: OncoEvolutionForm;
    text: string;
    author: string;
    evolve: boolean;
  },
): Promise<ActionResult> {
  const at = new Date().toISOString();
  try {
    const patient = await getPatient(patientId);
    if (!patient) return { error: "Paciente não encontrada." };
    const current = readOnco(patient.clinicalSummary);
    const next: OncoSummary = {
      ...current,
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
      age: toAge(data.basics.age),
      parity: data.basics.parity.trim() || null,
      bloodType: data.basics.bloodType.trim() || null,
      clinicalSummary: { ...(patient.clinicalSummary ?? {}), onco: next },
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
          notes: "EVOLUÇÃO ONCOGINECOLOGIA",
        });
      }
    }
  } catch (err) {
    return { error: message(err, "Não foi possível salvar.") };
  }
  revalidate(patientId);
  return { id: patientId };
}

export async function removeOncoEvolution(formData: FormData): Promise<void> {
  const id = String(formData.get("patientId") ?? "");
  const evoId = String(formData.get("evolutionId") ?? "");
  if (!id || !evoId) return;
  try {
    const patient = await getPatient(id);
    if (patient) {
      const s = readOnco(patient.clinicalSummary);
      await updatePatient(id, {
        clinicalSummary: {
          ...(patient.clinicalSummary ?? {}),
          onco: { ...s, evolutions: s.evolutions.filter((e) => e.id !== evoId) },
        },
      });
    }
  } catch {
    // best-effort
  }
  revalidate(id);
}

export async function dischargeOnco(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("dischargeTime") ?? "");
  if (!id) return;
  try {
    await updatePatient(id, {
      status: "resolved",
      outcome: "discharge",
      dischargeTime: raw ? new Date(raw).toISOString() : new Date().toISOString(),
    });
  } catch {
    // best-effort
  }
  revalidate(id);
  redirect(`/oncogineco/${id}`);
}

export async function reopenOnco(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await updatePatient(id, { status: "inpatient", outcome: "none", dischargeTime: null });
  } catch {
    // best-effort
  }
  revalidate(id);
  redirect(`/oncogineco/${id}`);
}

export async function removeOnco(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  try {
    await deletePatient(id);
  } catch {
    // best-effort
  }
  revalidate();
  redirect("/oncogineco");
}

/** Onco → PSGO (ex.: intercorrência que volta a ser conduzida pelo PS). */
export async function transferOncoToPsgo(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();
  if (!id) return;
  try {
    await transferPatient(id, "psgo", reason || "Transferida da Onco-Ginecologia");
  } catch {
    // best-effort
  }
  revalidate();
  revalidatePath("/psgo");
  redirect("/psgo");
}
