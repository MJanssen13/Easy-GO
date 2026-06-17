"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createPatient, deletePatient, RepositoryError } from "@/core/patients/repository";
import { eddFromLMP, gaFromLMP } from "@/core/obstetric/gestational-age";
import type { NewPatientInput, PatientStatus } from "@/core/patients/types";

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
