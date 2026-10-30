import type { ScheduledTask } from "@/core/patients/types";
import { nextHalfHour, shiftEnd, tasksFromRoutines } from "./planner";
import { getRoutine, hasDiabetesRisk, suggestedBaseRoutine } from "./routines";

/**
 * Rotina de aferições inicial ao entrar no Pré-Parto (admissão direta ou
 * transferência do PSGO): fase de base pela situação + protocolo de diabetes
 * se houver DMG/Overt nos fatores de risco. Da próxima meia hora ao fim do turno.
 */
export function initialRoutineTasks(status: string, riskFactors: string[], now = new Date()): ScheduledTask[] {
  const base = getRoutine(suggestedBaseRoutine(status));
  if (!base) return [];
  const routines = [base];
  if (hasDiabetesRisk(riskFactors)) {
    const diabetes = getRoutine("diabetes");
    if (diabetes) routines.push(diabetes);
  }
  const from = nextHalfHour(now);
  return tasksFromRoutines(routines, from, shiftEnd(from));
}
