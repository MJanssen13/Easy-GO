/**
 * Cartão de vacinas da gestante (MODELO DE PRÉ-NATAL) — Caderneta da Gestante (MS)
 * / PNI. Cada vacina tem um comportamento próprio:
 *
 * - Esquema (Hep B / dT): status (imune, completo, incompleto, desconhecido,
 *   reforço). Quando falta esquema, abre campos de data das doses; dose sem data
 *   sai "PENDENTE". Hep B = 3 doses; dT incompleto = 2 doses (a 3ª é a dTpa),
 *   desconhecido/reforço = 3.
 * - Com janela (dTpa 20–36 sem / VSR 28–36 sem): um campo de data. Feita → data;
 *   dentro da janela e sem data → PENDENTE; antes da janela → em branco (o rótulo
 *   sempre sai no prontuário).
 * - Dose única (Influenza / COVID-19): um campo de data.
 *
 * Apoio à decisão — validar com a caderneta e o calendário vigente.
 */

export type VaccineKind = "scheme" | "timed" | "single";

export interface PrenatalVaccineDef {
  id: string;
  label: string;
  kind: VaccineKind;
  /** Esquema: nº de doses quando desconhecido/reforço (Hep B/dT = 3). */
  doses?: number;
  /** Esquema: nº de doses quando "incompleto" (dT = 2; Hep B = 3). */
  incompleteDoses?: number;
  /** Com janela: IG (semanas) a partir da qual a dose é devida (dTpa=20, VSR=28). */
  dueFromWeeks?: number;
  description?: string;
}

export const PRENATAL_VACCINES: PrenatalVaccineDef[] = [
  { id: "hepb", label: "HEP B", kind: "scheme", doses: 3, incompleteDoses: 3, description: "Hepatite B — 3 doses" },
  { id: "dt", label: "DT", kind: "scheme", doses: 3, incompleteDoses: 2, description: "Dupla adulto — incompleto abre 2 (a 3ª é a dTpa)" },
  { id: "dtpa", label: "DTPA", kind: "timed", dueFromWeeks: 20, description: "20–36 sem, a cada gestação" },
  { id: "influenza", label: "INFLUENZA", kind: "single", description: "Dose anual (qualquer IG)" },
  { id: "covid", label: "COVID", kind: "single", description: "Esquema vigente (qualquer IG)" },
  { id: "vsr", label: "VSR", kind: "timed", dueFromWeeks: 28, description: "28–36 sem" },
];

/** Status dos esquemas (Hep B / dT). O vazio deixa o rótulo em branco. */
export const SCHEME_STATUSES: string[] = [
  "",
  "IMUNE",
  "ESQUEMA COMPLETO",
  "INCOMPLETO",
  "DESCONHECIDO",
  "REFORÇO",
];

/** Status que exigem registrar o esquema (abrem campos de data das doses). */
const SCHEME_NEEDS_DOSES = new Set(["INCOMPLETO", "DESCONHECIDO", "REFORÇO"]);

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

/** Quantas doses o esquema deve registrar para o status atual (0 = sem campos). */
export function schemeDoseCount(def: PrenatalVaccineDef, status: string): number {
  if (def.kind !== "scheme" || !SCHEME_NEEDS_DOSES.has(status)) return 0;
  return status === "INCOMPLETO" ? (def.incompleteDoses ?? def.doses ?? 3) : (def.doses ?? 3);
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
    const n = schemeDoseCount(def, entry.status);
    if (n === 0) return entry.status;
    const doses = Array.from({ length: n }, (_, i) => {
      const d = entry.doses[i]?.trim();
      return `${i + 1}ª ${d ? dateBR(d) : "PENDENTE"}`;
    });
    return `${entry.status} - ${doses.join(", ")}`;
  }
  // timed / single
  const d = entry.date?.trim();
  if (d) return dateBR(d);
  if (def.kind === "timed") {
    const due = def.dueFromWeeks ?? 0;
    // Dentro/depois da janela e sem data → PENDENTE; antes da janela → em branco.
    if (gaWeeks != null && gaWeeks >= due) return "PENDENTE";
    return "";
  }
  return ""; // single sem data → em branco
}

/** Linhas "- HEP B: …" do cartão de vacinas (mantém o rótulo mesmo em branco). */
export function renderVaccineCard(card: VaccineCard, gaWeeks: number | null): string[] {
  const lines = ["CARTÃO DE VACINAS:"];
  for (const def of PRENATAL_VACCINES) {
    const entry = card[def.id] ?? emptyVaccineEntry();
    const value = vaccineValue(def, entry, gaWeeks);
    lines.push(`- ${def.label}:${value ? ` ${value}` : ""}`);
  }
  return lines;
}
