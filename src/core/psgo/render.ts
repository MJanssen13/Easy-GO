/**
 * Monta o texto do prontuário do PSGO no formato do MODELO PS (HC-UFTM).
 * Saída em MAIÚSCULAS, mantendo os rótulos mesmo quando vazios (como o modelo).
 */
import type { PsgoForm } from "./types";
import { formatParity } from "./parity";
import { classifyRobson } from "./robson";
import { resolvePsgoDating } from "./dating";
import { autoComorbidities, classifyBmi } from "./comorbidities";
import { formatPastMedication } from "./medications";
import { buildExamLine, EXAM_SYSTEMS } from "./exam";
import { renderGyneco } from "./gyneco-exam";
import { renderSerologies } from "./serology";
import { renderImaging } from "./imaging";
import { renderPsgoCtg } from "./ctg";
import { parseDecimal } from "@/lib/num";

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
  // Robson classifica o parto da gestação atual — não se aplica a não gestantes.
  if (!form.pregnant) return { robsonGroup: null, robsonMissing: [] };
  const parity = formatParity(form.priorPregnancies, form.pregnant);
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

  const parity = formatParity(form.priorPregnancies, form.pregnant);
  const dating = resolvePsgoDating({
    lmp: form.lmp,
    lmpUncertain: form.lmpUncertain,
    usgExams: form.imagingExams,
    preference: form.datingPreference,
  });
  const weight = parseDecimal(form.weight);
  const height = parseDecimal(form.height);
  const bmi = classifyBmi(weight, height);

  // Cabeçalho
  L.push(`## PSGO - ${dateBR(form.date)} ##`);

  // Identificação
  const nameLine = `${form.name}${form.socialName ? ` (NOME SOCIAL: ${form.socialName})` : ""}, RG ${form.rg}`;
  L.push(nameLine);
  L.push(`IDADE ${form.age}`);
  L.push(`PROCEDENTE DE ${form.origin}`);
  const relation =
    form.companionRelation === "OUTRO"
      ? form.companionRelationOther.trim() || "OUTRO"
      : form.companionRelation;
  L.push(
    `ACOMPANHANTE: ${form.companion}${relation ? ` (${relation})` : ""}`,
  );

  if (form.pregnant) {
    const prenatalDetail = [
      form.prenatalPlace,
      form.prenatalIrregular ? "PRN IRREGULAR" : "",
    ]
      .filter(Boolean)
      .join(", ");
    L.push(
      `CONSULTAS PRÉ-NATAL: ${form.prenatalCount}${prenatalDetail ? ` - ${prenatalDetail}` : ""}`,
    );

    // Robson
    const robson = classifyRobson({
      parity: parity.multipara ? "multipara" : "nullipara",
      priorCesarean: parity.cesareanCount >= 1,
      presentation: form.presentation || null,
      fetuses: form.fetuses || null,
      term: dating.term,
      onset: form.laborOnset || null,
    });
    L.push(`CLASSIFICAÇÃO DE ROBSON: ${robson.group ?? ""}`);
  } else {
    L.push("NÃO GESTANTE NO MOMENTO");
  }

  // Paridade
  L.push(`PARIDADE: ${parity.summary}`);
  for (const line of parity.lines) L.push(line);

  // Datação (para não gestantes registra-se apenas a DUM, sem IG)
  if (form.pregnant) {
    L.push(dating.dumLine ?? "DUM:");
    L.push(dating.igUsLine ?? "IG US :");
  } else {
    L.push(`DUM: ${dateBR(form.lmp)}`);
  }

  // Tipo sanguíneo / Coombs (um ou mais CI, com datas)
  L.push(`TIPO SANGUÍNEO: ${form.bloodType}`);
  const ci = (form.coombsList ?? [])
    .filter((c) => c.result)
    .map((c) => `${c.result === "pos" ? "POSITIVO" : "NEGATIVO"}${c.date ? ` EM ${dateBR(c.date)}` : ""}`)
    .join(" / ");
  L.push(`CI: ${ci}`);

  // Comorbidades (selecionadas + outras + automáticas)
  const cmb = dedup([
    ...form.comorbidities,
    ...splitOther(form.comorbiditiesOther),
    ...autoComorbidities({ weightKg: weight, heightM: height, cesareanCount: parity.cesareanCount }),
  ]);
  L.push(`CMB: ${cmb.join(" + ")}`);

  // Medicamentos em uso (um por linha); depois FEZ USO (um por linha), se houver
  const meu = dedup([
    ...form.medications.filter((m) => m.current).map((m) => m.label),
    ...splitOther(form.medicationsOther),
  ]);
  const fezUso = dedup([
    ...form.medications.filter((m) => !m.current).map(formatPastMedication),
    ...splitOther(form.medicationsPast),
  ]);
  L.push("MEU:");
  for (const m of meu) L.push(m);
  if (fezUso.length > 0) {
    L.push("");
    L.push("FEZ USO:");
    for (const m of fezUso) L.push(m);
  }

  // Cirurgias / alergias / hábitos
  L.push(`CIRURGIAS: ${form.surgeries}`);
  L.push(`ALERGIAS: ${form.allergies}`);
  const habitsList = form.habits.map((h) =>
    h === "UDI" && (form.udiWhich ?? "").trim() ? `UDI (${form.udiWhich.trim()})` : h,
  );
  const hcv = dedup([...habitsList, ...splitOther(form.habitsOther)]);
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
      for (const line of renderGyneco(form.gyneco, form.vitals, form.pregnant)) L.push(line);
    }
    L.push(buildExamLine(s.id, form.exam[s.id], form.vitals));
  }

  // Laboratoriais
  L.push("EXAMES LABORATORIAIS:");
  if (form.labs.trim()) L.push(form.labs.trim());

  // Exames de imagem (seção própria, em quadro; o quadro USG é obstétrico)
  const imaging = form.pregnant ? renderImaging(form.imagingExams) : "";
  if (imaging.trim()) {
    L.push("EXAMES DE IMAGEM (USG):");
    L.push(imaging);
  } else {
    L.push(form.pregnant ? "EXAMES DE IMAGEM (ANOTADOS VIDE CARTÃO DE PRÉ-NATAL):" : "EXAMES DE IMAGEM:");
  }

  // CTG (monitorização fetal — só para gestantes): laudo estruturado ou legado
  if (form.pregnant) {
    const ctgLine = form.ctgLaudo?.done ? renderPsgoCtg(form.ctgLaudo) : form.ctg.trim();
    L.push(`CTG: ${ctgLine}`);
  }

  // HD — comorbidades + diagnósticos automáticos (adolescente < 18; PRN irregular)
  const ageNum = form.age ? Number(form.age) : NaN;
  const hdFlags: string[] = [];
  if (!Number.isNaN(ageNum) && ageNum < 18) hdFlags.push("ADOLESCENTE");
  if (form.pregnant && form.prenatalIrregular) hdFlags.push("PRN IRREGULAR");
  const hdDiagnoses = dedup([...cmb, ...hdFlags]);

  if (form.pregnant) {
    const gaPart = dating.gaPhrase ? `GESTAÇÃO DE ${dating.gaPhrase}` : "GESTAÇÃO DE";
    const method = dating.methodTag ? ` (${dating.methodTag})` : "";
    const hdExtra = hdDiagnoses.length > 0 ? ` + ${hdDiagnoses.join(" + ")}` : "";
    L.push(`HD: ${gaPart}${method}${hdExtra}`);
  } else {
    L.push(`HD: ${hdDiagnoses.join(" + ")}`);
  }

  // Conduta
  L.push(`CD: ${form.cd ? `${form.cd} ` : ""}DISCUTIDO COM PLANTÃO QUE ORIENTA:`);

  return L.join("\n").toUpperCase();
}
