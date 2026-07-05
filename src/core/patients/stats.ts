import type { Observation } from "./types";

export interface Stats24h {
  bcf: string;
  pas: string;
  pad: string;
  hasBcf: boolean;
  hasPa: boolean;
  count: number;
}

function range(values: number[]): string {
  if (values.length === 0) return "—";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min}` : `${min}–${max}`;
}

/** Faixas (mín–máx) de BCF e PA nas últimas 24h. */
export function get24hStats(
  observations: Observation[] | undefined,
  now: Date = new Date(),
): Stats24h | null {
  if (!observations || observations.length === 0) return null;
  const cutoff = now.getTime() - 24 * 3600 * 1000;
  const recent = observations.filter((o) => new Date(o.recordedAt).getTime() > cutoff);
  if (recent.length === 0) return null;

  const bcf = recent.map((o) => o.obstetric.bcf).filter((v): v is number => v != null);
  const pas = recent.map((o) => o.vitals.paSystolic).filter((v): v is number => v != null);
  const pad = recent.map((o) => o.vitals.paDiastolic).filter((v): v is number => v != null);

  return {
    bcf: range(bcf),
    pas: range(pas),
    pad: range(pad),
    hasBcf: bcf.length > 0,
    hasPa: pas.length > 0,
    count: recent.length,
  };
}
