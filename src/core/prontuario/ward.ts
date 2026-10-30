/**
 * Utilitários comuns às evoluções de enfermaria (Puerpério, Onco-Ginecologia).
 * Puro — roda no cliente e no servidor.
 */
import type { Observation } from "@/core/patients/types";

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** "dd/mm/aaaa". Datas sem hora ("aaaa-mm-dd") são lidas no fuso local, não em UTC. */
export function dateFull(iso: string): string {
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Dias de calendário entre `from` e `ref` (0 = mesmo dia). Base de DPP/DPO. */
export function calendarDaysBetween(from: string, ref: Date | string = new Date()): number {
  const a = new Date(from.length <= 10 ? `${from}T00:00:00` : from);
  const b = typeof ref === "string" ? new Date(ref) : ref;
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  const da = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const db = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.max(0, Math.round((db - da) / 86400000));
}

function range(values: number[]): string {
  if (values.length === 0) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? `${min}` : `${min}-${max}`;
}

/** "PAS: 110-120 / PAD: 70-80 / FC: 72-88 / TAX: 36,2-36,8ºC" das últimas 24 h (só o que houver). */
export function nursingParamsFrom(observations: Observation[] | undefined, now: Date = new Date()): string {
  const since = now.getTime() - 24 * 3600 * 1000;
  const recent = (observations ?? []).filter((o) => new Date(o.recordedAt).getTime() >= since);
  const pick = (fn: (o: Observation) => number | undefined) =>
    recent.map(fn).filter((v): v is number => v != null && !Number.isNaN(v));
  const pas = range(pick((o) => o.vitals.paSystolic));
  const pad = range(pick((o) => o.vitals.paDiastolic));
  const fc = range(pick((o) => o.vitals.fc));
  const tax = range(pick((o) => o.vitals.tax)).replace(/\./g, ",");
  const parts = [
    pas && `PAS: ${pas}`,
    pad && `PAD: ${pad}`,
    fc && `FC: ${fc}`,
    tax && `TAX: ${tax}ºC`,
  ].filter(Boolean);
  return parts.join(" / ");
}

