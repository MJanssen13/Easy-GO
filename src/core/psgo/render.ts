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
import { renderPsgoCtgs } from "./ctg";
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

/**
 * Monta a HD (hipótese diagnóstica) do PSGO, sem o prefixo "HD:". Para
 * gestantes: "GESTAÇÃO DE {IG} ({método})" + comorbidades e diagnósticos
 * automáticos (adolescente < 18; PRN irregular). Caso contrário, apenas a lista
 * de diagnósticos. Reaproveitado pelo laudo impresso da CTG.
 */
export function psgoHd(form: PsgoForm): string {
  const parity = formatParity(form.priorPregnancies, form.pregnant);
  const dating = resolvePsgoDating({
    lmp: form.lmp,
    lmpUncertain: form.lmpUncertain,
    usgExams: form.imagingExams,
    preference: form.datingPreference,
  });
  const cmb = dedup([
    ...form.comorbidities,
    ...splitOther(form.comorbiditiesOther),
    ...autoComorbidities({
      weightKg: parseDecimal(form.weight),
      heightM: parseDecimal(form.height),
      cesareanCount: parity.cesareanCount,
    }),
  ]);
  const ageNum = form.age ? Number(form.age) : NaN;
  const hdFlags: string[] = [];
  if (!Number.isNaN(ageNum) && ageNum < 18) hdFlags.push("ADOLESCENTE");
  if (form.pregnant && form.prenatalIrregular) hdFlags.push("PRN IRREGULAR");
  const hdDiagnoses = dedup([...cmb, ...hdFlags]);

  if (form.pregnant) {
    const gaPart = dating.gaPhrase ? `GESTAÇÃO DE ${dating.gaPhrase}` : "GESTAÇÃO DE";
    const method = dating.methodTag ? ` (${dating.methodTag})` : "";
    const hdExtra = hdDiagnoses.length > 0 ? ` + ${hdDiagnoses.join(" + ")}` : "";
    return `${gaPart}${method}${hdExtra}`;
  }
  return hdDiagnoses.join(" + ");
}

