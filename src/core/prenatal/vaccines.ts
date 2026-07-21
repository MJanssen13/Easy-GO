/**
 * Cartão de vacinas da gestante — Caderneta da Gestante (MS) / PNI.
 *
 * A lista suspensa dos esquemas (Hep B / dT) reflete a SITUAÇÃO NA DESCOBERTA
 * DA GESTAÇÃO (pré-gestacional). Conforme o status, abre-se o nº de campos de
 * data das doses a completar na gestação (dose sem data → "PENDENTE"); o texto
 * do prontuário registra o que havia antes da gestação.
 *
 * - Hep B: imune/3 doses (0 campos); 1 dose (2 campos); 2 doses (1 campo);
 *   desconhecido/revacinação (3 campos).
 * - dT: 3 doses (0); 1 dose (2); 2 doses (0 — a 3ª é a dTpa); desconhecido (2).
 *   Sem opção "imune" nem "reforço".
 * - dTpa (20–36 sem) e VSR (28–36 sem): um campo de data; na janela e sem data →
 *   PENDENTE, antes da janela → em branco (o rótulo sempre sai).
 * - Influenza e COVID-19: um campo de data.
 *
 * Apoio à decisão — validar com a caderneta e o calendário vigente.
 */

export type VaccineKind = "scheme" | "timed" | "single";

export interface SchemeStatusOption {
  value: string;
  label: string;
  /** Texto do prontuário (prefixo do que havia antes da gestação). */
  text: string;
  /** Nº de campos de data (doses a completar na gestação). */
  fields: number;
  /** Doses feitas antes (para numerar as próximas: prior+1 … prior+fields). */
  prior: number;
}

const HEPB_STATUSES: SchemeStatusOption[] = [
  { value: "", label: "—", text: "", fields: 0, prior: 0 },
  { value: "imune", label: "Imune ou 3 doses", text: "IMUNE/ESQUEMA COMPLETO PRÉ-GESTACIONAL", fields: 0, prior: 3 },
  { value: "1dose", label: "1 dose", text: "1 DOSE PRÉ-GESTACIONAL", fields: 2, prior: 1 },
  { value: "2doses", label: "2 doses", text: "2 DOSES PRÉ-GESTACIONAL", fields: 1, prior: 2 },
  { value: "desconhecido", label: "Desconhecido ou revacinação", text: "DESCONHECIDO/REVACINAÇÃO", fields: 3, prior: 0 },
];

const DT_STATUSES: SchemeStatusOption[] = [
  { value: "", label: "—", text: "", fields: 0, prior: 0 },
  { value: "3doses", label: "3 doses", text: "IMUNE/ESQUEMA COMPLETO PRÉ-GESTACIONAL", fields: 0, prior: 3 },
  { value: "1dose", label: "1 dose", text: "1 DOSE PRÉ-GESTACIONAL", fields: 2, prior: 1 },
  { value: "2doses", label: "2 doses", text: "2 DOSES PRÉ-GESTACIONAL", fields: 0, prior: 2 },
  { value: "desconhecido", label: "Desconhecido", text: "DESCONHECIDO", fields: 2, prior: 0 },
];

export interface PrenatalVaccineDef {
  id: string;
  label: string;
  kind: VaccineKind;
  /** Opções de status (esquemas Hep B / dT). */
  schemeStatuses?: SchemeStatusOption[];
  /** Com janela: IG (semanas) a partir da qual a dose é devida (dTpa=20, VSR=28). */
  dueFromWeeks?: number;
  description?: string;
}

export const PRENATAL_VACCINES: PrenatalVaccineDef[] = [
  { id: "hepb", label: "HEP B", kind: "scheme", schemeStatuses: HEPB_STATUSES, description: "situação pré-gestacional" },
  { id: "dt", label: "DT", kind: "scheme", schemeStatuses: DT_STATUSES, description: "situação pré-gestacional (3ª dose = dTpa)" },
  { id: "dtpa", label: "DTPA", kind: "timed", dueFromWeeks: 20, description: "20–36 sem, a cada gestação" },
  { id: "influenza", label: "INFLUENZA", kind: "single", description: "dose anual (qualquer IG)" },
  { id: "covid", label: "COVID", kind: "single", description: "esquema vigente (qualquer IG)" },
  { id: "vsr", label: "VSR", kind: "timed", dueFromWeeks: 28, description: "28–36 sem" },
];

export interface VaccineEntry {
  /** Esquema (scheme): status escolhido. */
  status: string;
  /** Esquema (scheme): datas das doses (ISO), até 3. */
  doses: string[];
  /** Com janela / dose única (timed/single): data (ISO). */
  date: string;
}

export type VaccineCard = Record<string, VaccineEntry>;

export function emptyVaccineEntry(): VaccineEntry {
  return { status: "", doses: ["", "", ""], date: "" };
}

export function emptyVaccineCard(): VaccineCard {
  const card: VaccineCard = {};
  for (const v of PRENATAL_VACCINES) card[v.id] = emptyVaccineEntry();
  return card;
}

export function schemeStatusOption(def: PrenatalVaccineDef, status: string): SchemeStatusOption | undefined {
  return def.schemeStatuses?.find((o) => o.value === status);
}

/** Quantos campos de data o esquema deve abrir para o status atual (0 = nenhum). */
export function schemeDoseCount(def: PrenatalVaccineDef, status: string): number {
  return schemeStatusOption(def, status)?.fields ?? 0;
}

function dateBR(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** Valor de uma vacina no prontuário (sem o rótulo). `gaWeeks` = IG resolvida. */
export function vaccineValue(def: PrenatalVaccineDef, entry: VaccineEntry, gaWeeks: number | null): string {
  if (def.kind === "scheme") {
    const opt = schemeStatusOption(def, entry.status);
    if (!opt || opt.value === "") return "";
    if (opt.fields === 0) return opt.text;
    const doses = Array.from({ length: opt.fields }, (_, i) => {
      const ord = opt.prior + i + 1;
      const d = entry.doses[i]?.trim();
      return `${ord}ª ${d ? dateBR(d) : "PENDENTE"}`;
    });
    return `${opt.text} - ${doses.join(", ")}`;
  }
  // timed / single
  const d = entry.date?.trim();
  if (d) return dateBR(d);
  if (def.kind === "timed") {
    const due = def.dueFromWeeks ?? 0;
    if (gaWeeks != null && gaWeeks >= due) return "PENDENTE";
    return "";
  }
  return "";
}

/** Linhas "- HEP B: …" do cartão (mantém o rótulo mesmo em branco); + OUTRAS. */
export function renderVaccineCard(card: VaccineCard, gaWeeks: number | null, other = ""): string[] {
  const lines = ["CARTÃO DE VACINAS:"];
  for (const def of PRENATAL_VACCINES) {
    const entry = card[def.id] ?? emptyVaccineEntry();
    const value = vaccineValue(def, entry, gaWeeks);
    lines.push(`- ${def.label}:${value ? ` ${value}` : ""}`);
  }
  if (other.trim()) lines.push(`- OUTRAS: ${other.trim()}`);
  return lines;
}
