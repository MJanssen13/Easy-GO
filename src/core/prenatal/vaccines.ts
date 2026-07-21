/**
 * Cartão de vacinas da gestante (MODELO DE PRÉ-NATAL). As vacinas de rotina do
 * pré-natal seguem a Caderneta da Gestante (MS): Hepatite B, dupla adulto (dT),
 * dTpa, Influenza, COVID-19 e VSR (vírus sincicial respiratório).
 *
 * Cada item guarda um status (em dia / realizada / pendente / …) e um detalhe
 * livre opcional (ex.: data ou idade gestacional da dose). Apoio à decisão —
 * validar com a caderneta e o calendário vigente.
 */

export interface PrenatalVaccineDef {
  id: string;
  /** Rótulo curto exibido no prontuário. */
  label: string;
  /** Descrição para a interface. */
  description?: string;
}

export const PRENATAL_VACCINES: PrenatalVaccineDef[] = [
  { id: "hepb", label: "HEP B", description: "Hepatite B" },
  { id: "dt", label: "DT", description: "Dupla adulto (difteria/tétano)" },
  { id: "dtpa", label: "DTPA", description: "Tríplice bacteriana acelular (a partir de 20 sem)" },
  { id: "influenza", label: "INFLUENZA", description: "Campanha anual" },
  { id: "covid", label: "COVID", description: "COVID-19" },
  { id: "vsr", label: "VSR", description: "Vírus sincicial respiratório (28–36 sem)" },
];

/** Status possíveis de cada vacina (o vazio deixa o rótulo em branco, como no modelo). */
export const VACCINE_STATUSES: string[] = [
  "",
  "EM DIA",
  "REALIZADA",
  "PENDENTE",
  "ESQUEMA COMPLETO",
  "NÃO SE APLICA",
  "IGNORADO",
];

export interface VaccineEntry {
  status: string;
  /** Detalhe livre (ex.: "01/2026", "28 SEM"). */
  detail: string;
}

export type VaccineCard = Record<string, VaccineEntry>;

export function emptyVaccineCard(): VaccineCard {
  const card: VaccineCard = {};
  for (const v of PRENATAL_VACCINES) card[v.id] = { status: "", detail: "" };
  return card;
}

/** Linhas "- HEP B: …" do cartão de vacinas (mantém o rótulo mesmo em branco). */
export function renderVaccineCard(card: VaccineCard): string[] {
  const lines = ["CARTÃO DE VACINAS:"];
  for (const v of PRENATAL_VACCINES) {
    const entry = card[v.id] ?? { status: "", detail: "" };
    const value = [entry.status.trim(), entry.detail.trim()].filter(Boolean).join(" ");
    lines.push(`- ${v.label}:${value ? ` ${value}` : ""}`);
  }
  return lines;
}
