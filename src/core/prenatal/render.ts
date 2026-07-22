/**
 * Monta o texto do prontuário da consulta de PRÉ-NATAL no formato do MODELO
 * (AMBULATÓRIO DE PRÉ-NATAL — HC-UFTM). Saída em MAIÚSCULAS, mantendo os rótulos
 * mesmo quando vazios (como o modelo).
 *
 * Reaproveita os módulos de domínio do PSGO: paridade, datação (ACOG CO-700),
 * comorbidades/IMC, medicamentos, sorologias e exames de imagem (Hadlock/FMF).
 */
import type { PrenatalForm } from "./types";
import { formatParity, formatCesareans } from "@/core/psgo/parity";
import { resolvePsgoDating, resolveDatingContext, withAutoGa, refFromISO } from "@/core/psgo/dating";
import { autoComorbidities, classifyBmi } from "@/core/psgo/comorbidities";
import { formatCurrentMedication, formatPastMedication } from "@/core/psgo/medications";
import { renderSerologies } from "@/core/psgo/serology";
import { renderImaging } from "@/core/psgo/imaging";
import { renderGyneco } from "@/core/psgo/gyneco-exam";
import { sortDatedText } from "@/core/psgo/dated-lines";
import { parseDecimal } from "@/lib/num";
import { prenatalExamDef, buildPrenatalExamLine } from "./exam";
import { renderVaccineCard } from "./vaccines";
import { renderPrenatalContext } from "./context";

