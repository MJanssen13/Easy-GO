// Observações por PERÍODO do traçado: o profissional seleciona um intervalo de
// tempo (ex.: 04:30–06:10) e anota o que viu ali (desaceleração, artefato,
// mudança de decúbito, etc.). Cada observação é numerada, desenhada como uma
// faixa sobre os dois painéis e listada por extenso abaixo do traçado.
// Lógica pura (sem React).

import { formatElapsed } from "./stimuli";

export interface TraceAnnotation {
  id: string;
  /** Início do período, em segundos a partir do começo DESTA gravação. */
  startSec: number;
  /** Fim do período, em segundos. */
  endSec: number;
  text: string;
}

/** Ordena os limites e prende o período à duração da gravação. */
export function normalizeAnnotation(a: TraceAnnotation, samples: number): TraceAnnotation {
  const lo = Math.max(0, Math.min(a.startSec, a.endSec));
  const hi = Math.min(samples, Math.max(a.startSec, a.endSec));
  return { ...a, startSec: lo, endSec: hi };
}

/** Observações que tocam esta gravação, ordenadas pelo início. */
export function annotationsFor(annotations: TraceAnnotation[], samples: number): TraceAnnotation[] {
  return annotations
    .map((a) => normalizeAnnotation(a, samples))
    .filter((a) => a.endSec > a.startSec)
    .sort((a, b) => a.startSec - b.startSec);
}

/** Rótulo do período, em tempo decorrido: "04:30–06:10". */
export function annotationRange(a: TraceAnnotation): string {
  return `${formatElapsed(a.startSec)}–${formatElapsed(a.endSec)}`;
}

/** Duração do período em segundos. */
export const annotationDuration = (a: TraceAnnotation): number => Math.max(0, a.endSec - a.startSec);
