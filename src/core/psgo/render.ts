/**
 * Monta o texto do prontuário do PSGO no formato do MODELO PS (HC-UFTM).
 * Saída em MAIÚSCULAS, mantendo os rótulos mesmo quando vazios (como o modelo).
 */
import type { PsgoForm } from "./types";
import { formatParity } from "./parity";
import { classifyRobson } from "./robson";
import { resolvePsgoDating } from "./dating";
import { autoComorbidities, classifyBmi } from "./comorbidities";
import { formatMedication } from "./medications";
import { buildExamLine, EXAM_SYSTEMS } from "./exam";
import { renderGyneco } from "./gyneco-exam";
import { renderSerologies } from "./serology";
import { renderImaging } from "./imaging";

function dateBR(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

function splitOther(s?: string): string[] {
  return (s ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

function dedup(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const key = it.trim().toUpperCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(it.trim());
    }
  }
  return out;
}

export interface PsgoComputed {
  robsonGroup: number | null;
  robsonMissing: string[];
}

export function computePsgo(form: PsgoForm): PsgoComputed {
  const parity = formatParity(form.priorPregnancies);
  const dating = resolvePsgoDating({
    lmp: form.lmp,
    lmpUncertain: form.lmpUncertain,
    usgExams: form.imagingExams,
    preference: form.datingPreference,
  });
  const robson = classifyRobson({
    parity: parity.multipara ? "multipara" : "nullipara",
    priorCesarean: parity.cesareanCount >= 1,
    presentation: form.presentation || null,
    fetuses: form.fetuses || null,
    term: dating.term,
    onset: form.laborOnset || null,
  });
  return { robsonGroup: robson.group, robsonMissing: robson.missing };
}

export function renderPsgo(form: PsgoForm): string {
  const L: string[] = [];

  const parity = formatParity(form.priorPregnancies);
  const dating = resolvePsgoDating({
    lmp: form.lmp,
    lmpUncertain: form.lmpUncertain,
    usgExams: form.imagingExams,
    preference: form.datingPreference,
  });
  const weight = form.weight ? Number(form.weight) : null;
  const height = form.height ? Number(form.height) : null;
  const bmi = classifyBmi(weight, height);

  const robson = classifyRobson({
    parity: parity.multipara ? "multipara" : "nullipara",
    priorCesarean: parity.cesareanCount >= 1,
    presentation: form.presentation || null,
    fetuses: form.fetuses || null,
    term: dating.term,
    onset: form.laborOnset || null,
  });

  // Cabeçalho
  L.push(`## PSGO - ${dateBR(form.date)} ##`);

  // Identificação
  const nameLine = `${form.name}${form.socialName ? ` (NOME SOCIAL: ${form.socialName})` : ""}, RG ${form.rg}`;
  L.push(nameLine);
  L.push(`IDADE ${form.age}`);
  L.push(`PROCEDENTE DE ${form.origin}`);
  L.push(
    `ACOMPANHANTE: ${form.companion}${form.companionRelation ? ` (${form.companionRelation})` : ""}`,
  );
  L.push(
    `CONSULTAS PRÉ-NATAL: ${form.prenatalCount}${form.prenatalPlace ? ` - ${form.prenatalPlace}` : ""}`,
  );

  // Robson
  L.push(`CLASSIFICAÇÃO DE ROBSON: ${robson.group ?? ""}`);

  // Paridade
  L.push(`PARIDADE: ${parity.summary}`);
  for (const line of parity.lines) L.push(line);

  // Datação
  L.push(dating.dumLine ?? "DUM:");
  L.push(dating.igUsLine ?? "IG US :");

  // Tipo sanguíneo / Coombs
  L.push(`TIPO SANGUÍNEO: ${form.bloodType}`);
  const ci = form.coombs
    ? `${form.coombs === "pos" ? "POSITIVO" : "NEGATIVO"}${form.coombsDate ? ` EM ${dateBR(form.coombsDate)}` : ""}`
    : "";
  L.push(`CI: ${ci}`);

  // Comorbidades (selecionadas + outras + automáticas)
  const cmb = dedup([
    ...form.comorbidities,
    ...splitOther(form.comorbiditiesOther),
    ...autoComorbidities({ weightKg: weight, heightM: height, cesareanCount: parity.cesareanCount }),
  ]);
  L.push(`CMB: ${cmb.join(" + ")}`);

  // Medicamentos em uso
  const meu = dedup([
    ...form.medications.map(formatMedication),
    ...splitOther(form.medicationsOther),
  ]);
  L.push(`MEU: ${meu.join(", ")}`);

  // Cirurgias / alergias / hábitos
  L.push(`CIRURGIAS: ${form.surgeries}`);
  L.push(`ALERGIAS: ${form.allergies}`);
  const hcv = dedup([...form.habits, ...splitOther(form.habitsOther)]);
  L.push(`HCV: ${hcv.join(", ")}`);

  // Sorologias (colado + quadro externo, ordenado por data)
  L.push("SOROLOGIAS");
  const serologies = renderSerologies(form.serologyPasted, form.serologyGrid);
  if (serologies.trim()) L.push(serologies);

  // Queixa / história
  L.push(`QP: ${form.qp}`);
  L.push(`HPMA: ${form.hpma}`);

  // Exame físico
  L.push("AO EXAME FÍSICO:");
  L.push(
    `PESO: ${form.weight} KG // ALTURA: ${form.height} M // IMC: ${bmi ? bmi.imc : ""} KG/M²`,
  );
  for (const s of EXAM_SYSTEMS) {
    // Exame ginecológico/obstétrico (ABD, toque, especular) antes de MMII.
    if (s.id === "mmii") {
      for (const line of renderGyneco(form.gyneco, form.vitals)) L.push(line);
    }
    L.push(buildExamLine(s.id, form.exam[s.id], form.vitals));
  }

  // Laboratoriais
  L.push("EXAMES LABORATORIAIS:");
  if (form.labs.trim()) L.push(form.labs.trim());

  // Exames de imagem (seção própria, em quadro)
  const imaging = renderImaging(form.imagingExams);
  if (imaging.trim()) {
    L.push("EXAMES DE IMAGEM (USG):");
    L.push(imaging);
  } else {
    L.push("EXAMES DE IMAGEM (ANOTADOS VIDE CARTÃO DE PRÉ-NATAL):");
  }

  // CTG
  L.push(`CTG: ${form.ctg}`);

  // HD
  const gaPart = dating.gaPhrase ? `GESTAÇÃO DE ${dating.gaPhrase}` : "GESTAÇÃO DE";
  const method = dating.methodTag ? ` (${dating.methodTag})` : "";
  const hdComorb = cmb.length > 0 ? ` + ${cmb.join(" + ")}` : "";
  L.push(`HD: ${gaPart}${method}${hdComorb}`);

  // Conduta
  L.push(`CD: ${form.cd ? `${form.cd} ` : ""}DISCUTIDO COM PLANTÃO QUE ORIENTA:`);

  return L.join("\n").toUpperCase();
}
