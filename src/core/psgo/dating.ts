/**
 * Datação no PSGO: DUM (com flags incerta/discordante) + USGs (escolha de qual
 * usar para datar). Reusa o motor ACOG CO-700 de `gestational-age`.
 */
import {
  gaFromLMP,
  gaFromUltrasound,
  resolveDating,
  eddFromLMP,
  eddFromUltrasound,
  formatDateBR,
  type GestationalAge,
} from "@/core/obstetric/gestational-age";

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
  const datingUsg =
    input.usgExams.find((u) => u.useForDating) ?? input.usgExams.find((u) => u.date && u.gaWeeks != null);
  const scanDate = parseDate(datingUsg?.date);
  const scanGa =
    datingUsg && datingUsg.gaWeeks != null
      ? { weeks: datingUsg.gaWeeks, days: datingUsg.gaDays ?? 0 }
      : null;

  // Linha DUM
  let dumLine: string | null = null;
  if (lmpDate) {
    const ga = gaFromLMP(lmpDate, ref);
    dumLine = `DUM: ${formatDateBR(lmpDate)} (IG: ${ga.weeks} sem e ${ga.days} dias)`;
    if (input.lmpUncertain) dumLine += " — DUM INCERTA";
    else if (input.preference === "us") dumLine += " — DUM DISCORDANTE";
  }

  // Linha IG US
  let igUsLine: string | null = null;
  if (scanDate && scanGa) {
    const now = gaFromUltrasound(scanDate, scanGa, ref);
    igUsLine = `IG US: ${scanGa.weeks} sem e ${scanGa.days} d em ${formatDateBR(scanDate)} (IG: ${now.weeks} sem e ${now.days} dias)`;
  }

  // Método para a HD
  const useUsAuto = input.lmpUncertain === true; // DUM incerta → US
  const effectivePref: DatingPreference = useUsAuto ? "us" : (input.preference ?? "auto");

  let chosen: { ga: { weeks: number; days: number }; tag: "DUM" | "US" } | null = null;
  if (effectivePref === "lmp" && lmpDate) {
    chosen = { ga: gaFromLMP(lmpDate, ref), tag: "DUM" };
  } else if (effectivePref === "us" && scanDate && scanGa) {
    chosen = { ga: gaFromUltrasound(scanDate, scanGa, ref), tag: "US" };
  } else if (lmpDate || (scanDate && scanGa)) {
    const r = resolveDating({ lmp: input.lmpUncertain ? null : lmpDate, scanDate, scanGa }, ref);
    chosen = { ga: r.ga, tag: r.method === "ultrasound" ? "US" : "DUM" };
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
  const datingUsg =
    input.usgExams.find((u) => u.useForDating) ??
    input.usgExams.find((u) => u.date && u.gaWeeks != null);
  const scanDate = parseDate(datingUsg?.date);
  const scanGa =
    datingUsg && datingUsg.gaWeeks != null
      ? { weeks: datingUsg.gaWeeks, days: datingUsg.gaDays ?? 0 }
      : null;

  const dum = lmpDate
    ? { ga: gaFromLMP(lmpDate, ref), eddBR: formatDateBR(eddFromLMP(lmpDate)) }
    : null;

  const usg =
    scanDate && scanGa
      ? {
          dateBR: formatDateBR(scanDate),
          gaAtExam: scanGa,
          currentGa: gaFromUltrasound(scanDate, scanGa, ref),
          eddBR: formatDateBR(eddFromUltrasound(scanDate, scanGa)),
        }
      : null;

  return { dum, usg, chosen: resolvePsgoDating(input, ref).methodTag };
}
