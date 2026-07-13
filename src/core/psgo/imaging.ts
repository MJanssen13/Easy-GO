/**
 * Exames de imagem (USG obstétrico) do PSGO. Seção própria, em quadro: cada
 * exame tem IG própria e a plataforma calcula os percentis de CC/PESO/CA
 * (Hadlock) e da tríade Doppler do CIUR (IP-AUmb, IP-ACM, RCP — FMF/Ciobanu).
 *
 * Linha do prontuário (MODELO PS); exames externos levam "EXT" após a data:
 *   - (DATA [EXT]): GESTAÇÃO DE XX SEM E Y DIAS / APRESENTAÇÃO / CC: (P X) /
 *    CA: (P X) / PFE (P X) / MBV CM / ILA CM / BCF BPM / PLAC INSERÇÃO GRAU /
 *    IP AUMB (P X) / IP ACM (P X) / RCP (P X) / IP A. UTERINA (P X)
 */
import {
  efwCentile,
  acCentile,
  hcCentile,
  expectedAc,
  expectedHc,
} from "@/core/fmf/biometry";
import { uaPiCentile, mcaPiCentile, cprCentile, cprValue } from "@/core/fmf/cpr";
import { utPiCentile } from "@/core/fmf/uterine";
import { formatCentile, formatCentileCeil } from "@/core/fmf/centile";
import { parseDecimal } from "@/lib/num";
import { parseDatedText } from "./dated-lines";

export interface ImagingExam {
  id: string;
  date?: string;
  gaWeeks?: number;
  gaDays?: number;
  useForDating?: boolean; // USG escolhido para datação
  /** Gestação múltipla: fetos do mesmo USG compartilham `groupId` (e a data). */
  groupId?: string;
  /** Índice do feto no grupo (1..N), para "FETO 1/2/3". */
  fetusIndex?: number;
  external?: boolean; // exame externo (feito fora do serviço) — sai "EXT" na data
  presentation?: string; // APRESENTAÇÃO (cefálica/pélvica/córmica)
  gsac?: string; // SG — saco gestacional (mm)
  yolkSac?: string; // VV — vesícula vitelínica (mm)
  fhr?: string; // BCF — batimentos cardíacos fetais (bpm) ou "AUSENTE"
  hc?: string; // CC — circunferência cefálica (mm)
  efw?: string; // PESO — PFE (g)
  ac?: string; // CIRC. ABDOMINAL (mm)
  placentaSite?: string; // inserção (anterior/posterior/fúndica/prévia…)
  placentaGrade?: string; // grau (0/I/II/III)
  mbv?: string; // maior bolsão vertical (cm)
  ila?: string; // ILA — índice de líquido amniótico (cm)
  uaPi?: string; // IP AUMB — IP da artéria umbilical
  mcaPi?: string; // IP ACM — IP da artéria cerebral média
  utPi?: string; // IP A. UTERINA (média) — IP das artérias uterinas
  crl?: string; // CCN — comprimento cabeça-nádega (mm)
  notes?: string;
  /**
   * Texto do laudo do exame editado manualmente. Quando presente (não vazio),
   * substitui a linha gerada automaticamente — permite observações/correções.
   */
  overrideText?: string;
}

export function examGaDays(e: Pick<ImagingExam, "gaWeeks" | "gaDays">): number | null {
  if (e.gaWeeks == null) return null;
  return e.gaWeeks * 7 + (e.gaDays ?? 0);
}

function num(s?: string): number | null {
  return parseDecimal(s);
}

function pctSuffix(c: number | null): string {
  const f = formatCentile(c);
  return f ? ` (P ${f})` : "";
}

/** Sufixo de percentil das medidas de padrão FMF (centil arredondado p/ cima). */
function pctSuffixFmf(c: number | null): string {
  const f = formatCentileCeil(c);
  return f ? ` (P ${f})` : "";
}

