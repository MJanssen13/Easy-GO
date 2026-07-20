"use server";

import { revalidatePath } from "next/cache";
import { getPatient, updatePatient, RepositoryError } from "@/core/patients/repository";
import { patientToPsgoForm, psgoFormToNewPatient } from "@/core/psgo/patient-mapper";

/**
 * Registra a prescrição na admissão do PSGO: grava a linha de medicamentos
 * prescritos (`form.prescricao`) para aparecer como "- PRESCREVO: ..." no
 * prontuário. Idempotente — substitui a prescrição anterior.
 */
export async function registrarPrescricaoNaAdmissao(
  patientId: string,
  medsLine: string,
): Promise<{ error?: string }> {
  if (!patientId) return { error: "Admissão não informada." };
  try {
    const patient = await getPatient(patientId);
    if (!patient) return { error: "Admissão não encontrada." };
    const form = patientToPsgoForm(patient);
    if (!form) return { error: "Esta admissão não é do PSGO." };

    form.prescricao = medsLine.trim();
    const input = psgoFormToNewPatient(form);
    await updatePatient(patientId, {
      clinicalSummary: input.clinicalSummary,
      riskFactors: input.riskFactors,
    });
    revalidatePath("/psgo");
    revalidatePath(`/psgo/${patientId}`);
    return {};
  } catch (err) {
    const message =
      err instanceof RepositoryError
        ? err.message
        : "Não foi possível registrar a prescrição na admissão.";
    return { error: message };
  }
}
