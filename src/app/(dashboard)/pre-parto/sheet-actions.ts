"use server";

import { revalidatePath } from "next/cache";
import {
  addObservations,
  deleteObservations,
  getSchedule,
  updateObservation,
  updateSchedule,
  RepositoryError,
} from "@/core/patients/repository";
import { markCompleted } from "@/core/schedule/planner";
import type { NewObservationInput } from "@/core/patients/types";

export interface SheetSaveInput {
  creates: NewObservationInput[];
  updates: { id: string; input: NewObservationInput }[];
  deletes: string[];
}

export interface SheetSaveResult {
  error?: string;
  created?: number;
  updated?: number;
  deleted?: number;
  /** Tarefas do cronograma concluídas pelas novas aferições. */
  tasksDone?: number;
}

/** Janela para uma aferição nova concluir a tarefa pendente do cronograma. */
const TASK_MATCH_MIN = 20;

/**
 * Salva a planilha de aferições: insere as novas (uma ida ao banco), atualiza
 * as editadas e exclui as removidas — em paralelo. Aferições novas próximas
 * (± 20 min) de uma tarefa pendente do cronograma a marcam como feita.
 */
export async function saveObservationSheet(patientId: string, data: SheetSaveInput): Promise<SheetSaveResult> {
  const creates = data.creates.filter((c) => c.patientId === patientId);
  const updates = data.updates.filter((u) => u.input.patientId === patientId);
  const deletes = data.deletes.filter(Boolean);
  if (creates.length + updates.length + deletes.length === 0) return { created: 0, updated: 0, deleted: 0 };

  const scheduleRead = creates.length ? getSchedule(patientId).catch(() => null) : null;
  try {
    await Promise.all([
      addObservations(creates),
      ...updates.map((u) => updateObservation(u.id, u.input)),
      deleteObservations(patientId, deletes),
    ]);
  } catch (err) {
    return {
      error:
        err instanceof RepositoryError ? err.message : "Não foi possível salvar a planilha. Verifique a conexão.",
    };
  }

  let tasksDone = 0;
  const schedule = scheduleRead ? await scheduleRead : null;
  if (schedule) {
    let next = schedule;
    for (const c of creates) {
      const t = new Date(c.recordedAt ?? Date.now()).getTime();
      const task = next.find(
        (k) => k.status === "pending" && Math.abs(new Date(k.timestamp).getTime() - t) <= TASK_MATCH_MIN * 60000,
      );
      if (task) {
        next = markCompleted(next, task.id);
        tasksDone++;
      }
    }
    if (tasksDone) await updateSchedule(patientId, next).catch(() => {});
  }

  revalidatePath(`/pre-parto/${patientId}`);
  revalidatePath(`/pre-parto/${patientId}/planilha`);
  return { created: creates.length, updated: updates.length, deleted: deletes.length, tasksDone };
}

/** Exclui uma aferição (botão do histórico). */
export async function deleteObservationAction(formData: FormData): Promise<void> {
  const patientId = String(formData.get("patientId") ?? "");
  const obsId = String(formData.get("obsId") ?? "");
  if (!patientId || !obsId) return;
  try {
    await deleteObservations(patientId, [obsId]);
  } catch {
    return;
  }
  revalidatePath(`/pre-parto/${patientId}`);
}
