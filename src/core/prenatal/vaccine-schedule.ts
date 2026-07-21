/**
 * Recomendação de vacinas na gestação por idade gestacional (IG).
 *
 * FONTE: Programa Nacional de Imunizações (PNI/MS) — Calendário de Vacinação da
 * Gestante; Caderneta da Gestante (MS, 2022). Janelas resumidas abaixo. Apoio à
 * decisão — SEMPRE validar com a caderneta/esquema vacinal e o calendário
 * vigente (as recomendações e a disponibilização de imunobiológicos mudam).
 *
 * Não fabrica esquema: as janelas usadas são as oficiais citadas; quando a IG é
 * desconhecida, devolve orientação genérica ("verificar esquema").
 */
import type { PrenatalVaccineDef } from "./vaccines";
import { PRENATAL_VACCINES } from "./vaccines";

export type VaccineRecStatus =
  | "due" // dentro da janela recomendada agora
  | "wait" // recomendada mais adiante (aguardar a janela)
  | "late" // janela ideal passou, mas ainda se aplica
  | "outside" // fora da janela recomendada
  | "anytime" // pode ser feita em qualquer trimestre
  | "unknown"; // IG desconhecida

export interface VaccineRecommendation {
  id: string;
  label: string;
  /** Janela recomendada (texto curto). */
  window: string;
  status: VaccineRecStatus;
  /** Orientação para a IG atual. */
  hint: string;
}

const byId = new Map<string, PrenatalVaccineDef>(PRENATAL_VACCINES.map((v) => [v.id, v]));

/**
 * Recomendações por IG (semanas completas). `gaWeeks` nulo => IG desconhecida.
 */
export function vaccineRecommendations(gaWeeks: number | null): VaccineRecommendation[] {
  const rec = (id: string, window: string, status: VaccineRecStatus, hint: string): VaccineRecommendation => ({
    id,
    label: byId.get(id)?.label ?? id.toUpperCase(),
    window,
    status,
    hint,
  });
  const unknown = gaWeeks == null || Number.isNaN(gaWeeks);

  // Hepatite B — 3 doses (0-1-6 meses) se esquema incompleto/desconhecido;
  // pode ser aplicada em qualquer momento da gestação.
  const hepb = rec(
    "hepb",
    "Qualquer IG (3 doses se esquema incompleto)",
    "anytime",
    "Verificar esquema; iniciar/completar as 3 doses se incompleto ou desconhecido.",
  );

  // dT (dupla adulto) — atualizar/completar o esquema (3 doses) se incompleto.
  const dt = rec(
    "dt",
    "Qualquer IG (atualizar/completar esquema)",
    "anytime",
    "Atualizar; se esquema incompleto, completar 3 doses de dT.",
  );

  // dTpa — a cada gestação, a partir de 20 semanas (ideal até 36s).
  let dtpa: VaccineRecommendation;
  if (unknown) {
    dtpa = rec("dtpa", "A partir de 20 sem (a cada gestação)", "unknown", "Informe a IG para orientar a dTpa (≥ 20 sem).");
  } else if (gaWeeks! < 20) {
    dtpa = rec("dtpa", "A partir de 20 sem", "wait", `Aguardar 20 sem (faltam ${20 - gaWeeks!} sem).`);
  } else if (gaWeeks! <= 36) {
    dtpa = rec("dtpa", "20–36 sem", "due", "Recomendada agora (janela ideal 20–36 sem).");
  } else {
    dtpa = rec("dtpa", "20–36 sem (ideal)", "late", "Aplicar o quanto antes — ainda indicada, mesmo após 36 sem.");
  }

  // Influenza — dose anual, qualquer trimestre (campanha sazonal).
  const influenza = rec(
    "influenza",
    "Qualquer IG (dose anual)",
    "anytime",
    "Dose única anual, em qualquer trimestre (campanha sazonal).",
  );

  // COVID-19 — conforme esquema vigente, qualquer trimestre.
  const covid = rec(
    "covid",
    "Qualquer IG (esquema vigente)",
    "anytime",
    "Conforme o esquema vigente do PNI, em qualquer trimestre.",
  );

  // VSR (vacina materna) — janela 28–36 semanas (sazonal, conforme disponibilidade).
  let vsr: VaccineRecommendation;
  if (unknown) {
    vsr = rec("vsr", "28–36 sem", "unknown", "Informe a IG para orientar a VSR (28–36 sem).");
  } else if (gaWeeks! < 28) {
    vsr = rec("vsr", "28–36 sem", "wait", `Aguardar 28 sem (faltam ${28 - gaWeeks!} sem).`);
  } else if (gaWeeks! <= 36) {
    vsr = rec("vsr", "28–36 sem", "due", "Recomendada agora (janela 28–36 sem).");
  } else {
    vsr = rec("vsr", "28–36 sem", "outside", "Fora da janela (28–36 sem).");
  }

  return [hepb, dt, dtpa, influenza, covid, vsr];
}
