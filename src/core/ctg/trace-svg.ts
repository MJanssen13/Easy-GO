// Renderizador do traçado de cardiotocografia em SVG (string), estilo do papel
// clássico, em PRETO E BRANCO e em ESCALA FÍSICA REAL: coordenadas em milímetros
// e velocidade de papel de 1 cm/min (padrão europeu), FHR a 20 bpm/cm. O traçado
// é uma LINHA CONTÍNUA (sem quebra em faixas), pensado para caber em UMA folha
// A4 em paisagem — assim o que se vê na tela é exatamente o que sai no PDF/papel.
// Função pura (sem React); usada tanto na prévia quanto na impressão.

import type { CtgTrace } from "./trc";

export interface TraceSvgOptions {
  /** Milímetros por minuto (velocidade do papel). Padrão 10 (= 1 cm/min). */
  mmPerMin?: number;
  /** Largura máxima do traçado em mm (para caber em 1 folha). Padrão A4 paisagem. */
  maxTraceWidthMM?: number;
}

// A4 paisagem: 297 mm − 2×8 mm de margem = 281 mm úteis; menos os eixos.
const A4_LANDSCAPE_TRACE_MM = 265;

const FHR_LO = 50;
const FHR_HI = 210;
const TOCO_LO = 0;
const TOCO_HI = 100;

// Geometria em milímetros.
const LEFT = 12; // faixa de rótulos do eixo Y
const RIGHT = 4;
const TOP = 6; // rótulos de tempo acima do painel de FHR
const MM_PER_BPM = 0.5; // 20 bpm por cm
const FHR_H = (FHR_HI - FHR_LO) * MM_PER_BPM; // 80 mm
const GAP = 6; // entre painéis FHR e TOCO
const MM_PER_TOCO = 0.4; // 100 unidades em 40 mm
const TOCO_H = (TOCO_HI - TOCO_LO) * MM_PER_TOCO; // 40 mm
const BOTTOM = 4;

// Paleta monocromática (preto e branco).
const PANEL_BG = "#ffffff";
const GRID_LIGHT = "#cfcfcf";
const GRID_HEAVY = "#8f8f8f";
const BAND = "#efefef"; // faixa normal 110–160 bpm
const BAND_EDGE = "#7a7a7a";
const TRACE = "#000000";
const LABEL = "#555555";

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const f = (n: number) => n.toFixed(2);

export interface RenderedTrace {
  svg: string;
  /** Escala efetivamente usada (mm/min). Menor que a pedida se houve compressão. */
  mmPerMin: number;
  /** Verdadeiro se o traçado foi comprimido para caber em uma folha. */
  compressed: boolean;
}

/** Divide a série em segmentos contínuos, quebrando em valores nulos (perda de sinal). */
function segments(
  values: (number | null)[],
  mmPerSec: number,
  toY: (v: number) => number,
): string[] {
  const paths: string[] = [];
  let cur: string[] = [];
  for (let s = 0; s < values.length; s++) {
    const v = values[s];
    if (v == null) {
      if (cur.length > 1) paths.push("M " + cur.join(" L "));
      cur = [];
      continue;
    }
    const x = LEFT + s * mmPerSec;
    cur.push(`${f(x)},${f(toY(v))}`);
  }
  if (cur.length > 1) paths.push("M " + cur.join(" L "));
  return paths;
}

