/**
 * Colagem da **passagem de plantão**: um bloco por paciente no formato do
 * documento do serviço — **nome + RG em negrito**, e as demais linhas
 * (idade/paridade/TS/Robson, hipóteses, último USG, último laboratorial, última
 * CTG e último toque) prefixadas por "-". Cada característica indisponível é
 * omitida. Gera texto puro e HTML (Calibri 9pt) para colar mantendo o formato.
 */
import type { PsgoForm } from "./types";
import type { ImagingExam } from "./imaging";
import { formatParity } from "./parity";
import { computePsgo, psgoHd } from "./render";
import {
  renderGyneco,
  emptyGynecoState,
  TOQUE_FIELDS,
  TOQUE_DOR_OPTIONS,
  TOQUE_DOR_INDOLOR_KEY,
} from "./gyneco-exam";
import { groupImaging, renderImagingGroup, renderImagingExam } from "./imaging";
import { withAutoGa, resolveDatingContext } from "./dating";
import { multipleGestationPhrase } from "./multiple";
import { ctgLineWithTime, type PsgoCtg } from "./ctg";
import { parseDatedText } from "./dated-lines";

export interface PassagemBlock {
  /** Linha de cabeçalho em negrito: "NOME, RG: XXXX". */
  header: string;
  /** Demais linhas do bloco (já prefixadas por "-"). */
  linhas: string[];
}

const up = (s: string) => s.trim().toUpperCase();

function dateKey(iso?: string): number {
  if (!iso) return Number.NEGATIVE_INFINITY;
  const t = new Date(`${iso}T00:00:00`).getTime();
  return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
}

function examHasData(e: ImagingExam): boolean {
  return !!(
    e.date ||
    e.gaWeeks != null ||
    e.presentation ||
    e.fhr ||
    e.hc ||
    e.ac ||
    e.efw ||
    e.crl ||
    e.gsac ||
    e.yolkSac ||
    e.uaPi ||
    e.mcaPi ||
    e.utPi ||
    e.mbv ||
    e.ila ||
    e.placentaSite ||
    e.overrideText
  );
}

/** Último USG realizado (grupo mais recente por data), já renderizado. */
function lastUsgLine(form: PsgoForm): string {
  const raw = (form.imagingExams ?? []).filter(examHasData);
  if (!raw.length) return "";
  const exams = form.pregnant
    ? withAutoGa(
        form.imagingExams,
        resolveDatingContext({
          lmp: form.lmp,
          lmpUncertain: form.lmpUncertain,
          usgExams: form.imagingExams,
          preference: form.datingPreference,
        }),
      ).filter(examHasData)
    : raw;
  const groups = groupImaging(exams);
  if (!groups.length) return "";
  let best = groups[0];
  for (const g of groups) {
    if (dateKey(g.exams[0].date) >= dateKey(best.exams[0].date)) best = g;
  }
  const multiplePhrase =
    form.pregnant && form.fetuses === "multiple"
      ? multipleGestationPhrase(form.multiplicity, form.chorionAmnion, { withAbbr: false })
      : "";
  return best.exams.length > 1
    ? renderImagingGroup(best.exams, multiplePhrase)
    : renderImagingExam(best.exams[0]);
}

/** Último exame laboratorial (entrada datada mais recente de form.labs). */
function lastLabLine(form: PsgoForm): string {
  const entries = parseDatedText(form.labs);
  if (!entries.length) return "";
  const key = (k: number) => (Number.isFinite(k) ? k : Number.NEGATIVE_INFINITY);
  const sorted = [...entries].sort((a, b) => key(b.sortKey) - key(a.sortKey) || b.order - a.order);
  return sorted[0].text.trim();
}

