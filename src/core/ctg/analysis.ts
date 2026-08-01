/**
 * Análise automática do traçado de cardiotocografia (.trc) — extrai do sinal
 * bruto os parâmetros que alimentam o laudo. Lógica de domínio pura (sem React).
 *
 * DEFINIÇÕES ADOTADAS — NICHD 2008 (Macones GA et al., "The 2008 National
 * Institute of Child Health and Human Development workshop report on
 * electronic fetal monitoring", Obstet Gynecol 2008;112:661-6), reafirmadas
 * pelo ACOG Practice Bulletin nº 106/216, e consenso FIGO 2015 (Ayres-de-Campos
 * D et al., Int J Gynaecol Obstet 2015;131:13-24):
 *
 *  • LINHA DE BASE — FHR média aproximada em um segmento de 10 min, arredondada
 *    a incrementos de 5 bpm, EXCLUINDO acelerações, desacelerações e trechos de
 *    variabilidade marcada; exige ≥ 2 min de segmentos estáveis.
 *  • VARIABILIDADE — amplitude pico-a-vale das oscilações da linha de base:
 *    ausente (indetectável), mínima (≤ 5 bpm), moderada (6–25), marcada (> 25).
 *  • ACELERAÇÃO (≥ 32 semanas) — elevação ≥ 15 bpm acima da linha de base, com
 *    duração ≥ 15 s e < 2 min (≥ 2 min = aceleração prolongada).
 *  • DESACELERAÇÃO — queda ≥ 15 bpm abaixo da linha de base por ≥ 15 s.
 *
 * A relação AT/MF e o escore 0–5 seguem `./scoring` (modelo HC-UFTM).
 *
 * NÃO são classificados automaticamente (dependem de análise visual e da
 * correlação com as contrações; seriam suposições sem respaldo):
 *   – o TIPO da desaceleração (precoce/tardia/variável);
 *   – o padrão sinusoidal.
 * Ambos ficam em branco e são sinalizados como pendência para o profissional.
 *
 * APOIO À DECISÃO — todos os achados devem ser VALIDADOS pelo profissional
 * sobre o traçado original.
 */

import type { CtgTrace } from "./trc";
import type { CtgAtMfRatio, CtgPresence, CtgVariability } from "./scoring";

/** Trecho detectado (aceleração, desaceleração ou contração). */
export interface CtgEpisode {
  startSec: number;
  endSec: number;
  /** Amplitude máxima em relação à linha de base, em bpm (sempre positiva). */
  amplitudeBpm: number;
}

export interface CtgAnalysis {
  /** Linha de base em bpm (arredondada a 5) ou null se não houver trecho estável. */
  baselineBpm: number | null;
  /** Amplitude mediana da variabilidade, em bpm. */
  variabilityBpm: number | null;
  variability: CtgVariability | null;
  accelerations: CtgEpisode[];
  /** Acelerações com ≥ 2 min (prolongadas) — contadas à parte. */
  prolongedAccelerations: CtgEpisode[];
  decelerations: CtgEpisode[];
  /** Movimentos fetais registrados pelo botão de evento do aparelho. */
  movements: number;
  /** Acelerações por 20 min (normalizado pela duração). */
  accelPer20min: number;
  /** Percentual de acelerações por movimento fetal (null se não houve MF). */
  atMfPercent: number | null;
  atMfRatio: CtgAtMfRatio | null;
  /** Contrações estimadas do canal TOCO — HEURÍSTICO, ver `tocoHeuristic`. */
  contractions: CtgEpisode[];
  /** Tônus de repouso do TOCO (unidades relativas do aparelho). */
  tocoRestingTone: number | null;
  durationSec: number;
  fhrLossPct: number;
  /** Pendências e avisos a exibir junto dos campos preenchidos. */
  warnings: string[];
}

/**
 * A tocodinamometria EXTERNA não mede pressão real: a amplitude depende do
 * posicionamento do transdutor e do autozero, servindo para a FREQUÊNCIA das
 * contrações, não para a intensidade (FIGO 2015). A detecção abaixo é, por isso,
 * um DETECTOR DE ELEVAÇÕES do sinal relativo — uma estimativa da frequência, sem
 * fórmula clínica validada por trás. Serve apenas para pré-preencher o campo
 * "contrações", que deve ser confirmado pelo profissional.
 */
export const TOCO_HEURISTIC_NOTE =
  "Contrações estimadas do canal TOCO (tocodinamometria externa não é quantitativa) — confirmar.";

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const percentile = (xs: number[], p: number): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round((p / 100) * (s.length - 1))))];
};

