/**
 * Gerador da evolução "ENFERMARIA GO GERAL" (puerpério) no modelo do serviço
 * (HC-UFTM). Puro (roda no cliente). O texto final sai em MAIÚSCULAS.
 *
 * Classificação do puerpério (MS, Manual Técnico Pré-natal e Puerpério, 2006):
 * imediato do 1º ao 10º dia, tardio do 11º ao 42º, remoto após o 42º.
 */
import type { Patient } from "@/core/patients/types";
import { calendarDaysBetween, dateFull, nursingParamsFrom, pad2 } from "@/core/prontuario/ward";

export { dateFull, nursingParamsFrom };
import {
  DISCHARGE_ITEMS,
  EVOLUTION_ITEMS,
  PLAN_ITEMS,
  isVaginal,
  type DeliveryInfo,
  type Newborn,
  type PuerperalEvolutionForm,
  type WardHistory,
} from "./types";

/** Dias de calendário entre o parto e `ref` (0 = no dia do parto). */
export function postpartumDay(deliveryAt: string, ref: Date | string = new Date()): number {
  return calendarDaysBetween(deliveryAt, ref);
}

export function puerperiumPhase(day: number): "IMEDIATO" | "TARDIO" | "REMOTO" {
  if (day <= 10) return "IMEDIATO";
  if (day <= 42) return "TARDIO";
  return "REMOTO";
}

/** "PUERPÉRIO IMEDIATO (1º DIA PÓS PARTO)". */
export function puerperioHdLine(delivery: DeliveryInfo, ref: Date | string): string {
  const day = postpartumDay(delivery.at, ref);
  return `PUERPÉRIO ${puerperiumPhase(day)} (${day}º DIA PÓS PARTO)`;
}

function newbornPhrase(nb: Newborn): string {
  const parts = [
    nb.sex === "F" ? "SEXO FEMININO" : nb.sex === "M" ? "SEXO MASCULINO" : "",
    nb.alive ? "VIVO" : "NATIMORTO",
    nb.apgar1 || nb.apgar5 ? `APGAR ${nb.apgar1 || "?"}/${nb.apgar5 || "?"}` : "",
    nb.weight ? `PESO ${nb.weight}G` : "",
  ].filter(Boolean);
  return parts.join(", ");
}

/**
 * Esboço do CONTEXTO INTERNAÇÃO a partir dos dados do parto (o resto — toque
 * na admissão, indução, acompanhante — a equipe completa no texto).
 */
export function draftContext(delivery: DeliveryInfo): string {
  const d = new Date(delivery.at);
  const hora = Number.isNaN(d.getTime()) ? "" : `${pad2(d.getHours())}H${pad2(d.getMinutes())}`;
  const dia = Number.isNaN(d.getTime()) ? "" : `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`;
  const ga = delivery.ga.trim() ? ` DE ${delivery.ga.trim()}` : "";
  const via =
    delivery.type === "cesarea"
      ? "PACIENTE ENCAMINHADA AO BLOCO CIRÚRGICO, SUBMETIDA A CESÁREA."
      : "PACIENTE ENCAMINHADA AO BLOCO CIRÚRGICO EM PERÍODO EXPULSIVO DO TRABALHO DE PARTO.";
  const rn = delivery.twins
    ? `DEU ORIGEM A RNS GEMELARES ÀS ${hora} DO DIA ${dia}: RN 1 ${newbornPhrase(delivery.newborn)}; RN 2 ${newbornPhrase(delivery.newborn2 ?? delivery.newborn)}.`
    : `DEU ORIGEM A RN ÚNICO ÀS ${hora} DO DIA ${dia}, ${newbornPhrase(delivery.newborn)}.`;
  const destino = delivery.roomingIn
    ? "EVOLUIU EM BOM ESTADO APÓS PROCEDIMENTO, SENDO ENCAMINHADA PARA LEITO DE ALOJAMENTO CONJUNTO ACOMPANHADA DO RN."
    : "EVOLUIU EM BOM ESTADO APÓS PROCEDIMENTO, SENDO ENCAMINHADA PARA LEITO DE ENFERMARIA.";
  return `PACIENTE INTERNADA EM LEITO DE PRÉ-PARTO DEVIDO A GESTAÇÃO${ga}. ${via} ${rn} ${destino}`;
}