/** Gera o SVG (string) do traçado de uma gravação em linha contínua, escala real. */
export function renderCtgTrace(trace: CtgTrace, opts: TraceSvgOptions = {}): RenderedTrace {
  const requested = opts.mmPerMin ?? 10;
  const maxW = opts.maxTraceWidthMM ?? A4_LANDSCAPE_TRACE_MM;
  const durationMin = trace.samples / 60;
  // Comprime só se, a 1 cm/min, não couber em uma folha.
  const mmPerMin = durationMin > 0 ? Math.min(requested, maxW / durationMin) : requested;
  const compressed = mmPerMin < requested - 1e-6;
  const mmPerSec = mmPerMin / 60;

  const traceW = trace.samples * mmPerSec;
  const width = LEFT + traceW + RIGHT;
  const fTop = TOP;
  const tTop = fTop + FHR_H + GAP;
  const height = tTop + TOCO_H + BOTTOM;

  const yFhr = (v: number) => fTop + (FHR_HI - clamp(v, FHR_LO, FHR_HI)) * MM_PER_BPM;
  const yToco = (v: number) => tTop + (TOCO_HI - clamp(v, TOCO_LO, TOCO_HI)) * MM_PER_TOCO;

  const out: string[] = [];
  out.push(
    `<svg width="${f(width)}mm" height="${f(height)}mm" viewBox="0 0 ${f(width)} ${f(height)}" ` +
      `xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif" style="display:block">`,
  );

  // ---- painel FHR ----
  out.push(`<rect x="${LEFT}" y="${fTop}" width="${f(traceW)}" height="${FHR_H}" fill="${PANEL_BG}" stroke="${GRID_HEAVY}" stroke-width="0.3"/>`);
  // faixa normal 110–160 bpm em cinza claro (sem cor)
  out.push(`<rect x="${LEFT}" y="${f(yFhr(160))}" width="${f(traceW)}" height="${f(yFhr(110) - yFhr(160))}" fill="${BAND}"/>`);
  for (let v = FHR_LO; v <= FHR_HI; v += 10) {
    const edge = v === 110 || v === 160;
    const heavy = v % 20 === 0; // linhas de cm (20 bpm)
    const stroke = edge ? BAND_EDGE : GRID_LIGHT;
    const sw = edge ? 0.3 : heavy ? 0.22 : 0.12;
    out.push(`<line x1="${LEFT}" y1="${f(yFhr(v))}" x2="${f(LEFT + traceW)}" y2="${f(yFhr(v))}" stroke="${stroke}" stroke-width="${sw}"/>`);
    if (v % 20 === 0) {
      out.push(`<text x="${LEFT - 1.5}" y="${f(yFhr(v) + 1)}" font-size="2.6" text-anchor="end" fill="${LABEL}">${v}</text>`);
    }
  }
  // ---- painel TOCO ----
  out.push(`<rect x="${LEFT}" y="${f(tTop)}" width="${f(traceW)}" height="${TOCO_H}" fill="${PANEL_BG}" stroke="${GRID_HEAVY}" stroke-width="0.3"/>`);
  for (let v = TOCO_LO; v <= TOCO_HI; v += 20) {
    out.push(`<line x1="${LEFT}" y1="${f(yToco(v))}" x2="${f(LEFT + traceW)}" y2="${f(yToco(v))}" stroke="${GRID_LIGHT}" stroke-width="0.12"/>`);
    out.push(`<text x="${LEFT - 1.5}" y="${f(yToco(v) + 1)}" font-size="2.4" text-anchor="end" fill="${LABEL}">${v}</text>`);
  }

  // ---- linhas verticais de tempo (comuns aos dois painéis) ----
  const totalSec = trace.samples;
  for (let sec = 0; sec <= totalSec; sec += 20) {
    const x = LEFT + sec * mmPerSec;
    const isMin = sec % 60 === 0;
    // FHR
    out.push(`<line x1="${f(x)}" y1="${fTop}" x2="${f(x)}" y2="${f(fTop + FHR_H)}" stroke="${isMin ? GRID_HEAVY : GRID_LIGHT}" stroke-width="${isMin ? 0.22 : 0.1}"/>`);
    // TOCO
    out.push(`<line x1="${f(x)}" y1="${f(tTop)}" x2="${f(x)}" y2="${f(tTop + TOCO_H)}" stroke="${isMin ? GRID_HEAVY : GRID_LIGHT}" stroke-width="${isMin ? 0.22 : 0.1}"/>`);
    if (isMin) {
      out.push(`<text x="${f(x)}" y="${f(fTop - 1.5)}" font-size="2.4" text-anchor="middle" fill="${LABEL}">${sec / 60}</text>`);
    }
  }

  // ---- traçados ----
  for (const d of segments(trace.fhr, mmPerSec, yFhr)) {
    out.push(`<path d="${d}" fill="none" stroke="${TRACE}" stroke-width="0.4" stroke-linejoin="round"/>`);
  }
  for (const d of segments(trace.toco, mmPerSec, yToco)) {
    out.push(`<path d="${d}" fill="none" stroke="${TRACE}" stroke-width="0.35" stroke-linejoin="round"/>`);
  }

  // ---- rótulos dos painéis e escala ----
  out.push(`<text x="1" y="${f(fTop + 4)}" font-size="2.6" fill="${LABEL}">FHR</text>`);
  out.push(`<text x="1" y="${f(fTop + 7)}" font-size="2" fill="${LABEL}">bpm</text>`);
  out.push(`<text x="1" y="${f(tTop + 5)}" font-size="2.6" fill="${LABEL}">TOCO</text>`);
  const scaleLabel = compressed ? `${mmPerMin.toFixed(1)} mm/min` : "1 cm/min";
  out.push(`<text x="${f(LEFT + 1)}" y="${f(height - 1)}" font-size="2.2" fill="${LABEL}">${scaleLabel} · eixo em minutos</text>`);

  out.push("</svg>");
  return { svg: out.join(""), mmPerMin, compressed };
}

/** Conveniência: retorna apenas o SVG (string) com as opções padrão. */
export function renderCtgTraceSvg(trace: CtgTrace, opts: TraceSvgOptions = {}): string {
  return renderCtgTrace(trace, opts).svg;
}
