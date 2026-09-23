"use server";

import { revalidatePath } from "next/cache";
import { getPatient, updatePatient, RepositoryError } from "@/core/patients/repository";
import { readPartogram, emptyLcg, type PartogramData, type PartogramModel } from "@/core/partogram/types";

export interface PartogramResult {
  error?: string;
}

function paths(id: string) {
  revalidatePath("/pre-parto");
  revalidatePath(`/pre-parto/${id}`);
  revalidatePath(`/pre-parto/${id}/partograma`);
  revalidatePath("/");
}

/**
 * Abre o partograma: grava a hora de abertura (coluna 0 dos dois modelos) e o
 * modelo preferido, e muda a situação para "Partograma aberto". As aferições
 * registradas a partir daí preenchem o partograma automaticamente.
 */
export async function openPartogram(
  patientId: string,
  openedAt: string,
  model: PartogramModel,
): Promise<PartogramResult> {
  try {
    const patient = await getPatient(patientId);
    if (!patient) return { error: "Paciente não encontrada." };
    const current = readPartogram(patient.partogramData);
    const data: PartogramData = {
      ...(current ?? {}),
      version: 2,
      model,
      openedAt,
      startTime: openedAt,
      lcg: current?.lcg ?? emptyLcg(),
    };
    await updatePatient(patientId, {
      status: "partogram_open",
      partogramData: data as unknown as Record<string, unknown>,
    });
  } catch (err) {
    return {
      error: err instanceof RepositoryError ? err.message : "Não foi possível abrir o partograma.",
    };
  }
  paths(patientId);
  return {};
}

/** Salva os lançamentos manuais do partograma (os dois modelos). */
export async function savePartogram(patientId: string, data: PartogramData): Promise<PartogramResult> {
  if (!data.openedAt) return { error: "Partograma sem hora de abertura." };
  try {
    await updatePatient(patientId, {
      partogramData: { ...data, version: 2, startTime: data.openedAt } as unknown as Record<string, unknown>,
    });
  } catch (err) {
    return {
      error: err instanceof RepositoryError ? err.message : "Não foi possível salvar o partograma.",
    };
  }
  paths(patientId);
  return {};
}