function evolutionParagraph(form: PuerperalEvolutionForm): string {
  const c = form.choices;
  const get = (id: string) => (c[id] ?? "").trim();
  const s: string[] = [];
  s.push(`AVALIO PACIENTE EM LEITO ENFERMARIA, EM BEG, ${get("company") || "COM ACOMPANHANTE E RN"}`);
  s.push("PACIENTE VIGIL E CONSCIENTE");
  for (const item of EVOLUTION_ITEMS) {
    if (["company", "walk", "diet"].includes(item.id)) continue;
    const v = get(item.id);
    if (v) s.push(v);
  }
  const walk = get("walk");
  const diet = get("diet");
  if (walk || diet) s.push([walk, diet].filter(Boolean).join(" E "));
  if (form.complaints.trim()) s.push(form.complaints.trim().replace(/\.$/, ""));
  s.push("NEGA DEMAIS QUEIXAS");
  return `${s.join(". ")}.`;
}

const LOCHIA_AMOUNT: Record<string, string> = {
  pequena: "EM PEQUENA QUANTIDADE",
  moderada: "EM MODERADA QUANTIDADE",
  grande: "EM GRANDE QUANTIDADE",
};

const FUNDUS: Record<string, string> = {
  abaixo: "ABAIXO DA CICATRIZ UMBILICAL",
  cicatriz: "NA CICATRIZ UMBILICAL",
  acima: "ACIMA DA CICATRIZ UMBILICAL",
};

function fill(template: string, form: PuerperalEvolutionForm): string {
  return template
    .replace("({METODO})", form.method.trim() ? `(${form.method.trim()})` : "")
    .replace("({ACO})", form.aco.trim() ? `(${form.aco.trim()})` : "")
    .replace("({FERRO})", form.iron.trim() ? `(${form.iron.trim()})` : "")
    .replace(/\s+$/, "");
}

export function dischargeLines(delivery: DeliveryInfo, form: PuerperalEvolutionForm): string[] {
  const via = isVaginal(delivery.type) ? "normal" : "cesarea";
  const lines = DISCHARGE_ITEMS.filter((d) => (d.via === "ambas" || d.via === via) && form.discharge[d.id]).map(
    (d) => fill(d.text, form),
  );
  for (const l of form.dischargeExtra.split("\n").map((x) => x.trim()).filter(Boolean)) lines.push(l.replace(/^-\s*/, ""));
  return lines;
}

type HeaderPatient = Pick<
  Patient,
  "name" | "age" | "parity" | "medicalRecordNumber" | "bloodType" | "riskFactors"
>;

