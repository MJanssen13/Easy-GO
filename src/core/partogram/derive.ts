/**
 * Preenchimento automático do partograma a partir das aferições (observations)
 * registradas depois da abertura. Puro. Os lançamentos manuais prevalecem
 * (a mesclagem é feita pelos modelos).
 */
import type { Observation } from "@/core/patients/types";
import type { ContractionStrength, UftmContractionBlock, UftmPoint, UftmTableColumn } from "./types";

export const UFTM_COLS = 16; // horas na ficha HC-UFTM
export const LCG_FIRST_SLOTS = 24; // 12 h em meias horas (1ª fase)
export const LCG_SECOND_SLOTS = 12; // 3 h em 15 min (2ª fase)

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function hhmm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** Índice da janela (de `minutes`) desde `start`; negativo = antes da abertura. */
export function slotOf(iso: string, start: string, minutes: number): number {
  return Math.floor((new Date(iso).getTime() - new Date(start).getTime()) / (minutes * 60000));
}

export function slotTime(start: string, index: number, minutes: number): Date {
  return new Date(new Date(start).getTime() + index * minutes * 60000);
}

/** "3x40''/10'" → { count: 3, seconds: 40 }; "AUSENTE" → count 0. */
export function parseDynamics(text?: string): { count: number; seconds: number | null } | null {
  if (!text) return null;
  const t = text.trim().toUpperCase();
  if (!t) return null;
  if (/AUSENTE|^0\b/.test(t)) return { count: 0, seconds: null };
  const m = t.match(/(\d+)\s*[X×]\s*(\d+)/);
  if (m) return { count: Number(m[1]), seconds: Number(m[2]) };
  const only = t.match(/^(\d+)/);
  return only ? { count: Number(only[1]), seconds: null } : null;
}

/** Legenda da ficha: 1-19 s fraca (X), 20-39 s média, ≥ 40 s forte. */
export function strengthOf(seconds: number | null): ContractionStrength {
  if (seconds == null) return "moderate";
  if (seconds < 20) return "weak";
  if (seconds < 40) return "moderate";
  return "strong";
}

/** Janela antes da abertura em que o último toque ainda entra na coluna 0. */
export const OPENING_EXAM_WINDOW_MIN = 60;

/**
 * Aferições após a abertura, em ordem cronológica. Com `includeOpeningExam`,
 * o último toque (dilatação) feito até 60 min antes da abertura — em geral o
 * que diagnosticou a fase ativa — entra na coluna 0, só com os dados do toque
 * (colo, altura, bolsa); vitais e BCF daquele momento ficam de fora.
 */
export function afterOpening(
  observations: Observation[],
  openedAt: string,
  includeOpeningExam = false,
): Observation[] {
  const t0 = new Date(openedAt).getTime();
  const byTime = (a: Observation, b: Observation) =>
    new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime();
  const after = observations.filter((o) => new Date(o.recordedAt).getTime() >= t0).sort(byTime);
  if (!includeOpeningExam) return after;
  const hasExamAtOpening = after.some(
    (o) => o.obstetric.dilation != null && new Date(o.recordedAt).getTime() - t0 < 30 * 60000,
  );
  if (hasExamAtOpening) return after;
  const prior = observations
    .filter((o) => {
      const t = new Date(o.recordedAt).getTime();
      return o.obstetric.dilation != null && t < t0 && t0 - t <= OPENING_EXAM_WINDOW_MIN * 60000;
    })
    .sort(byTime)
    .at(-1);
  if (!prior) return after;
  const ob = prior.obstetric;
  const exam: Observation = {
    ...prior,
    recordedAt: openedAt,
    vitals: {},
    medication: undefined,
    obstetric: {
      dilation: ob.dilation,
      effacement: ob.effacement,
      station: ob.station,
      presentation: ob.presentation,
      membranes: ob.membranes,
    },
  };
  return [exam, ...after];
}

// ------------------------------- Ficha HC-UFTM -------------------------------

export interface UftmAuto {
  points: UftmPoint[];
  contractionBlocks: UftmContractionBlock[];
  table: Partial<UftmTableColumn>[];
}

function medsText(o: Observation): string {
  const m = o.medication;
  if (!m) return "";
  return [
    m.misoprostolDose ? `MISO ${m.misoprostolDose}MCG${m.misoprostolCount ? ` (${m.misoprostolCount}º)` : ""}` : "",
    m.antibiotic ?? "",
    m.other ?? "",
  ]
    .filter(Boolean)
    .join(" / ")
    .toUpperCase();
}

