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

export interface LatestValue {
  label: string;
  value: string;
  at: string; // ISO do registro
}

/**
 * Último valor registrado de cada parâmetro-chave (BCF, PA, dinâmica, toque,
 * TAX), mesmo que venham de aferições diferentes. `observations` em qualquer
 * ordem.
 */
export function latestValues(observations: Observation[] | undefined): LatestValue[] {
  if (!observations?.length) return [];
  const sorted = [...observations].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  const pick = (label: string, fn: (o: Observation) => string | null): LatestValue | null => {
    for (const o of sorted) {
      const v = fn(o);
      if (v) return { label, value: v, at: o.recordedAt };
    }
    return null;
  };
  return [
    pick("BCF", (o) => (o.obstetric.bcf != null ? `${o.obstetric.bcf}` : null)),
    pick("PA", (o) =>
      o.vitals.paSystolic != null ? `${o.vitals.paSystolic}x${o.vitals.paDiastolic ?? "?"}` : null,
    ),
    pick("DU", (o) => o.obstetric.dynamicsSummary || null),
    pick("Toque", (o) =>
      o.obstetric.dilation != null
        ? `${o.obstetric.dilation} cm${o.obstetric.station != null ? ` · DL ${o.obstetric.station > 0 ? "+" : ""}${o.obstetric.station}` : ""}`
        : null,
    ),
    pick("TAX", (o) => (o.vitals.tax != null ? `${o.vitals.tax} °C` : null)),
  ].filter((v): v is LatestValue => v != null);
}
