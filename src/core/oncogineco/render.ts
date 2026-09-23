/**
 * Gerador da evolução de enfermaria da Onco-Ginecologia. Segue a estrutura da
 * "ENFERMARIA GO GERAL" do serviço (cabeçalho de antecedentes → contexto →
 * evolução → exame físico → parâmetros → exames → HD + plano → CD), com os
 * dados oncológicos (diagnóstico, estadiamento, tratamentos, DPO, dispositivos).
 * Puro. Texto final em MAIÚSCULAS.
 *
 * ECOG (Oken MM et al., Am J Clin Oncol 1982;5:649-55): 0 ativo · 1 restrição a
 * esforço extenuante · 2 deambula, autocuidado, fora do leito > 50% do dia ·
 * 3 autocuidado limitado, no leito > 50% · 4 completamente incapaz.
 */
import type { Patient } from "@/core/patients/types";
import { calendarDaysBetween, dateFull } from "@/core/prontuario/ward";
import {
  ONCO_DISCHARGE_ITEMS,
  ONCO_EVOLUTION_ITEMS,
  ONCO_PLAN_ITEMS,
  type OncoEvolutionForm,
  type OncoHistory,
} from "./types";

export const ECOG_LABELS: Record<string, string> = {
  "0": "Totalmente ativa",
  "1": "Restrição a esforço extenuante",
  "2": "Deambula, autocuidado; fora do leito > 50% do dia",
  "3": "Autocuidado limitado; no leito > 50% do dia",
  "4": "Completamente incapaz; restrita ao leito",
};

/** Nº do dia de pós-operatório (null sem cirurgia registrada). */
export function postOpDay(history: OncoHistory, ref: Date | string = new Date()): number | null {
  if (!history.surgery.trim() || !history.surgeryDate) return null;
  return calendarDaysBetween(history.surgeryDate, ref);
}

export function oncoDiagnosisLine(h: OncoHistory): string {
  return [h.diagnosis.trim(), h.histology.trim(), h.staging.trim() ? `ESTADIO ${h.staging.trim()}` : ""]
    .filter(Boolean)
    .join(" - ");
}

/** Esboço do CONTEXTO INTERNAÇÃO a partir dos dados oncológicos. */
export function draftOncoContext(h: OncoHistory): string {
  const parts: string[] = [];
  const dx = oncoDiagnosisLine(h);
  parts.push(`PACIENTE EM SEGUIMENTO NA ONCOGINECOLOGIA${dx ? ` POR ${dx}` : ""}.`);
  if (h.priorTreatment.trim()) parts.push(`TRATAMENTO PRÉVIO: ${h.priorTreatment.trim()}.`);
  if (h.admissionReason.trim()) parts.push(`INTERNADA PARA ${h.admissionReason.trim()}.`);
  if (h.surgery.trim())
    parts.push(`SUBMETIDA A ${h.surgery.trim()}${h.surgeryDate ? ` EM ${dateFull(h.surgeryDate)}` : ""}.`);
  return parts.join(" ");
}

function evolutionParagraph(form: OncoEvolutionForm): string {
  const get = (id: string) => (form.choices[id] ?? "").trim();
  const s: string[] = [];
  s.push(`AVALIO PACIENTE EM LEITO ENFERMARIA, EM BEG, ${get("company") || "COM ACOMPANHANTE"}`);
  s.push("PACIENTE VIGIL E CONSCIENTE");
  for (const item of ONCO_EVOLUTION_ITEMS) {
    if (item.id === "company") continue;
    const v = get(item.id);
    if (!v) continue;
    if (item.id === "pain" && form.painScore.trim()) s.push(`${v} (EVA ${form.painScore.trim()}/10)`);
    else s.push(v);
  }
  if (form.complaints.trim()) s.push(form.complaints.trim().replace(/\.$/, ""));
  s.push("NEGA DEMAIS QUEIXAS");
  return `${s.join(". ")}.`;
}

type HeaderPatient = Pick<Patient, "name" | "age" | "parity" | "medicalRecordNumber" | "bloodType" | "riskFactors">;