function dateBR(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/** IG do exame sem "GESTAÇÃO DE", ex.: "32 SEM E 1 DIA". */
function gaText(e: Pick<ImagingExam, "gaWeeks" | "gaDays">): string {
  if (e.gaWeeks == null) return "";
  const d = e.gaDays ?? 0;
  return `${e.gaWeeks} SEM E ${d} ${d === 1 ? "DIA" : "DIAS"}`;
}

/** IG do exame por extenso, ex.: "GESTAÇÃO DE 32 SEM E 1 DIA". */
function igPhrase(e: ImagingExam): string {
  const ga = gaText(e);
  return ga ? `GESTAÇÃO DE ${ga}` : "";
}

const PRESENTATION_ABBR: Record<string, string> = {
  CEFÁLICA: "CEF",
  PÉLVICA: "PELV",
  CÓRMICA: "CORM",
};
/** Abreviação da apresentação (CEF/PELV/CORM); desconhecidas ficam como estão. */
function presentationAbbr(p: string): string {
  return PRESENTATION_ABBR[p.trim().toUpperCase()] ?? p;
}

const PLACENTA_ABBR: Record<string, string> = {
  ANTERIOR: "ANT",
  POSTERIOR: "POST",
  FÚNDICA: "FÚND",
  "LATERAL DIREITA": "LAT DIR",
  "LATERAL ESQUERDA": "LAT ESQ",
  PRÉVIA: "PRÉVIA",
};
/** Abreviação da inserção placentária (ANT/POST/FÚND/…). */
function placentaAbbr(s: string): string {
  return PLACENTA_ABBR[s.trim().toUpperCase()] ?? s;
}

/** RCP (valor) calculado a partir de IP-ACM / IP-AUmb. */
export function examCpr(e: ImagingExam): number | null {
  return cprValue(num(e.mcaPi), num(e.uaPi));
}

export interface ImagingCentiles {
  hc: string; // percentil da CC (Hadlock 1984)
  efw: string; // "P 50" ou ""
  ac: string;
  uaPi: string;
  mcaPi: string;
  cpr: string;
  utPi: string; // percentil do IP da artéria uterina (pela FMF)
}

/** Rótulos de percentil ("P X") de cada medida do exame, para exibição no quadro. */
export function examCentiles(e: ImagingExam): ImagingCentiles {
  const gaDays = examGaDays(e);
  // Biometria (Perinatology/Fetal Biometry 3.1): centil arredondado. IP de
  // padrão FMF (Doppler/uterina): centil arredondado PARA CIMA, como no site
  // oficial (fetalmedicine.org).
  const lab = (c: number | null) => {
    const f = formatCentile(c);
    return f ? `P ${f}` : "";
  };
  const labFmf = (c: number | null) => {
    const f = formatCentileCeil(c);
    return f ? `P ${f}` : "";
  };
  const hc = num(e.hc);
  const efw = num(e.efw);
  const ac = num(e.ac);
  const uaPi = num(e.uaPi);
  const mcaPi = num(e.mcaPi);
  const cpr = examCpr(e);
  const utPi = num(e.utPi);
  return {
    hc: gaDays != null && hc != null ? lab(hcCentile(hc, gaDays)) : "",
    efw: gaDays != null && efw != null ? lab(efwCentile(efw, gaDays)) : "",
    ac: gaDays != null && ac != null ? lab(acCentile(ac, gaDays)) : "",
    uaPi: gaDays != null && uaPi != null ? labFmf(uaPiCentile(uaPi, gaDays)) : "",
    mcaPi: gaDays != null && mcaPi != null ? labFmf(mcaPiCentile(mcaPi, gaDays)) : "",
    cpr: gaDays != null && cpr != null ? labFmf(cprCentile(cpr, gaDays)) : "",
    utPi: gaDays != null && utPi != null ? labFmf(utPiCentile(utPi, gaDays)) : "",
  };
}

export function hasImagingData(e: ImagingExam): boolean {
  return Boolean(
    e.overrideText?.trim() ||
      e.date ||
      e.gsac ||
      e.yolkSac ||
      e.fhr ||
      e.hc ||
      e.efw ||
      e.ac ||
      e.uaPi ||
      e.mcaPi ||
      e.mbv ||
      e.ila ||
      e.utPi ||
      e.crl ||
      e.placentaSite ||
      e.placentaGrade ||
      e.presentation ||
      e.notes,
  );
}

/**
 * Campos do laudo (sem a IG): apresentação, biometria, líquido, BCF, placenta,
 * Doppler e observações. Reusado por gestação única e por cada feto (múltipla).
 */
export function imagingFields(e: ImagingExam): string[] {
  const gaDays = examGaDays(e);
  const fields: string[] = [];

  if (e.presentation) fields.push(presentationAbbr(e.presentation));

  // Gestações iniciais (nem todos presentes no mesmo US).
  const crl = num(e.crl);
  if (crl != null) fields.push(`CCN ${e.crl} mm`);

  const gsac = num(e.gsac);
  if (gsac != null) fields.push(`SG ${e.gsac} mm`);

  const yolkSac = num(e.yolkSac);
  if (yolkSac != null) fields.push(`VV ${e.yolkSac} mm`);

  // Biometria (CC / CA / PFE).
  const hc = num(e.hc);
  if (hc != null) {
    const c = gaDays != null ? hcCentile(hc, gaDays) : null;
    fields.push(`CC: ${e.hc} mm${pctSuffix(c)}`);
  }

  const ac = num(e.ac);
  if (ac != null) {
    const c = gaDays != null ? acCentile(ac, gaDays) : null;
    fields.push(`CA: ${e.ac} mm${pctSuffix(c)}`);
  }

  const efw = num(e.efw);
  if (efw != null) {
    const c = gaDays != null ? efwCentile(efw, gaDays) : null;
    fields.push(`PFE ${e.efw} g${pctSuffix(c)}`);
  }

  // Líquido amniótico.
  if (e.mbv) fields.push(`MBV ${e.mbv}CM`);
  if (e.ila) fields.push(`ILA ${e.ila}CM`);

  // BCF.
  if (e.fhr) {
    fields.push(num(e.fhr) != null ? `BCF ${e.fhr} BPM` : `BCF ${e.fhr.toUpperCase()}`);
  }

  // Placenta.
  if (e.placentaSite || e.placentaGrade) {
    const site = e.placentaSite ? ` ${placentaAbbr(e.placentaSite)}` : "";
    const grade = e.placentaGrade ? ` GRAU ${e.placentaGrade}` : "";
    fields.push(`PLAC${site}${grade}`);
  }

  // Doppler.
  const uaPi = num(e.uaPi);
  if (uaPi != null) {
    const c = gaDays != null ? uaPiCentile(uaPi, gaDays) : null;
    fields.push(`IP AUMB ${e.uaPi}${pctSuffixFmf(c)}`);
  }

  const mcaPi = num(e.mcaPi);
  if (mcaPi != null) {
    const c = gaDays != null ? mcaPiCentile(mcaPi, gaDays) : null;
    fields.push(`IP ACM ${e.mcaPi}${pctSuffixFmf(c)}`);
  }

  const cpr = examCpr(e);
  if (cpr != null) {
    const c = gaDays != null ? cprCentile(cpr, gaDays) : null;
    fields.push(`RCP ${cpr.toFixed(3).replace(".", ",")}${pctSuffixFmf(c)}`);
  }

  const utPi = num(e.utPi);
  if (utPi != null) {
    const c = gaDays != null ? utPiCentile(utPi, gaDays) : null;
    fields.push(`IP A. UTERINA ${e.utPi}${pctSuffixFmf(c)}`);
  }

  if (e.notes) fields.push(e.notes);

  return fields;
}

/** Linha de prontuário de um exame (gestação única), no formato do MODELO PS. */
export function renderImagingExam(e: ImagingExam): string {
  // Laudo editado manualmente tem prioridade sobre a geração automática.
  if (e.overrideText?.trim()) return e.overrideText;
  const parts: string[] = [];
  const ig = igPhrase(e);
  if (ig) parts.push(ig);
  parts.push(...imagingFields(e));
  const ext = e.external ? " EXT" : "";
  return `- (${dateBR(e.date)}${ext}): ${parts.join(" / ")}`;
}

/**
 * Avisos de possível confusão cm/mm ao anotar biometria (valor ~10× menor que
 * o esperado em mm para a IG). Cobre CC e CA (têm valor esperado por IG).
 */
export function imagingWarnings(e: ImagingExam): string[] {
  const gaDays = examGaDays(e);
  if (gaDays == null) return [];
  const out: string[] = [];
  const suspectCm = (valueMm: number | null, expectedMm: number | null): boolean => {
    if (valueMm == null || valueMm <= 0 || expectedMm == null || expectedMm <= 0) return false;
    const x10 = valueMm * 10;
    return x10 >= expectedMm * 0.55 && x10 <= expectedMm * 1.6;
  };
  if (suspectCm(num(e.ac), expectedAc(gaDays)))
    out.push("CA parece estar em cm — confira (valor em mm, ex.: 261, não 26,1).");
  if (suspectCm(num(e.hc), expectedHc(gaDays)))
    out.push("CC parece estar em cm — confira (valor em mm, ex.: 290, não 29,0).");
  return out;
}

export interface ImagingGroup {
  key: string;
  exams: ImagingExam[];
}

/** Agrupa exames consecutivos que compartilham `groupId` (fetos do mesmo USG). */
export function groupImaging(exams: ImagingExam[]): ImagingGroup[] {
  const groups: ImagingGroup[] = [];
  for (const e of exams) {
    const key = e.groupId ?? e.id;
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.exams.push(e);
    else groups.push({ key, exams: [e] });
  }
  return groups;
}

function sortKeyOf(dateISO?: string): number {
  if (!dateISO) return Number.POSITIVE_INFINITY;
  const t = new Date(`${dateISO}T00:00:00`).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

const IMAGING_INDENT = " ".repeat(10);

/**
 * Bloco de um USG de gestação múltipla: cabeçalho com a gestação/IG (data
 * compartilhada) e um "FETO n: …" por linha (fetos 2+ deslocados 10 espaços).
 */
export function renderImagingGroup(exams: ImagingExam[], multiplePhrase?: string): string {
  const first = exams[0];
  if (first.overrideText?.trim()) return first.overrideText;
  const ext = first.external ? " EXT" : "";
  const ga = gaText(first);
  const gest = multiplePhrase
    ? `GESTAÇÃO ${multiplePhrase}${ga ? ` DE ${ga}` : ""}`
    : ga
      ? `GESTAÇÃO DE ${ga}`
      : "";
  const fetusLines = exams.map(
    (e, i) => `FETO ${e.fetusIndex ?? i + 1}: ${imagingFields(e).join(" / ")}`,
  );
  const firstLine = `- (${dateBR(first.date)}${ext}): ${gest ? `${gest}:` : ""}${fetusLines[0]}`;
  const rest = fetusLines.slice(1).map((l) => `${IMAGING_INDENT}${l}`);
  return [firstLine, ...rest].join("\n");
}

/**
 * Renderiza os exames de imagem: USGs (agrupando fetos de gestação múltipla) e
 * os "outros exames" (texto livre datado), tudo ordenado por data. `multiplePhrase`
 * é a frase da gestação múltipla (sem sigla) para o cabeçalho dos grupos.
 */
export function renderImaging(
  exams: ImagingExam[],
  opts?: { multiplePhrase?: string; otherImaging?: string },
): string {
  const entries: { sortKey: number; order: number; text: string }[] = [];
  let order = 0;
  for (const g of groupImaging(exams)) {
    if (!g.exams.some(hasImagingData)) continue;
    const text =
      g.exams.length > 1
        ? renderImagingGroup(g.exams, opts?.multiplePhrase)
        : renderImagingExam(g.exams[0]);
    entries.push({ sortKey: sortKeyOf(g.exams[0].date), order: order++, text });
  }
  for (const oe of parseDatedText(opts?.otherImaging)) {
    entries.push({ sortKey: oe.sortKey, order: order++, text: oe.text });
  }
  return entries
    .sort((a, b) => a.sortKey - b.sortKey || a.order - b.order)
    .map((e) => e.text)
    .join("\n");
}