function dateBR(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
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

/**
 * HD (hipótese diagnóstica) automática: "GESTAÇÃO DE {IG} ({método})" com as
 * comorbidades e sinalizadores (adolescente < 18; pré-natal irregular).
 */
export function prenatalHd(form: PrenatalForm): string {
  const parity = formatParity(form.priorPregnancies, true);
  const dating = resolvePsgoDating(
    {
      lmp: form.lmp,
      lmpUncertain: form.lmpUncertain,
      usgExams: form.imagingExams,
      preference: form.datingPreference,
    },
    refFromISO(form.date),
  );
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
  const flags: string[] = [];
  if (!Number.isNaN(ageNum) && ageNum < 18) flags.push("ADOLESCENTE");
  if (form.prenatalIrregular) flags.push("PRN IRREGULAR");
  const diagnoses = dedup([...cmb, ...flags]);

  const gaPart = dating.gaPhrase ? `GESTAÇÃO DE ${dating.gaPhrase}` : "GESTAÇÃO DE";
  const method = dating.methodTag ? ` (${dating.methodTag})` : "";
  const extra = diagnoses.length > 0 ? ` + ${diagnoses.join(" + ")}` : "";
  return `${gaPart}${method}${extra}`;
}

export function renderPrenatal(form: PrenatalForm): string {
  const parity = formatParity(form.priorPregnancies, true);
  const dating = resolvePsgoDating(
    {
      lmp: form.lmp,
      lmpUncertain: form.lmpUncertain,
      usgExams: form.imagingExams,
      preference: form.datingPreference,
    },
    refFromISO(form.date),
  );
  const weight = parseDecimal(form.weight);
  const height = parseDecimal(form.height);
  const bmi = classifyBmi(weight, height);

  // Cada bloco carrega o nº de linhas em branco que o segue (`gap`): 1 nas
  // seções de dados, 2 nas seções clínicas de texto livre.
  const blocks: { lines: string[]; gap: number }[] = [];
  const push = (gap: number, ...lines: string[]) => blocks.push({ lines, gap });

  // Cabeçalho
  push(1, `## AMBULATÓRIO DE PRÉ-NATAL - ${dateBR(form.date)} ##`);

  // Identificação (o acompanhante vai na HPMA, como no PSGO)
  push(
    1,
    `${form.name}${form.socialName ? ` (NOME SOCIAL: ${form.socialName})` : ""}, RG ${form.rg}`,
    `${form.age}${form.age.trim() ? " ANOS" : ""}, PROCEDENTE DE ${form.origin}`,
  );

  // Acompanhamento pré-natal
  const prenatalDetail = [form.prenatalPlace, form.prenatalIrregular ? "PRN IRREGULAR" : ""]
    .filter(Boolean)
    .join(", ");
  push(
    1,
    `CONSULTAS PRÉ-NATAL: ${form.prenatalCount}${prenatalDetail ? ` - ${prenatalDetail}` : ""}`,
  );

  // Paridade (GPA)
  push(1, `PARIDADE: ${parity.summary}`, ...parity.lines);

  // Datação
  push(1, dating.dumLine ?? "DUM:", dating.igUsLine ?? "IG US:");

  // Tipo sanguíneo / Coombs indireto
  const ci = (form.coombsList ?? [])
    .filter((c) => c.result)
    .map((c) => `${c.result === "pos" ? "POSITIVO" : "NEGATIVO"}${c.date ? ` EM ${dateBR(c.date)}` : ""}`)
    .join(" / ");
  push(1, `TS: ${form.bloodType}`, `COOMBS INDIRETO: ${ci}`);

  // Comorbidades + medicamentos + cirurgias / alergias / hábitos (bloco único)
  const cmb = dedup([
    ...form.comorbidities,
    ...splitOther(form.comorbiditiesOther),
    ...autoComorbidities({ weightKg: weight, heightM: height, cesareanCount: parity.cesareanCount }),
  ]);
  const meu = dedup([
    ...form.medications.filter((m) => m.current).map(formatCurrentMedication),
    ...splitOther(form.medicationsOther),
  ]);
  const fezUso = dedup([
    ...form.medications.filter((m) => !m.current).map(formatPastMedication),
    ...splitOther(form.medicationsPast),
  ]);
  const cesareanText = formatCesareans(form.priorPregnancies);
  const surgeriesText = form.surgeriesDenied
    ? cesareanText || "NEGA"
    : [cesareanText, form.surgeries.trim()].filter(Boolean).join(", ");
  const allergiesText = form.allergiesDenied ? "NEGA" : form.allergies;
  const habitsList = form.habits.map((h) =>
    h === "UDI" && (form.udiWhich ?? "").trim() ? `UDI (${form.udiWhich.trim()})` : h,
  );
  // HCV (hábitos): "NEGA" cola a negação padronizada (mantém eventuais outros).
  const hcvText = form.habits.includes("NEGA")
    ? ["NEGA TBG, ALCOOLISMO E UDI", ...splitOther(form.habitsOther)].join(", ")
    : dedup([...habitsList, ...splitOther(form.habitsOther)]).join(", ");
  const MED_INDENT = " ".repeat(10);
  const medsBlock = [`CMB: ${cmb.join(" + ")}`, "MEU:", ...meu.map((m) => `${MED_INDENT}${m}`)];
  if (fezUso.length > 0)
    medsBlock.push("", "FEZ USO:", ...fezUso.map((m) => `${MED_INDENT}${m}`));
  medsBlock.push(
    `CX PRÉVIAS: ${surgeriesText}`,
    `ALERGIAS: ${allergiesText}`,
    `HCV: ${hcvText}`,
  );
  push(1, ...medsBlock);

  // Cartão de vacinas (a IG resolve "pendente" vs. em branco das vacinas com janela)
  push(1, ...renderVaccineCard(form.vaccines, dating.gaWeeks, form.vaccinesOther));

  // VCE (colpocitologia oncótica / Papanicolau) — um ou mais resultados
  const vce = (form.vceList ?? [])
    .map((v) => [v.result.trim(), v.date ? `EM ${dateBR(v.date)}` : ""].filter(Boolean).join(" "))
    .filter(Boolean)
    .join(" / ");
  push(1, `VCE: ${vce}`);

  // Sorologias (colado + quadro externo, ordenado por data)
  const seroBlock = ["SOROLOGIAS:"];
  const serologies = renderSerologies(form.serologyPasted, form.serologyGrid);
  if (serologies.trim()) seroBlock.push(serologies);
  push(2, ...seroBlock);

  // HPMA (revisão dirigida + queixas atuais + acompanhante, como no PSGO)
  const relation =
    form.companionRelation === "OUTRO"
      ? form.companionRelationOther.trim() || "OUTRO"
      : form.companionRelation;
  const companionPhrase = form.companion.trim()
    ? `ACOMPANHADA DE ${form.companion.trim()}${relation ? ` (${relation})` : ""}`
    : "DESACOMPANHADA";
  push(2, `HPMA: ${renderPrenatalContext(form.revision, form.currentComplaints, companionPhrase)}`);

  // Exame físico
  const examBlock = [
    "EXAME FÍSICO:",
    `PESO: ${form.weight} KG // ALTURA: ${form.height} M // IMC: ${bmi ? bmi.imc : ""} KG/M²`,
  ];
  // Sistemas por id (para intercalar o exame ginecológico/obstétrico na ordem do modelo).
  const sysLine = (id: string) => buildPrenatalExamLine(prenatalExamDef(id), form.exam[id], form.vitals);
  // Exame ginecológico/obstétrico clicável (reuso do PSGO): [ABD, TOQUE, ESPECULAR].
  // O ABD do PSGO traz AU/BCF; o modelo do pré-natal inclui a circunferência
  // abdominal (CA) — inserida entre AU e BCF (só no pré-natal, sem alterar o PSGO).
  const gyLines = renderGyneco(form.gyneco, form.vitals, true);
  const abdLine = gyLines[0].replace(", BCF:", `, CA: ${(form.vitals.ca ?? "").trim()} CM, BCF:`);
  const toqueLine = gyLines[1];
  const especularLine = gyLines[2];
  // Ordem do modelo: geral, tireoide, ACV, AR, mamas, ABDOME, vulva, especular, toque, MMII.
  examBlock.push(
    sysLine("geral"),
    sysLine("tireoide"),
    sysLine("acv"),
    sysLine("ar"),
    sysLine("mamas"),
    abdLine,
    sysLine("vulva"),
    especularLine,
    toqueLine,
    sysLine("mmii"),
  );
  push(2, ...examBlock);

  // Laboratoriais (linhas datadas "-(dd/mm/aa): …" em ordem cronológica)
  const labBlock = ["EXAMES LABORATORIAIS:"];
  const labs = sortDatedText(form.labs);
  if (labs.trim()) labBlock.push(labs);
  push(2, ...labBlock);

  // Exames de imagem (USG obstétrico) — a IG dos exames que não datam é
  // automática (pela datação resolvida); o USG de datação mantém a IG digitada.
  const imagingExams = withAutoGa(
    form.imagingExams,
    resolveDatingContext({
      lmp: form.lmp,
      lmpUncertain: form.lmpUncertain,
      usgExams: form.imagingExams,
      preference: form.datingPreference,
    }),
  );
  const imaging = renderImaging(imagingExams, { otherImaging: form.otherImaging });
  if (imaging.trim()) {
    push(2, "EXAMES DE IMAGEM (USG):", imaging);
  } else {
    push(2, "EXAMES DE IMAGEM (ANOTADOS VIDE CARTÃO DE PRÉ-NATAL):");
  }

  // HD — editável; em branco usa a automática (gestação + comorbidades)
  push(1, `HD: ${form.hd.trim() ? form.hd.trim() : prenatalHd(form)}`);

  // Conduta
  {
    const cdLines = [`CONDUTA: ${form.cd.trim() ? form.cd.trim() : "DISCUTIDA"}`];
    push(1, cdLines.join("\n"));
  }

  // Monta o texto aplicando o espaçamento entre blocos.
  const out: string[] = [];
  blocks.forEach((b, i) => {
    out.push(...b.lines);
    if (i < blocks.length - 1) for (let k = 0; k < b.gap; k++) out.push("");
  });
  return out.join("\n").toUpperCase();
}
