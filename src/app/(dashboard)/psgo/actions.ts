"use server";

import { revalidatePath } from "next/cache";
import {
  createPatient,
  updatePatient,
  transferPatient,
  RepositoryError,
} from "@/core/patients/repository";
import { psgoFormToNewPatient } from "@/core/psgo/patient-mapper";
import type { PsgoForm } from "@/core/psgo/types";
import type { PatientModule } from "@/core/patients/types";

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

/** Transfere a paciente do PSGO para outro módulo (grava em patient_transfers). */
export async function transferPsgoPatient(
  patientId: string,
  toModule: PatientModule,
  reason?: string,
): Promise<{ error?: string }> {
  if (!TRANSFER_TARGETS.includes(toModule)) {
    return { error: "Módulo de destino inválido." };
  }
  try {
    await transferPatient(patientId, toModule, reason?.trim() || undefined);
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
