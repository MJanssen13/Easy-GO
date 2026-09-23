"use server";

import { revalidatePath } from "next/cache";
import {
  createPatient,
  updatePatient,
  transferPatient,
  resolvePatient,
  reopenPatient,
  deletePatient,
  getPatient,
  updateSchedule,
  RepositoryError,
} from "@/core/patients/repository";
import { psgoFormToNewPatient } from "@/core/psgo/patient-mapper";
import type { PsgoForm } from "@/core/psgo/types";
import type { PatientModule } from "@/core/patients/types";
import { initialRoutineTasks } from "@/core/schedule/initial-routine";

export type PsgoAdmissionState = { error?: string; patientId?: string };

/**
 * Persiste a admissão do PSGO como paciente (module="psgo"). Se `patientId`
 * for informado, atualiza a admissão existente em vez de criar uma nova.
 */
export async function savePsgoAdmission(
  form: PsgoForm,
  patientId?: string,
): Promise<PsgoAdmissionState> {
  if (!form.name?.trim()) {
    return { error: "Informe o nome da paciente para salvar a admissão." };
  }

  try {
    const input = psgoFormToNewPatient(form);
    if (patientId) {
      await updatePatient(patientId, {
        name: input.name,
        medicalRecordNumber: input.medicalRecordNumber,
        age: input.age,
        parity: input.parity,
        bloodType: input.bloodType,
        lmp: input.lmp,
        edd: input.edd,
        gaWeeks: input.gaWeeks,
        gaDays: input.gaDays,
        riskFactors: input.riskFactors,
        clinicalSummary: input.clinicalSummary,
      });
      revalidatePath("/psgo");
      revalidatePath(`/psgo/${patientId}`);
      return { patientId };
    }

    const patient = await createPatient(input);
    revalidatePath("/psgo");
    return { patientId: patient.id };
  } catch (err) {
    const message =
      err instanceof RepositoryError
        ? err.message
        : "Não foi possível salvar a admissão. Verifique a conexão.";
    return { error: message };
  }
}

const TRANSFER_TARGETS: PatientModule[] = ["pre_parto", "puerperio", "oncogineco"];

export interface PrePartoArrival {
  bed?: string;
  status?: "induction" | "conduction" | "active_labor" | "scheduled_c_section";
}

/**
 * Transfere a paciente do PSGO para outro módulo (grava em patient_transfers).
 * Para o Pré-Parto, já chega com leito, situação e rotina de aferições do turno
 * — como na admissão direta.
 */
export async function transferPsgoPatient(
  patientId: string,
  toModule: PatientModule,
  reason?: string,
  arrival?: PrePartoArrival,
): Promise<{ error?: string }> {
  if (!TRANSFER_TARGETS.includes(toModule)) {
    return { error: "Módulo de destino inválido." };
  }
  try {
    await transferPatient(patientId, toModule, reason?.trim() || undefined);
    if (toModule === "pre_parto") {
      const status = arrival?.status ?? "induction";
      await updatePatient(patientId, { bed: arrival?.bed?.trim() || null, status });
      try {
        const patient = await getPatient(patientId);
        const tasks = initialRoutineTasks(status, patient?.riskFactors ?? []);
        if (tasks.length > 0) await updateSchedule(patientId, tasks);
      } catch {
        // best-effort: a rotina pode ser ajustada depois em "Editar rotina"
      }
      revalidatePath("/pre-parto");
    }
    revalidatePath("/psgo");
    revalidatePath(`/psgo/${patientId}`);
    return {};
  } catch (err) {
    const message =
      err instanceof RepositoryError
        ? err.message
        : "Não foi possível transferir a paciente. Verifique a conexão.";
    return { error: message };
  }
}

/**
 * Alta da paciente do PSGO: marca desfecho "alta" e hora. O prontuário fica
 * salvo por 24h antes da exclusão automática (ver `purgeExpiredDischarges`).
 */
export async function dischargePsgoPatient(patientId: string): Promise<{ error?: string }> {
  try {
    await resolvePatient(patientId, "discharge");
    revalidatePath("/psgo");
    revalidatePath(`/psgo/${patientId}`);
    return {};
  } catch (err) {
    const message =
      err instanceof RepositoryError
        ? err.message
        : "Não foi possível dar alta à paciente. Verifique a conexão.";
    return { error: message };
  }
}

/** Desfaz a alta (reabre a admissão), enquanto o prontuário não foi excluído. */
export async function reopenPsgoPatient(patientId: string): Promise<{ error?: string }> {
  try {
    await reopenPatient(patientId);
    revalidatePath("/psgo");
    revalidatePath(`/psgo/${patientId}`);
    return {};
  } catch (err) {
    const message =
      err instanceof RepositoryError
        ? err.message
        : "Não foi possível reabrir a admissão. Verifique a conexão.";
    return { error: message };
  }
}

/** Exclui definitivamente a admissão (paciente + prontuário) do PSGO. */
export async function deletePsgoAdmission(patientId: string): Promise<{ error?: string }> {
  try {
    await deletePatient(patientId);
    revalidatePath("/psgo");
    return {};
  } catch (err) {
    const message =
      err instanceof RepositoryError
        ? err.message
        : "Não foi possível excluir a admissão. Verifique a conexão.";
    return { error: message };
  }
}