/**
 * Trechos contíguos (em segundos) em que `pred` é verdadeiro, com duração entre
 * `minSec` e `maxSec`. Amostras nulas (perda de sinal) interrompem o trecho.
 */
function findRuns(
  values: (number | null)[],
  pred: (v: number) => boolean,
  minSec: number,
  maxSec = Infinity,
): { startSec: number; endSec: number; values: number[] }[] {
  const out: { startSec: number; endSec: number; values: number[] }[] = [];
  let start = -1;
  let acc: number[] = [];
  const close = (end: number) => {
    if (start >= 0) {
      const dur = end - start;
      if (dur >= minSec && dur <= maxSec) out.push({ startSec: start, endSec: end, values: acc });
    }
    start = -1;
    acc = [];
  };
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (v != null && pred(v)) {
      if (start < 0) start = i;
      acc.push(v);
    } else {
      close(i);
    }
  }
  close(values.length);
  return out;
}

/** Marca as amostras pertencentes a acelerações/desacelerações (para excluir da base). */
function excursionMask(fhr: (number | null)[], base: number): boolean[] {
  const mask = new Array<boolean>(fhr.length).fill(false);
  const mark = (runs: { startSec: number; endSec: number }[]) => {
    for (const r of runs) for (let i = r.startSec; i < r.endSec; i++) mask[i] = true;
  };
  mark(findRuns(fhr, (v) => v >= base + 15, 15));
  mark(findRuns(fhr, (v) => v <= base - 15, 15));
  return mask;
}

/**
 * Linha de base: mediana das amostras válidas EXCLUINDO acelerações e
 * desacelerações, refinada iterativamente (a exclusão depende da própria base),
 * e arredondada a 5 bpm (NICHD 2008).
 */
function computeBaseline(fhr: (number | null)[]): { bpm: number | null; stableSec: number } {
  const valid = fhr.filter((v): v is number => v != null);
  let base = median(valid);
  if (base == null) return { bpm: null, stableSec: 0 };
  let stable = valid.length;
  for (let it = 0; it < 4; it++) {
    const mask = excursionMask(fhr, base);
    const kept: number[] = [];
    for (let i = 0; i < fhr.length; i++) {
      const v = fhr[i];
      if (v != null && !mask[i]) kept.push(v);
    }
    const next = median(kept);
    if (next == null) break;
    stable = kept.length;
    if (Math.abs(next - base) < 0.5) {
      base = next;
      break;
    }
    base = next;
  }
  // Exige ≥ 2 min de traçado estável para afirmar a linha de base (NICHD 2008).
  if (stable < 120) return { bpm: null, stableSec: stable };
  return { bpm: Math.round(base / 5) * 5, stableSec: stable };
}

/**
 * Variabilidade: amplitude pico-a-vale por janela de 1 min, considerando apenas
 * os trechos de linha de base (sem acelerações/desacelerações); usa a mediana
 * das janelas para não se deixar levar por artefatos.
 */
function computeVariability(
  fhr: (number | null)[],
  base: number,
): { bpm: number | null; klass: CtgVariability | null } {
  const mask = excursionMask(fhr, base);
  const amps: number[] = [];
  for (let w = 0; w + 60 <= fhr.length; w += 60) {
    const win: number[] = [];
    for (let i = w; i < w + 60; i++) {
      const v = fhr[i];
      if (v != null && !mask[i]) win.push(v);
    }
    // Janela só conta se tiver ao menos 30 s de linha de base legível.
    // A amplitude usa a faixa entre os percentis 5 e 95 (em vez de máx−mín) para
    // não medir artefatos de curta duração / retomada de sinal como se fossem
    // oscilação da linha de base.
    if (win.length >= 30) {
      const lo = percentile(win, 5);
      const hi = percentile(win, 95);
      if (lo != null && hi != null) amps.push(hi - lo);
    }
  }
  const amp = median(amps);
  if (amp == null) return { bpm: null, klass: null };
  // NICHD 2008: indetectável = ausente; ≤5 = mínima; 6–25 = moderada; >25 = marcada.
  const klass: CtgVariability = amp < 1 ? "absent" : amp <= 5 ? "lt5" : amp <= 25 ? "6-25" : "gt25";
  return { bpm: Math.round(amp * 10) / 10, klass };
}

