/**
 * Catalog of measurable parameters used when planning a monitoring routine
 * (rotina de aferições) and when displaying scheduled tasks. The `id` strings
 * are persisted inside `ScheduledTask.focus[]`, so they must stay stable.
 */

export type ParamGroup = "vitais" | "obstetrico" | "mgso4" | "medicacao";

export interface MonitorParam {
  id: string; // persisted in focus[]
  label: string; // short chip label
  group: ParamGroup;
}

/** Anchor on the evolution form a param maps to (for "focar" highlight). */
export const PARAM_TO_GROUP: Record<string, ParamGroup> = {
  BCF: "obstetrico",
  Dinâmica: "obstetrico",
  Toque: "obstetrico",
  PA: "vitais",
  FC: "vitais",
  TAX: "vitais",
  Sat: "vitais",
  DXT: "vitais",
  Reflexo: "mgso4",
  Diurese: "mgso4",
  FR: "mgso4",
  Medicação: "medicacao",
};

export const MONITOR_PARAMS: MonitorParam[] = [
  { id: "BCF", label: "BCF", group: "obstetrico" },
  { id: "Dinâmica", label: "Dinâmica", group: "obstetrico" },
  { id: "Toque", label: "Toque", group: "obstetrico" },
  { id: "PA", label: "PA", group: "vitais" },
  { id: "FC", label: "FC", group: "vitais" },
  { id: "TAX", label: "TAX", group: "vitais" },
  { id: "Sat", label: "Sat", group: "vitais" },
  { id: "DXT", label: "DXT", group: "vitais" },
  { id: "Reflexo", label: "Reflexo", group: "mgso4" },
  { id: "Diurese", label: "Diurese", group: "mgso4" },
  { id: "FR", label: "FR", group: "mgso4" },
  { id: "Medicação", label: "Medicação", group: "medicacao" },
];

export const ALL_PARAM_IDS = MONITOR_PARAMS.map((p) => p.id);

export const GROUP_ACCENT: Record<ParamGroup, string> = {
  vitais: "bg-sky-100 text-sky-800 border-sky-200",
  obstetrico: "bg-rose-100 text-rose-800 border-rose-200",
  mgso4: "bg-purple-100 text-purple-800 border-purple-200",
  medicacao: "bg-amber-100 text-amber-800 border-amber-200",
};

export function paramGroup(id: string): ParamGroup {
  return PARAM_TO_GROUP[id] ?? "vitais";
}
