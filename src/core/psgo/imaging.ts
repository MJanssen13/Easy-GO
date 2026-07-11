/**
 * Exames de imagem (USG obstétrico) do PSGO. Seção própria, em quadro: cada
 * exame tem IG própria e a plataforma calcula os percentis de PESO/CA
 * (Hadlock) e da tríade Doppler do CIUR (IP-AUmb, IP-ACM, RCP — FMF/Ciobanu).
 *
 * Linha do prontuário (MODELO PS):
 *   -(DATA): IG: XX / APRESENTAÇÃO / PESO (P X) / CIRC. ABDOMINAL (P X) /
 *    PLACENTA E SUA INSERÇÃO, GRAU / MBV / IP AUMB (P X) / IP ACM (P X) / RCP (P X)
 */
import { efwCentile, acCentile, bpdCentile } from "@/core/fmf/biometry";
import { uaPiCentile, mcaPiCentile, cprCentile, cprValue } from "@/core/fmf/cpr";
import { ntCentile } from "@/core/fmf/nt";
import { utPiCentile } from "@/core/fmf/uterine";
import { formatCentile } from "@/core/fmf/centile";
import { parseDecimal } from "@/lib/num";

export interface ImagingExam {
  id: string;
  date?: string;
  gaWeeks?: number;
  gaDays?: number;
  useForDating?: boolean; // USG escolhido para datação
  presentation?: string; // APRESENTAÇÃO (cefálica/pélvica/córmica)
  efw?: string; // PESO — PFE (g)
  ac?: string; // CIRC. ABDOMINAL (mm)
  placentaSite?: string; // inserção (anterior/posterior/fúndica/prévia…)
  placentaGrade?: string; // grau (0/I/II/III)
  mbv?: string; // maior bolsão vertical (cm)
  uaPi?: string; // IP AUMB — IP da artéria umbilical
  mcaPi?: string; // IP ACM — IP da artéria cerebral média
  utPi?: string; // IP A. UTERINA (média) — IP das artérias uterinas
  crl?: string; // CCN — comprimento cabeça-nádega (mm)
  bpd?: string; // DBP — diâmetro biparietal (mm)
  nt?: string; // TN — translucência nucal (mm)
  nasalBone?: string; // ON — osso nasal (presente/ausente)
  notes?: string;
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

function dateBR(iso?: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

function igLabel(e: ImagingExam): string {
  if (e.gaWeeks == null) return "";
  return `IG: ${e.gaWeeks}s${e.gaDays ? `${e.gaDays}d` : ""}`;
}

/** RCP (valor) calculado a partir de IP-ACM / IP-AUmb. */
export function examCpr(e: ImagingExam): number | null {
  return cprValue(num(e.mcaPi), num(e.uaPi));
}

export interface ImagingCentiles {
  efw: string; // "P 50" ou ""
  ac: string;
  uaPi: string;
  mcaPi: string;
  cpr: string;
  nt: string; // percentil da TN (pela FMF, a partir do CCN)
  utPi: string; // percentil do IP da artéria uterina (pela FMF)
  bpd: string; // percentil do DBP (Hadlock 1984)
}

/** Rótulos de percentil ("P X") de cada medida do exame, para exibição no quadro. */
export function examCentiles(e: ImagingExam): ImagingCentiles {
  const gaDays = examGaDays(e);
  const lab = (c: number | null) => {
    const f = formatCentile(c);
    return f ? `P ${f}` : "";
  };
  const efw = num(e.efw);
  const ac = num(e.ac);
  const uaPi = num(e.uaPi);
  const mcaPi = num(e.mcaPi);
  const cpr = examCpr(e);
  const nt = num(e.nt);
  const crl = num(e.crl);
  const utPi = num(e.utPi);
  const bpd = num(e.bpd);
  return {
    efw: gaDays != null && efw != null ? lab(efwCentile(efw, gaDays)) : "",
    ac: gaDays != null && ac != null ? lab(acCentile(ac, gaDays)) : "",
    uaPi: gaDays != null && uaPi != null ? lab(uaPiCentile(uaPi, gaDays)) : "",
    mcaPi: gaDays != null && mcaPi != null ? lab(mcaPiCentile(mcaPi, gaDays)) : "",
    cpr: gaDays != null && cpr != null ? lab(cprCentile(cpr, gaDays)) : "",
    nt: nt != null && crl != null ? lab(ntCentile(nt, crl)) : "",
    utPi: gaDays != null && utPi != null ? lab(utPiCentile(utPi, gaDays)) : "",
    bpd: gaDays != null && bpd != null ? lab(bpdCentile(bpd, gaDays)) : "",
  };
}

export function hasImagingData(e: ImagingExam): boolean {
  return Boolean(
    e.date ||
      e.efw ||
      e.ac ||
      e.uaPi ||
      e.mcaPi ||
      e.mbv ||
      e.utPi ||
      e.crl ||
      e.bpd ||
      e.nt ||
      e.nasalBone ||
      e.placentaSite ||
      e.placentaGrade ||
      e.presentation ||
      e.notes,
  );
}

/** Linha de prontuário de um exame, no formato do MODELO PS, com percentis. */
export function renderImagingExam(e: ImagingExam): string {
  const gaDays = examGaDays(e);
  const fields: string[] = [];

  const ig = igLabel(e);
  if (ig) fields.push(ig);
  if (e.presentation) fields.push(e.presentation);

  // Marcadores/biometria (nem todos presentes no mesmo US).
  const crl = num(e.crl);
  if (crl != null) fields.push(`CCN ${e.crl}mm`);
  const bpd = num(e.bpd);
  if (bpd != null) {
    const c = gaDays != null ? bpdCentile(bpd, gaDays) : null;
    fields.push(`DBP ${e.bpd}mm${pctSuffix(c)}`);
  }
  const nt = num(e.nt);
  if (nt != null) {
    const c = crl != null ? ntCentile(nt, crl) : null;
    fields.push(`TN ${e.nt}mm${pctSuffix(c)}`);
  }
  if (e.nasalBone) fields.push(`OSSO NASAL ${e.nasalBone.toUpperCase()}`);

  const efw = num(e.efw);
  if (efw != null) {
    const c = gaDays != null ? efwCentile(efw, gaDays) : null;
    fields.push(`PESO ${e.efw}g${pctSuffix(c)}`);
  }

  const ac = num(e.ac);
  if (ac != null) {
    const c = gaDays != null ? acCentile(ac, gaDays) : null;
    fields.push(`CIRC. ABDOMINAL ${e.ac}mm${pctSuffix(c)}`);
  }

  if (e.placentaSite || e.placentaGrade) {
    const site = e.placentaSite ? ` ${e.placentaSite}` : "";
    const grade = e.placentaGrade ? `, GRAU ${e.placentaGrade}` : "";
    fields.push(`PLACENTA${site}${grade}`);
  }

  if (e.mbv) fields.push(`MBV ${e.mbv}`);

  const uaPi = num(e.uaPi);
  if (uaPi != null) {
    const c = gaDays != null ? uaPiCentile(uaPi, gaDays) : null;
    fields.push(`IP AUMB ${e.uaPi}${pctSuffix(c)}`);
  }

  const mcaPi = num(e.mcaPi);
  if (mcaPi != null) {
    const c = gaDays != null ? mcaPiCentile(mcaPi, gaDays) : null;
    fields.push(`IP ACM ${e.mcaPi}${pctSuffix(c)}`);
  }

  const cpr = examCpr(e);
  if (cpr != null) {
    const c = gaDays != null ? cprCentile(cpr, gaDays) : null;
    fields.push(`RCP ${cpr.toFixed(2)}${pctSuffix(c)}`);
  }

  const utPi = num(e.utPi);
  if (utPi != null) {
    const c = gaDays != null ? utPiCentile(utPi, gaDays) : null;
    fields.push(`IP A. UTERINA ${e.utPi}${pctSuffix(c)}`);
  }

  if (e.notes) fields.push(e.notes);

  return `-(${dateBR(e.date)}): ${fields.join(" / ")}`;
}

export function renderImaging(exams: ImagingExam[]): string {
  return exams.filter(hasImagingData).map(renderImagingExam).join("\n");
}
