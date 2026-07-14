// Estímulos manuais (mecânico e sonoro) e a montagem das "marcas" que são
// desenhadas sobre o traçado. Um estímulo pode ser informado pelo TEMPO decorrido
// (mm:ss desde o início do exame) ou pela HORA de relógio (HH:MM) — internamente
// guardamos sempre a hora absoluta (segundos desde a meia-noite) e exibimos as
// duas formas. Lógica pura (sem React).

import type { CtgTrace } from "./trc";

export type StimulusKind = "mecanico" | "sonoro";

export interface Stimulus {
  id: string;
  kind: StimulusKind;
  /** Hora absoluta do estímulo, em segundos desde a meia-noite. */
  clockSec: number;
}

/** Tipos de marca desenhados no traçado. */
export type MarkKind = "movimento" | "mecanico" | "sonoro" | "autozero";

export interface TraceMark {
  /** Posição em segundos a partir do início DESTA gravação. */
  positionSec: number;
  kind: MarkKind;
}

export const STIMULUS_LABEL: Record<StimulusKind, string> = {
  mecanico: "Estímulo mecânico",
  sonoro: "Estímulo sonoro",
};

/** "HH:MM" → segundos desde a meia-noite. Retorna null se inválido. */
export function parseClock(input: string): number | null {
  const m = input.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 3600 + min * 60;
}

/** "mm:ss" (tempo decorrido) → segundos. Retorna null se inválido. */
export function parseElapsed(input: string): number | null {
  const m = input.trim().match(/^(\d{1,3}):(\d{2})$/);
  if (!m) return null;
  const min = Number(m[1]);
  const sec = Number(m[2]);
  if (sec > 59) return null;
  return min * 60 + sec;
}

/** Segundos desde a meia-noite → "HH:MM" (ou "HH:MM:SS" se houver segundos). */
export function formatClock(clockSec: number): string {
  const s = ((clockSec % 86400) + 86400) % 86400;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const base = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  return ss ? `${base}:${String(ss).padStart(2, "0")}` : base;
}

/** Segundos decorridos → "mm:ss". */
export function formatElapsed(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/** Início do exame (hora de relógio, em segundos) = 1ª gravação com horário. */
export function examStartSec(traces: CtgTrace[]): number | null {
  for (const t of traces) {
    if (t.startTime) {
      const c = parseClock(t.startTime);
      if (c != null) return c;
    }
  }
  return null;
}

/** Início (hora de relógio, em segundos) de uma gravação; cai para o exame. */
function recordingStartSec(trace: CtgTrace, examStart: number | null): number | null {
  if (trace.startTime) {
    const c = parseClock(trace.startTime);
    if (c != null) return c;
  }
  return examStart;
}

/**
 * Monta as marcas a desenhar sobre uma gravação: os eventos do arquivo
 * (movimento fetal e autozero) e os estímulos manuais que caem dentro da janela
 * de tempo desta gravação.
 */
export function buildMarks(
  trace: CtgTrace,
  stimuli: Stimulus[],
  examStart: number | null,
): TraceMark[] {
  const marks: TraceMark[] = trace.events.map((e) => ({
    positionSec: e.positionSec,
    kind: e.kind === "autozero" ? "autozero" : "movimento",
  }));

  const recStart = recordingStartSec(trace, examStart);
  if (recStart != null) {
    for (const s of stimuli) {
      const pos = s.clockSec - recStart;
      if (pos >= 0 && pos <= trace.samples) {
        marks.push({ positionSec: pos, kind: s.kind });
      }
    }
  }
  return marks;
}