/** Última CTG realizada (mais recente por data/hora), em uma linha. */
function lastCtgLine(form: PsgoForm): string {
  const list = form.ctgLaudos ?? [];
  if (!list.length) return "";
  const key = (c: PsgoCtg): number => {
    if (!c.date) return Number.NEGATIVE_INFINITY;
    const t = new Date(`${c.date}T${(c.time || "00:00").slice(0, 5)}:00`).getTime();
    return Number.isNaN(t) ? Number.NEGATIVE_INFINITY : t;
  };
  let best = list[0];
  for (const c of list) if (key(c) >= key(best)) best = c;
  return `-${ctgLineWithTime(best)}`;
}

// Chaves do toque para comparar com o padrão (detecta se foi preenchido).
const TOQUE_KEYS = [
  ...TOQUE_FIELDS.map((f) => f.id),
  ...TOQUE_DOR_OPTIONS.map((o) => o.key),
  TOQUE_DOR_INDOLOR_KEY,
];
const TOQUE_DEFAULTS = emptyGynecoState().values;

/** true quando o toque foi de fato preenchido (difere do padrão do formulário). */
function toquePreenchido(form: PsgoForm): boolean {
  if (!form.gyneco.toqueRealizado) return false; // marcado "não realizado"
  const cur = form.gyneco.values;
  return TOQUE_KEYS.some((k) => (cur[k] ?? "") !== (TOQUE_DEFAULTS[k] ?? ""));
}

/** Último toque vaginal — só quando preenchido (não expõe o padrão nem "não realizado"). */
function toqueLine(form: PsgoForm): string {
  if (!toquePreenchido(form)) return "";
  const lines = renderGyneco(form.gyneco, form.vitals, form.pregnant);
  const t = lines.find((l) => l.startsWith("TOQUE VAGINAL"));
  if (!t || t.includes("NÃO REALIZADO")) return "";
  return `-${t}`;
}

/** Monta o bloco de passagem de uma paciente (null se sem nome). */
export function buildPassagemBlock(form: PsgoForm): PassagemBlock | null {
  const nome = up(form.name);
  if (!nome) return null;
  const rg = form.rg.trim();
  const header = rg ? `${nome}, RG: ${rg}` : nome;

  const linhas: string[] = [];

  // Idade, Paridade, tipo sanguíneo e Robson (omite os ausentes).
  const parity = formatParity(form.priorPregnancies, form.pregnant);
  const robson = computePsgo(form).robsonGroup;
  const demog = [
    form.age.trim() ? `${form.age.trim()} ANOS` : "",
    parity.summary || "",
    up(form.bloodType),
    robson != null ? `ROBSON ${robson}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  if (demog) linhas.push(`-${demog}`);

  // Hipóteses diagnósticas.
  const hd = (form.hd.trim() || psgoHd(form)).trim();
  if (hd) linhas.push(`-${up(hd)}`);

  const usg = lastUsgLine(form);
  if (usg) linhas.push(usg);

  const lab = lastLabLine(form);
  if (lab) linhas.push(lab);

  const ctg = lastCtgLine(form);
  if (ctg) linhas.push(ctg);

  const toque = toqueLine(form);
  if (toque) linhas.push(toque);

  return { header, linhas };
}

/** Passagem de várias pacientes em texto puro. */
export function passagemText(blocks: PassagemBlock[]): string {
  return blocks.map((b) => [b.header, ...b.linhas].join("\n")).join("\n\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/**
 * Passagem em HTML (Calibri 9pt, nome+RG em negrito), pronta para colar no
 * documento mantendo o formato. Parágrafos justos (margin:0) e uma linha em
 * branco entre pacientes.
 */
export function passagemHtml(blocks: PassagemBlock[]): string {
  const P = `margin:0;font-family:Calibri,'Segoe UI',sans-serif;font-size:9pt`;
  const parts: string[] = [];
  blocks.forEach((b, i) => {
    if (i > 0) parts.push(`<p style="${P}">&nbsp;</p>`);
    parts.push(`<p style="${P}"><b>${escapeHtml(b.header)}</b></p>`);
    for (const l of b.linhas) parts.push(`<p style="${P}">${escapeHtml(l)}</p>`);
  });
  return `<div style="${P}">${parts.join("")}</div>`;
}