/** Contrações estimadas do TOCO — heurística de elevações (ver `TOCO_HEURISTIC_NOTE`). */
function computeContractions(toco: (number | null)[]): {
  episodes: CtgEpisode[];
  tone: number | null;
} {
  const valid = toco.filter((v): v is number => v != null);
  if (valid.length < 60) return { episodes: [], tone: null };
  const tone = percentile(valid, 10);
  const hi = percentile(valid, 95);
  if (tone == null || hi == null) return { episodes: [], tone: null };
  const span = hi - tone;
  // Sem excursão apreciável no canal, não há o que afirmar.
  if (span < 5) return { episodes: [], tone };
  const threshold = tone + span * 0.35;
  // Contração externa dura tipicamente de ~30 s a ~2 min; a janela ampla evita
  // contar artefatos curtos (movimento) e platôs longos (transdutor deslocado).
  const runs = findRuns(toco, (v) => v >= threshold, 30, 180);
  return {
    episodes: runs.map((r) => ({
      startSec: r.startSec,
      endSec: r.endSec,
      amplitudeBpm: Math.round(Math.max(...r.values) - tone),
    })),
    tone,
  };
}

/** Analisa uma gravação e devolve os achados que alimentam o laudo. */
export function analyzeTrace(trace: CtgTrace): CtgAnalysis {
  const warnings: string[] = [];
  const durationSec = trace.samples;
  const { bpm: baselineBpm } = computeBaseline(trace.fhr);

  let variability: CtgVariability | null = null;
  let variabilityBpm: number | null = null;
  let accelerations: CtgEpisode[] = [];
  let prolongedAccelerations: CtgEpisode[] = [];
  let decelerations: CtgEpisode[] = [];

  if (baselineBpm == null) {
    warnings.push(
      "Linha de base não estimada: menos de 2 min de traçado estável (perda de sinal ou registro curto).",
    );
  } else {
    const v = computeVariability(trace.fhr, baselineBpm);
    variability = v.klass;
    variabilityBpm = v.bpm;

    const toEp = (r: { startSec: number; endSec: number; values: number[] }, up: boolean): CtgEpisode => ({
      startSec: r.startSec,
      endSec: r.endSec,
      amplitudeBpm: Math.round(
        up ? Math.max(...r.values) - baselineBpm : baselineBpm - Math.min(...r.values),
      ),
    });
    accelerations = findRuns(trace.fhr, (x) => x >= baselineBpm + 15, 15, 120).map((r) => toEp(r, true));
    prolongedAccelerations = findRuns(trace.fhr, (x) => x >= baselineBpm + 15, 120).map((r) => toEp(r, true));
    decelerations = findRuns(trace.fhr, (x) => x <= baselineBpm - 15, 15).map((r) => toEp(r, false));

    if (decelerations.length > 0) {
      warnings.push(
        "Tipo da desaceleração (precoce/tardia/variável) não é classificado automaticamente — avaliar no traçado.",
      );
    }
    if (variability === "lt5" || variability === "absent") {
      warnings.push("Variabilidade reduzida: descartar padrão sinusoidal na análise visual.");
    }
  }

  if (trace.stats.fhrLossPct >= 20) {
    warnings.push(
      `Perda de sinal de ${trace.stats.fhrLossPct.toFixed(0)}% — achados automáticos menos confiáveis.`,
    );
  }

  const movements = trace.events.filter((e) => e.kind === "movimento").length;
  const accelPer20min = durationSec > 0 ? (accelerations.length * 1200) / durationSec : 0;
  const atMfPercent = movements > 0 ? (accelerations.length / movements) * 100 : null;
  // Critério do modelo HC-UFTM (`./scoring`): > 60% OU 2 AT em 20 min.
  const atMfRatio: CtgAtMfRatio | null =
    baselineBpm == null
      ? null
      : (atMfPercent != null && atMfPercent >= 60) || accelPer20min >= 2
        ? "gte60"
        : "lt60";

  const { episodes: contractions, tone: tocoRestingTone } = computeContractions(trace.toco);
  if (contractions.length > 0) warnings.push(TOCO_HEURISTIC_NOTE);

  if (movements === 0) {
    warnings.push(
      "Nenhum movimento fetal registrado pelo botão de evento — a relação AT/MF pode não refletir o exame.",
    );
  }

  return {
    baselineBpm,
    variabilityBpm,
    variability,
    accelerations,
    prolongedAccelerations,
    decelerations,
    movements,
    accelPer20min,
    atMfPercent,
    atMfRatio,
    contractions,
    tocoRestingTone,
    durationSec,
    fhrLossPct: trace.stats.fhrLossPct,
    warnings,
  };
}

/** Presença derivada de uma contagem (para os campos do laudo). */
export const presenceOf = (n: number): CtgPresence => (n > 0 ? "present" : "absent");