export function renderPsgo(form: PsgoForm): string {
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

  // Cada bloco carrega o nº de linhas em branco que o segue (`gap`): 1 nas
  // seções de dados, 2 nas seções clínicas de texto livre — o espaçamento do
  // MODELO PS. O último bloco não recebe espaço ao final.
  const blocks: { lines: string[]; gap: number }[] = [];
  const push = (gap: number, ...lines: string[]) => blocks.push({ lines, gap });

  // Cabeçalho
  push(1, `## PSGO - ${dateBR(form.date)} ##`);

  // Identificação
  const relation =
    form.companionRelation === "OUTRO"
      ? form.companionRelationOther.trim() || "OUTRO"
      : form.companionRelation;
  push(
    1,
    `${form.name}${form.socialName ? ` (NOME SOCIAL: ${form.socialName})` : ""}, RG ${form.rg}`,
    `IDADE ${form.age}`,
    `PROCEDENTE DE ${form.origin}`,
    `ACOMPANHANTE: ${form.companion}${relation ? ` (${relation})` : ""}`,
  );

  if (form.pregnant) {
    const prenatalDetail = [form.prenatalPlace, form.prenatalIrregular ? "PRN IRREGULAR" : ""]
      .filter(Boolean)
      .join(", ");
    push(
      1,
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
    push(1, `CLASSIFICAÇÃO DE ROBSON: ${robson.group ?? ""}`);
  } else {
    push(1, "NÃO GESTANTE NO MOMENTO");
  }

  // Paridade
  push(1, `PARIDADE: ${parity.summary}`, ...parity.lines);

  // Datação (para não gestantes registra-se apenas a DUM, sem IG)
  if (form.pregnant) {
    push(1, dating.dumLine ?? "DUM:", dating.igUsLine ?? "IG US :");
  } else {
    push(1, `DUM: ${dateBR(form.lmp)}`);
  }

  // Tipo sanguíneo / Coombs (um ou mais CI, com datas)
  const ci = (form.coombsList ?? [])
    .filter((c) => c.result)
    .map((c) => `${c.result === "pos" ? "POSITIVO" : "NEGATIVO"}${c.date ? ` EM ${dateBR(c.date)}` : ""}`)
    .join(" / ");
  push(1, `TIPO SANGUÍNEO: ${form.bloodType}`, `CI: ${ci}`);

  // Comorbidades + medicamentos + cirurgias / alergias / hábitos (bloco único)
  const cmb = dedup([
    ...form.comorbidities,
    ...splitOther(form.comorbiditiesOther),
    ...autoComorbidities({ weightKg: weight, heightM: height, cesareanCount: parity.cesareanCount }),
  ]);
  const meu = dedup([
    ...form.medications.filter((m) => m.current).map((m) => m.label),
    ...splitOther(form.medicationsOther),
  ]);
  const fezUso = dedup([
    ...form.medications.filter((m) => !m.current).map(formatPastMedication),
    ...splitOther(form.medicationsPast),
  ]);
  const habitsList = form.habits.map((h) =>
    h === "UDI" && (form.udiWhich ?? "").trim() ? `UDI (${form.udiWhich.trim()})` : h,
  );
  const hcv = dedup([...habitsList, ...splitOther(form.habitsOther)]);
  const medsBlock = [`CMB: ${cmb.join(" + ")}`, "MEU:", ...meu];
  if (fezUso.length > 0) medsBlock.push("", "FEZ USO:", ...fezUso);
  medsBlock.push(
    `CIRURGIAS: ${form.surgeries}`,
    `ALERGIAS: ${form.allergies}`,
    `HCV: ${hcv.join(", ")}`,
  );
  push(1, ...medsBlock);

  // Sorologias (colado + quadro externo, ordenado por data)
  const seroBlock = ["SOROLOGIAS"];
  const serologies = renderSerologies(form.serologyPasted, form.serologyGrid);
  if (serologies.trim()) seroBlock.push(serologies);
  push(2, ...seroBlock);

  // Queixa / história
  push(2, `QP: ${form.qp}`, `HPMA: ${form.hpma}`);

  // Exame físico
  const examBlock = [
    "AO EXAME FÍSICO:",
    `PESO: ${form.weight} KG // ALTURA: ${form.height} M // IMC: ${bmi ? bmi.imc : ""} KG/M²`,
  ];
  for (const s of EXAM_SYSTEMS) {
    // Exame ginecológico/obstétrico (ABD, toque, especular) antes de MMII.
    if (s.id === "mmii") {
      for (const line of renderGyneco(form.gyneco, form.vitals, form.pregnant)) examBlock.push(line);
    }
    examBlock.push(buildExamLine(s.id, form.exam[s.id], form.vitals));
  }
  push(2, ...examBlock);

  // Laboratoriais
  const labBlock = ["EXAMES LABORATORIAIS:"];
  if (form.labs.trim()) labBlock.push(form.labs.trim());
  push(2, ...labBlock);

  // Exames de imagem (seção própria, em quadro; o quadro USG é obstétrico)
  const imaging = form.pregnant ? renderImaging(form.imagingExams) : "";
  if (imaging.trim()) {
    push(2, "EXAMES DE IMAGEM (USG):", imaging);
  } else {
    push(
      2,
      form.pregnant ? "EXAMES DE IMAGEM (ANOTADOS VIDE CARTÃO DE PRÉ-NATAL):" : "EXAMES DE IMAGEM:",
    );
  }

  // CTG (monitorização fetal — só gestantes): omitida se nenhuma foi realizada.
  if (form.pregnant) {
    const ctgBlock = renderPsgoCtgs(form.ctgLaudos ?? []);
    if (ctgBlock) push(2, ctgBlock);
  }

  // HD — gestação (IG) + comorbidades + diagnósticos automáticos
  push(1, `HD: ${psgoHd(form)}`);

  // Conduta
  push(1, `CD: ${form.cd ? `${form.cd} ` : ""}DISCUTIDO COM PLANTÃO QUE ORIENTA:`);

  // Monta o texto aplicando o espaçamento entre blocos.
  const out: string[] = [];
  blocks.forEach((b, i) => {
    out.push(...b.lines);
    if (i < blocks.length - 1) for (let k = 0; k < b.gap; k++) out.push("");
  });
  return out.join("\n").toUpperCase();
}
