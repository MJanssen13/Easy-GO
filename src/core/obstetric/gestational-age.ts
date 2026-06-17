/**
 * Gestational age & estimated due-date (EDD/DPP) calculations.
 *
 * The ultrasound redating thresholds encode ACOG / AIUM / SMFM Committee
 * Opinion No. 700, "Methods for Estimating the Due Date" (reaffirmed 2021).
 *
 * ⚠️ DECISION SUPPORT ONLY. Every result must be reviewed by the attending
 * physician before any clinical use.
 */

const MS_PER_DAY = 86_400_000;

export interface GestationalAge {
  /** Total completed days of gestation. */
  totalDays: number;
  weeks: number;
  days: number;
  /** Conventional label, e.g. "39+2". */
  label: string;
}

export function toGestationalAge(totalDays: number): GestationalAge {
  const clamped = Math.max(0, Math.round(totalDays));
  const weeks = Math.floor(clamped / 7);
  const days = clamped % 7;
  return { totalDays: clamped, weeks, days, label: `${weeks}+${days}` };
}

function startOfDay(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

/** Whole-day difference (to − from), ignoring time-of-day. */
function diffDays(from: Date, to: Date): number {
  return Math.round((startOfDay(to) - startOfDay(from)) / MS_PER_DAY);
}

/** GA from the last menstrual period (DUM). */
export function gaFromLMP(lmp: Date, ref: Date = new Date()): GestationalAge {
  return toGestationalAge(diffDays(lmp, ref));
}

/** EDD by Naegele's rule: LMP + 280 days. */
export function eddFromLMP(lmp: Date): Date {
  return new Date(startOfDay(lmp) + 280 * MS_PER_DAY);
}

/** GA today from a dated ultrasound (GA known at the scan date). */
export function gaFromUltrasound(
  scanDate: Date,
  scanGa: { weeks: number; days: number },
  ref: Date = new Date(),
): GestationalAge {
  const gaAtScanDays = scanGa.weeks * 7 + scanGa.days;
  return toGestationalAge(gaAtScanDays + diffDays(scanDate, ref));
}

/** EDD implied by a dated ultrasound. */
export function eddFromUltrasound(scanDate: Date, scanGa: { weeks: number; days: number }): Date {
  const gaAtScanDays = scanGa.weeks * 7 + scanGa.days;
  return new Date(startOfDay(scanDate) + (280 - gaAtScanDays) * MS_PER_DAY);
}

/**
 * ACOG CO-700 discrepancy threshold (days) above which the ultrasound EDD
 * should REPLACE the LMP-based EDD, keyed by the GA at the time of the scan.
 */
function redatingThresholdDays(gaAtScanDays: number): number {
  if (gaAtScanDays <= 8 * 7 + 6) return 5; // ≤ 8w6d (CRL)
  if (gaAtScanDays <= 13 * 7 + 6) return 7; // 9w0d–13w6d
  if (gaAtScanDays <= 15 * 7 + 6) return 7; // 14w0d–15w6d
  if (gaAtScanDays <= 21 * 7 + 6) return 10; // 16w0d–21w6d
  if (gaAtScanDays <= 27 * 7 + 6) return 14; // 22w0d–27w6d
  return 21; // ≥ 28w0d
}

export type DatingMethod = "lmp" | "ultrasound";

export interface DatingResult {
  method: DatingMethod;
  edd: Date;
  ga: GestationalAge;
  /** |LMP-EDD − US-EDD| in days, when both are provided. */
  discrepancyDays: number | null;
  thresholdDays: number | null;
  redated: boolean;
  note: string;
}

/**
 * Resolve which dating to use, applying the ACOG CO-700 redating rule when both
 * a reliable LMP and a dated ultrasound are available. If only one input is
 * given, it is used as-is.
 *
 * @throws if neither LMP nor a dated ultrasound is provided.
 */
export function resolveDating(
  params: {
    lmp?: Date | null;
    scanDate?: Date | null;
    scanGa?: { weeks: number; days: number } | null;
  },
  ref: Date = new Date(),
): DatingResult {
  const { lmp, scanDate, scanGa } = params;
  const hasUs = !!(scanDate && scanGa);
  const hasLmp = !!lmp;

  if (hasLmp && !hasUs) {
    return {
      method: "lmp",
      edd: eddFromLMP(lmp),
      ga: gaFromLMP(lmp, ref),
      discrepancyDays: null,
      thresholdDays: null,
      redated: false,
      note: "Datação pela DUM (sem USG informada).",
    };
  }

  if (hasUs && !hasLmp) {
    return {
      method: "ultrasound",
      edd: eddFromUltrasound(scanDate, scanGa),
      ga: gaFromUltrasound(scanDate, scanGa, ref),
      discrepancyDays: null,
      thresholdDays: null,
      redated: false,
      note: "Datação pela USG (sem DUM confiável).",
    };
  }

  if (hasUs && hasLmp) {
    const lmpEdd = eddFromLMP(lmp);
    const usEdd = eddFromUltrasound(scanDate, scanGa);
    const gaAtScanDays = scanGa.weeks * 7 + scanGa.days;
    const threshold = redatingThresholdDays(gaAtScanDays);
    const discrepancy = Math.abs(diffDays(lmpEdd, usEdd));
    const redate = discrepancy > threshold;
    const edd = redate ? usEdd : lmpEdd;
    const ga = toGestationalAge(280 - diffDays(ref, edd));

    return {
      method: redate ? "ultrasound" : "lmp",
      edd,
      ga,
      discrepancyDays: discrepancy,
      thresholdDays: threshold,
      redated: redate,
      note: redate
        ? `USG diverge da DUM em ${discrepancy} dias (limite de ${threshold}d para esta IG) → datação redefinida pela USG (ACOG CO-700).`
        : `USG compatível com a DUM (diferença de ${discrepancy}d ≤ ${threshold}d) → mantida a datação pela DUM (ACOG CO-700).`,
    };
  }

  throw new Error("Informe a DUM e/ou uma USG datada para calcular a idade gestacional.");
}

/** Format a Date as dd/MM/yyyy (pt-BR). */
export function formatDateBR(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}