export function deriveUftm(observations: Observation[], openedAt: string): UftmAuto {
  const obs = afterOpening(observations, openedAt, true);
  const points: UftmPoint[] = [];
  const blocks: UftmContractionBlock[] = [];
  const table: Partial<UftmTableColumn>[] = Array.from({ length: UFTM_COLS }, (_, i) => ({
    hourIndex: i,
    realTime: hhmm(slotTime(openedAt, i, 60)),
  }));

  // Última aferição de cada hora para dilatação/estação/contrações/tabela.
  const lastByHour = new Map<number, Observation[]>();
  for (const o of obs) {
    const h = slotOf(o.recordedAt, openedAt, 60);
    if (h < 0 || h >= UFTM_COLS) continue;
    lastByHour.set(h, [...(lastByHour.get(h) ?? []), o]);

    // BCF: cada aferição vira um ponto no minuto em que foi feita.
    if (o.obstetric.bcf != null && o.obstetric.bcf >= 80 && o.obstetric.bcf <= 180) {
      const min = new Date(o.recordedAt).getMinutes() - new Date(openedAt).getMinutes();
      const frac = (((min % 60) + 60) % 60) / 60;
      points.push({ x: h + frac, y: o.obstetric.bcf, type: "fcf" });
    }
  }

  for (const [h, list] of lastByHour) {
    const pick = <T,>(fn: (o: Observation) => T | undefined | null): T | undefined => {
      for (let i = list.length - 1; i >= 0; i--) {
        const v = fn(list[i]!);
        if (v != null && v !== "") return v;
      }
      return undefined;
    };
    const dil = pick((o) => o.obstetric.dilation);
    if (dil != null) points.push({ x: h, y: Math.max(0, Math.min(10, Math.round(dil))), type: "dilation" });
    const st = pick((o) => o.obstetric.station);
    if (st != null) points.push({ x: h, y: 6 - st, type: "station" });

    const dyn = pick((o) => parseDynamics(o.obstetric.dynamicsSummary));
    if (dyn && dyn.count > 0) {
      const type = strengthOf(dyn.seconds);
      for (let s = 0; s < Math.min(5, dyn.count); s++) blocks.push({ x: h, slot: s, type });
    }

    const mem = pick((o) => o.obstetric.membranes);
    const col = table[h]!;
    if (mem) {
      col.amnioticFluid = mem === "intact" ? "ÍNTEGRA" : "ROTA";
      if (mem !== "intact") col.la = mem === "ruptured_meconium" ? "MECONIAL" : "CLARO";
    }
    const oxy = pick((o) => o.medication?.oxytocinDose);
    if (oxy != null) col.oxytocin = `${String(oxy).replace(".", ",")} ML/H`;
    const meds = list.map(medsText).filter(Boolean);
    if (meds.length) col.meds = [...new Set(meds)].join(" / ");
    const ex = pick((o) => o.examinerName?.toUpperCase());
    if (ex) col.examiner = ex;
  }

  return { points, contractionBlocks: blocks, table };
}

// -------------------------------- OMS — LCG --------------------------------

/**
 * Células automáticas do LCG (1ª fase, meia hora). Chaves = ids das linhas do
 * modelo (ver `lcg.ts`). Só o que a aferição registra de fato — nada é
 * convertido (ex.: De Lee não vira "quintos" de descida).
 */
export function deriveLcgFirst(observations: Observation[], openedAt: string): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const o of afterOpening(observations, openedAt, true)) {
    const i = slotOf(o.recordedAt, openedAt, 30);
    if (i < 0 || i >= LCG_FIRST_SLOTS) continue;
    const c = (out[String(i)] ??= {});
    const v = o.vitals;
    const ob = o.obstetric;
    if (ob.bcf != null) c.fhr = String(ob.bcf);
    if (ob.membranes) c.fluid = ob.membranes === "intact" ? "I" : ob.membranes === "ruptured_clear" ? "C" : "M";
    if (v.fc != null) c.pulse = String(v.fc);
    if (v.paSystolic != null) c.sbp = String(v.paSystolic);
    if (v.paDiastolic != null) c.dbp = String(v.paDiastolic);
    if (v.tax != null) c.temp = String(v.tax).replace(".", ",");
    const dyn = parseDynamics(ob.dynamicsSummary);
    if (dyn) {
      c.contractions = String(dyn.count);
      if (dyn.seconds != null) c.duration = String(dyn.seconds);
    }
    if (ob.dilation != null) c.cervix = String(ob.dilation);
    if (o.medication?.oxytocinDose != null) c.oxytocin = `${o.medication.oxytocinDose} ml/h`;
    const meds = medsText(o);
    if (meds) c.medicine = meds;
    if (o.examinerName) c.initials = o.examinerName.toUpperCase();
  }
  return out;
}

export function deriveLcgSecond(
  observations: Observation[],
  secondStageAt: string,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  if (!secondStageAt) return out;
  for (const o of afterOpening(observations, secondStageAt)) {
    const i = slotOf(o.recordedAt, secondStageAt, 15);
    if (i < 0 || i >= LCG_SECOND_SLOTS) continue;
    const c = (out[String(i)] ??= {});
    if (o.obstetric.bcf != null) c.fhr = String(o.obstetric.bcf);
    const dyn = parseDynamics(o.obstetric.dynamicsSummary);
    if (dyn) {
      c.contractions = String(dyn.count);
      if (dyn.seconds != null) c.duration = String(dyn.seconds);
    }
    if (o.vitals.fc != null) c.pulse = String(o.vitals.fc);
    if (o.vitals.paSystolic != null) c.sbp = String(o.vitals.paSystolic);
    if (o.vitals.paDiastolic != null) c.dbp = String(o.vitals.paDiastolic);
  }
  return out;
}
