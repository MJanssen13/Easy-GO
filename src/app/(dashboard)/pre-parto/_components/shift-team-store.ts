import type { TeamInput } from "@/core/prontuario/preparto-evolution";

/**
 * Equipe de plantão compartilhada, persistida no navegador (localStorage). É
 * definida uma vez na aba Leitos e alimenta todas as evoluções de plantão do
 * Pré-Parto. Escopo: por dispositivo/estação (não sincroniza entre aparelhos).
 */
const KEY = "easygo.shiftTeam";

export const EMPTY_TEAM: TeamInput = { chefia: "", r3: "", r2: "", r1: "", internos: "" };

export function readShiftTeam(): TeamInput {
  if (typeof window === "undefined") return EMPTY_TEAM;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EMPTY_TEAM;
    return { ...EMPTY_TEAM, ...(JSON.parse(raw) as Partial<TeamInput>) };
  } catch {
    return EMPTY_TEAM;
  }
}

export function writeShiftTeam(team: TeamInput): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(team));
  } catch {
    // localStorage indisponível (modo privado etc.) — ignora
  }
}

export function hasAnyTeam(team: TeamInput): boolean {
  return Object.values(team).some((v) => v.trim() !== "");
}