export function renderOncoEvolution(patient: HeaderPatient, h: OncoHistory, form: OncoEvolutionForm): string {
  const L: string[] = [];
  const e = form.exam;
  const v = form.vitals;
  const clean = (t: string) => t.trim().replace(/\.$/, "");

  L.push(`# ENFERMARIA GO ONCOLOGIA - ${dateFull(form.date)} #`);
  L.push("");
  L.push(`${patient.name}, RG ${patient.medicalRecordNumber ?? ""}`.trim());
  L.push(`${patient.age != null ? `${patient.age} ANOS` : "IDADE"}, PROCEDENTE DE ${h.origin}`.trim());
  L.push("");
  L.push(`PARIDADE: ${patient.parity ?? ""}`);
  L.push(`TIPO SANGUÍNEO: ${patient.bloodType ?? ""}`);
  L.push("");
  L.push(`DIAGNÓSTICO ONCOLÓGICO: ${oncoDiagnosisLine(h)}`);
  L.push(`TRATAMENTO PRÉVIO: ${h.priorTreatment}`);
  L.push("");
  L.push(`CMB: ${h.cmb || (patient.riskFactors ?? []).join(" + ")}`);
  L.push(`MEU: ${h.meu}`);
  L.push(`FEZ USO DE: ${h.pastMeds}`);
  L.push(`CIRURGIAS PRÉVIAS: ${h.surgeries}`);
  L.push(`ALERGIAS: ${h.allergies}`);
  L.push(`HCV: ${h.hcv}`);
  L.push("");
  L.push(`CONTEXTO INTERNAÇÃO: ${h.context.trim() || draftOncoContext(h)}`);
  L.push("");
  L.push(`EVOLUÇÃO: ${evolutionParagraph(form)}`);
  L.push("");
  L.push("AO EXAME FÍSICO:");
  L.push(`${clean(e.general)}.${form.ecog ? ` ECOG ${form.ecog}.` : ""}`);
  L.push(`AR: ${clean(e.ar)}${v.fr ? `, FR: ${v.fr} IRPM` : ""}, SATO2: ${v.spo2 ? `${v.spo2}%` : ""}`);
  L.push(
    `ACV: ${clean(e.acv)}, PA: ${v.paSystolic || v.paDiastolic ? `${v.paSystolic}X${v.paDiastolic} ` : ""}MMHG, FC: ${v.fc ? `${v.fc} ` : ""}BPM`,
  );
  L.push(`ABD: ${clean(e.abdomen)}`);
  if (e.wound.trim()) L.push(`FO: ${clean(e.wound)}`);
  if (e.gyneco.trim()) L.push(`GINECOLÓGICO: ${clean(e.gyneco)}`);
  L.push(`MEMBROS: ${clean(e.limbs)}.`);
  if (form.devices.trim()) {
    L.push("");
    L.push("DISPOSITIVOS / DÉBITOS:");
    for (const l of form.devices.split("\n").map((x) => x.trim()).filter(Boolean)) L.push(`- ${l.replace(/^-\s*/, "")}`);
  }
  L.push("");
  L.push("PARÂMETROS DA ENFERMAGEM");
  L.push(form.nursingParams.trim() || "PAS: / PAD: / FC: / TAX: ºC");
  L.push("");
  L.push("PARÂMETROS DA EQUIPE DE GO");
  L.push(`PAS: ${v.paSystolic} / PAD: ${v.paDiastolic}${v.fc ? ` / FC: ${v.fc}` : ""}${v.tax ? ` / TAX: ${v.tax.replace(".", ",")}ºC` : ""}`);
  L.push("");
  L.push(`EXAMES LABORATORIAIS: ${form.labs.trim()}`);
  L.push("");

  const hd: string[] = [];
  const dx = oncoDiagnosisLine(h);
  if (dx) hd.push(dx);
  const pod = postOpDay(h, form.date);
  if (pod != null) hd.push(`${pod}º DPO DE ${h.surgery.trim()}`);
  for (const l of form.hdExtra.split("\n").map((x) => x.trim()).filter(Boolean)) hd.push(l.replace(/^-\s*/, ""));
  L.push(`HD: ${hd[0] ?? ""}`);
  for (const l of hd.slice(1)) L.push(`- ${l}`);
  for (const p of ONCO_PLAN_ITEMS) if (form.plan[p.id]) L.push(`- ${p.text}`);
  for (const l of form.planExtra.split("\n").map((x) => x.trim()).filter(Boolean)) L.push(`- ${l.replace(/^-\s*/, "")}`);
  L.push("");

  const who = form.preceptor.trim() || "DR(A)";
  if (form.mode === "alta") {
    L.push(`CD: DISCUTIDA COM ${who}, QUE ORIENTA:`);
    const lines = ONCO_DISCHARGE_ITEMS.filter((d) => form.discharge[d.id]).map((d) => d.text);
    for (const l of form.dischargeExtra.split("\n").map((x) => x.trim()).filter(Boolean)) lines.push(l.replace(/^-\s*/, ""));
    lines.forEach((l, i) => L.push(`- ${l}${i < lines.length - 1 ? ";" : ""}`));
  } else {
    L.push(`CD: DISCUTIDA COM ${who} QUE ORIENTA:`);
    for (const l of form.conduct.split("\n").map((x) => x.trim()).filter(Boolean)) L.push(`- ${l.replace(/^-\s*/, "")}`);
  }

  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim().toUpperCase();
}
