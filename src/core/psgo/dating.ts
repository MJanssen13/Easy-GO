/**
 * Datação no PSGO: DUM (com flags incerta/discordante) + USGs (escolha de qual
 * usar para datar). Reusa o motor ACOG CO-700 de `gestational-age`.
 */
import {
  gaFromLMP,
  gaFromUltrasound,
  gaFromEdd,
  resolveDating,
  eddFromLMP,
  eddFromUltrasound,
  type GestationalAge,
} from "@/core/obstetric/gestational-age";

/** Data → DD/MM/AA (ano com 2 dígitos), para as notações do prontuário. */
function fmtDate(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/**
 * Data de referência para a IG a partir de uma ISO (ex.: data da consulta);
 * hoje quando ausente/inválida. A IG passa a ser calculada nessa data.
 */
export function refFromISO(iso?: string | null): Date {
  if (!iso) return new Date();
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export interface UsgExam {
  id: string;
  date?: string; // ISO date
  gaWeeks?: number;
  gaDays?: number;
  useForDating?: boolean;
}

export type DatingPreference = "auto" | "lmp" | "us";

export interface PsgoDating {
  dumLine: string | null;
  igUsLine: string | null;
  methodTag: "DUM" | "US" | null;
  /** Ex.: "38 SEMANAS E 3 DIAS" para a HD. */
  gaPhrase: string | null;
  /** Semanas completas da IG escolhida. */
  gaWeeks: number | null;
  /** true se IG ≥ 37 semanas (para o Robson). */
  term: boolean | null;
}

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * O USG que ancora a datação: sempre a PRIMEIRA coluna do quadro de exames de
 * imagem. É esse exame cuja IG digitada é o insumo da datação (a IG dos demais é
 * automática, pela data de realização).
 */
export function findDatingUsg(usgExams: UsgExam[]): UsgExam | undefined {
  return usgExams[0];
}

export interface DatingContext {
  /** Método resolvido para a datação (preferência do usuário + ACOG CO-700). */
  method: "DUM" | "US" | null;
  /** DPP resolvida: ancora a linha do tempo. IG numa data = `gaFromEdd(edd, data)`. */
  edd: Date | null;
  /** Id do USG que ancora a datação (mantém a IG digitada); os demais são automáticos. */
  datingExamId: string | null;
}

/**
 * Resolve a datação a uma DPP única (DUM ou USG, conforme preferência + ACOG
 * CO-700), independente da data de referência. A partir dela, a IG de qualquer
 * USG é obtida pela sua própria data de realização (`examEffectiveGa`).
 */
export function resolveDatingContext(input: {
  lmp?: string | null;
  lmpUncertain?: boolean;
  usgExams: UsgExam[];
  preference?: DatingPreference;
}): DatingContext {
  const lmpDate = parseDate(input.lmp);
  const datingUsg = findDatingUsg(input.usgExams);
  const scanDate = parseDate(datingUsg?.date);
  const scanGa =
    datingUsg && datingUsg.gaWeeks != null
      ? { weeks: datingUsg.gaWeeks, days: datingUsg.gaDays ?? 0 }
      : null;

  // DUM incerta anula a DUM e força a USG (quando houver).
  const effectivePref: DatingPreference =
    input.lmpUncertain === true ? "us" : (input.preference ?? "auto");

  let method: "DUM" | "US" | null = null;
  let edd: Date | null = null;

  if (effectivePref === "lmp" && lmpDate) {
    method = "DUM";
    edd = eddFromLMP(lmpDate);
  } else if (effectivePref === "us" && scanDate && scanGa) {
    method = "US";
    edd = eddFromUltrasound(scanDate, scanGa);
  } else {
    const effLmp = input.lmpUncertain ? null : lmpDate;
    if (effLmp || (scanDate && scanGa)) {
      // `edd`/método do ACOG CO-700 não dependem da data de referência.
      const r = resolveDating({ lmp: effLmp, scanDate, scanGa });
      method = r.method === "ultrasound" ? "US" : "DUM";
      edd = r.edd;
    }
  }

  return { method, edd, datingExamId: datingUsg?.id ?? null };
}

/**
 * IG (semanas/dias) efetiva de um USG: o exame de datação mantém a IG digitada
 * (é a âncora e o insumo do ACOG); os demais têm a IG definida automaticamente
 * pela datação resolvida, a partir da própria data de realização. Sem âncora ou
 * sem data, mantém o que houver (degradação graciosa).
 */
export function examEffectiveGa(
  exam: { id: string; date?: string; gaWeeks?: number; gaDays?: number },
  ctx: DatingContext,
): { gaWeeks?: number; gaDays?: number } {
  if (ctx.datingExamId != null && exam.id === ctx.datingExamId) {
    return { gaWeeks: exam.gaWeeks, gaDays: exam.gaDays };
  }
  const examDate = parseDate(exam.date);
  if (ctx.edd && examDate) {
    const ga = gaFromEdd(ctx.edd, examDate);
    return { gaWeeks: ga.weeks, gaDays: ga.days };
  }
  return { gaWeeks: exam.gaWeeks, gaDays: exam.gaDays };
}

/** Aplica a IG automática (pela datação) a uma lista de USGs, preservando o resto. */
export function withAutoGa<T extends { id: string; date?: string; gaWeeks?: number; gaDays?: number }>(
  exams: T[],
  ctx: DatingContext,
): T[] {
  return exams.map((e) => ({ ...e, ...examEffectiveGa(e, ctx) }));
}

export function resolvePsgoDating(
  input: {
    lmp?: string | null;
    lmpUncertain?: boolean;
    usgExams: UsgExam[];
    preference?: DatingPreference;
  },
  ref: Date = new Date(),
): PsgoDating {
  const lmpDate = parseDate(input.lmp);
  const datingUsg = findDatingUsg(input.usgExams);
  const scanDate = parseDate(datingUsg?.date);
  const scanGa =
    datingUsg && datingUsg.gaWeeks != null
      ? { weeks: datingUsg.gaWeeks, days: datingUsg.gaDays ?? 0 }
      : null;

  // Método/DPP resolvidos (preferência + ACOG CO-700); a IG da HD segue a DPP
  // na data de referência.
  const ctx = resolveDatingContext(input);
  const chosen =
    ctx.edd && ctx.method ? { ga: gaFromEdd(ctx.edd, ref), tag: ctx.method } : null;

  // Linha DUM: se incerta, suprime a data e escreve INCERTA; se a datação
  // efetiva veio da USG (por escolha ou pelo ACOG), marca "- DISCORDANTE".
  let dumLine: string | null = null;
  if (input.lmpUncertain) {
    dumLine = "DUM: INCERTA";
  } else if (lmpDate) {
    const ga = gaFromLMP(lmpDate, ref);
    dumLine = `DUM: ${fmtDate(lmpDate)} (IG: ${ga.weeks} sem e ${ga.days} dias)`;
    if (chosen?.tag === "US") dumLine += " - DISCORDANTE";
  }

  // Linha IG US — ex.: "IG US (9 SEM E 3 DIAS EM 09/03/26): IG: 27 SEM E 2 DIAS"
  let igUsLine: string | null = null;
  if (scanDate && scanGa) {
    const now = gaFromUltrasound(scanDate, scanGa, ref);
    igUsLine = `IG US (${scanGa.weeks} sem e ${scanGa.days} dias em ${fmtDate(scanDate)}): IG: ${now.weeks} sem e ${now.days} dias`;
  }

  return {
    dumLine,
    igUsLine,
    methodTag: chosen?.tag ?? null,
    gaPhrase: chosen ? `${chosen.ga.weeks} SEMANAS E ${chosen.ga.days} DIAS` : null,
    gaWeeks: chosen ? chosen.ga.weeks : null,
    term: chosen ? chosen.ga.weeks >= 37 : null,
  };
}

export interface DatingDisplay {
  /** IG atual pela DUM + DPP. */
  dum: { ga: GestationalAge; eddBR: string } | null;
  /** IG atual pelo USG, com a data do exame e a IG naquela data. */
  usg: {
    dateBR: string;
    gaAtExam: { weeks: number; days: number };
    currentGa: GestationalAge;
    eddBR: string;
  } | null;
  /** Método efetivamente usado para a HD ("DUM" | "US"). */
  chosen: "DUM" | "US" | null;
}

/** Dados estruturados de datação para exibição no card (IG por DUM e por USG). */
export function datingDisplay(
  input: {
    lmp?: string | null;
    lmpUncertain?: boolean;
    usgExams: UsgExam[];
    preference?: DatingPreference;
  },
  ref: Date = new Date(),
): DatingDisplay {
  const lmpDate = parseDate(input.lmp);
  const datingUsg = findDatingUsg(input.usgExams);
  const scanDate = parseDate(datingUsg?.date);
  const scanGa =
    datingUsg && datingUsg.gaWeeks != null
      ? { weeks: datingUsg.gaWeeks, days: datingUsg.gaDays ?? 0 }
      : null;

  const dum = lmpDate
    ? { ga: gaFromLMP(lmpDate, ref), eddBR: fmtDate(eddFromLMP(lmpDate)) }
    : null;

  const usg =
    scanDate && scanGa
      ? {
          dateBR: fmtDate(scanDate),
          gaAtExam: scanGa,
          currentGa: gaFromUltrasound(scanDate, scanGa, ref),
          eddBR: fmtDate(eddFromUltrasound(scanDate, scanGa)),
        }
      : null;

  return { dum, usg, chosen: resolvePsgoDating(input, ref).methodTag };
}
