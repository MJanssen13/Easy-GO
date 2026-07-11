import type { TeamInput } from "@/core/prontuario/preparto-evolution";

/**
 * Equipe de plantão compartilhada por TODA a plataforma (não só o Pré-Parto):
 * persistida no navegador (localStorage), definida uma vez na página inicial e
 * reaproveitada por todos os módulos (evoluções do Pré-Parto, prontuário do
 * PSGO, etc.). Escopo: por dispositivo/estação (não sincroniza entre aparelhos).
 */
const KEY = "easygo.shiftTeam";

export const EMPTY_TEAM: TeamInput = { chefia: "", r3: "", r2: "", r1: "", internos: "" };

/** Rótulos (MAIÚSCULAS) na ordem em que aparecem no prontuário. */
export const TEAM_ROLE_LABELS: Array<[keyof TeamInput, string]> = [
  ["chefia", "CHEFIA"],
  ["r3", "R3"],
  ["r2", "R2"],
  ["r1", "R1"],
  ["internos", "INTERNOS"],
];

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

/** Linhas "CARGO: nomes" apenas para os cargos preenchidos. */
export function formatShiftTeamLines(team: TeamInput): string[] {
  return TEAM_ROLE_LABELS.flatMap(([key, label]) => {
    const value = (team[key] ?? "").trim();
    return value ? [`${label}: ${value}`] : [];
  });
}

/** Bloco "EQUIPE DE PLANTÃO:" (vazio se nenhum cargo preenchido). */
export function formatShiftTeamBlock(team: TeamInput): string {
  const lines = formatShiftTeamLines(team);
  return lines.length ? ["EQUIPE DE PLANTÃO:", ...lines].join("\n") : "";
}
