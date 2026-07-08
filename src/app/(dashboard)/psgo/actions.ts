"use server";

import { revalidatePath } from "next/cache";
import { createPatient, updatePatient, RepositoryError } from "@/core/patients/repository";
import { psgoFormToNewPatient } from "@/core/psgo/patient-mapper";
import type { PsgoForm } from "@/core/psgo/types";

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