export function renderPuerperioEvolution(
  patient: HeaderPatient,
  delivery: DeliveryInfo,
  history: WardHistory,
  form: PuerperalEvolutionForm,
): string {
  const L: string[] = [];
  const e = form.exam;
  const v = form.vitals;

  L.push(`# ENFERMARIA GO GERAL - ${dateFull(form.date)} #`);
  L.push("");
  L.push(`${patient.name}, RG ${patient.medicalRecordNumber ?? ""}`.replace(/, RG $/, ", RG"));
  L.push(`${patient.age != null ? `${patient.age} ANOS` : "IDADE"}, PROCEDENTE DE ${history.origin}`.trim());
  L.push("");
  L.push(`PARIDADE: ${patient.parity ?? ""}`);
  L.push("");
  L.push(`TIPO SANGUÍNEO: ${patient.bloodType ?? ""}`);
  L.push(`COOMBS INDIRETO: ${history.coombsIndirect}`);
  L.push("");
  L.push(`TIPO SANGUÍNEO RN: ${history.newbornBloodType}`);
  L.push(`COOMBS DIRETO: ${history.directCoombs}`);
  L.push("");
  L.push(`CMB: ${history.cmb || (patient.riskFactors ?? []).join(" + ")}`);
  L.push(`MEU: ${history.meu}`);
  L.push(`FEZ USO DE: ${history.pastMeds}`);
  L.push(`CIRURGIAS PRÉVIAS: ${history.surgeries}`);
  L.push(`ALERGIAS: ${history.allergies}`);
  L.push(`HCV: ${history.hcv}`);
  L.push(`CONSULTAS DE PRÉ-NATAL: ${history.prenatalVisits}`);
  L.push("");
  L.push(`SOROLOGIAS: ${history.serologies}`);
  L.push("");
  L.push(`CONTEXTO INTERNAÇÃO: ${history.context.trim() || draftContext(delivery)}`);
  L.push("");
  L.push(`EVOLUÇÃO: ${evolutionParagraph(form)}`);
  L.push("");
  L.push("AO EXAME FÍSICO:");
  L.push(`${e.general.trim().replace(/\.$/, "")}.`);
  L.push(`AR: ${e.ar.trim()}, SATO2: ${v.spo2 ? `${v.spo2}%` : ""}`);
  L.push(`ACV: ${e.acv.trim()}, PA: ${v.paSystolic || v.paDiastolic ? `${v.paSystolic}X${v.paDiastolic} ` : ""}MMHG, FC: ${v.fc ? `${v.fc} ` : ""}BPM`);
  L.push(`MAMAS: ${e.breasts.trim()}`);
  L.push(
    `ABD: ${e.abdomen.trim()}, ÚTERO ${e.uterus === "contraido" ? "CONTRAÍDO" : "HIPOTÔNICO"} ${e.fundusCm.trim() && e.fundus !== "cicatriz" ? `${e.fundusCm.trim()} CM ` : ""}${FUNDUS[e.fundus]}`.replace(/\s+/g, " "),
  );
  if (delivery.type === "cesarea") L.push(`FO: ${e.wound.trim()}`);
  L.push(`GINECOLÓGICO: ${e.gyneco.trim().replace(/\.$/, "")}. LOQUIAÇÃO ${e.lochiaType.toUpperCase()} ${LOCHIA_AMOUNT[e.lochiaAmount]} EM FRALDA`);
  L.push(`MEMBROS: ${e.limbs.trim().replace(/\.$/, "")}.`);
  L.push("");
  L.push("PARÂMETROS DA ENFERMAGEM");
  L.push(form.nursingParams.trim() || "PAS: / PAD: / FC: / TAX: ºC");
  L.push("");
  L.push("PARÂMETROS DA EQUIPE DE GO");
  L.push(`PAS: ${v.paSystolic} / PAD: ${v.paDiastolic}${v.fc ? ` / FC: ${v.fc}` : ""}${v.tax ? ` / TAX: ${v.tax.replace(".", ",")}ºC` : ""}`);
  L.push("");
  L.push(`EXAMES LABORATORIAIS: ${form.labs.trim()}`);
  L.push("");
  L.push(`HD: ${puerperioHdLine(delivery, form.date)}`);
  for (const l of form.hdExtra.split("\n").map((x) => x.trim()).filter(Boolean)) L.push(`- ${l.replace(/^-\s*/, "")}`);
  for (const p of PLAN_ITEMS) {
    if (!form.plan[p.id]) continue;
    if (p.id === "contracepcao" && form.contraceptionNote.trim())
      L.push(`- ${p.text} - ${form.contraceptionNote.trim()}`);
    else L.push(`- ${p.text}`);
  }
  for (const l of form.planExtra.split("\n").map((x) => x.trim()).filter(Boolean)) L.push(`- ${l.replace(/^-\s*/, "")}`);
  L.push("");
  const who = form.preceptor.trim();
  if (form.mode === "alta") {
    L.push(`CD: DISCUTIDA COM ${who || "DR(A)"}, QUE ORIENTA:`);
    const lines = dischargeLines(delivery, form);
    lines.forEach((l, i) => L.push(`- ${l}${i < lines.length - 1 ? ";" : ""}`));
  } else {
    L.push(`CD: DISCUTIDA COM ${who || "DR(A)"} QUE ORIENTA:`);
    for (const l of form.conduct.split("\n").map((x) => x.trim()).filter(Boolean)) L.push(`- ${l.replace(/^-\s*/, "")}`);
  }

  return L.join("\n").replace(/\n{3,}/g, "\n\n").trim().toUpperCase();
}
