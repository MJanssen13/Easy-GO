// Renderizador do traçado de cardiotocografia em SVG (string), estilo do papel
// clássico, porém em PRETO E BRANCO — a impressão sai sempre monocromática, então
// nada depende de cor: FHR e TOCO ficam em painéis separados, ambos em traço
// preto, sobre grade cinza. Função pura (sem React), usada tanto pela prévia na
// tela quanto pelo HTML de impressão, garantindo que o que se vê é o que imprime.

import type { CtgTrace } from "./trc";

export interface TraceSvgOptions {
  /** Pixels por segundo (largura horizontal). Padrão 2 (~equivale a papel lento). */
  pxPerSec?: number;
  /** Segundos por linha antes de quebrar para a próxima. Padrão 360 (6 min). */
  rowSec?: number;
}

const FHR_LO = 50;
const FHR_HI = 210;
const TOCO_LO = 0;
const TOCO_HI = 100;

const LEFT = 42;
const RIGHT = 12;
const FHR_H = 190;
const TOCO_H = 70;
const GAP = 8; // entre painéis FHR e TOCO
const ROW_GAP = 26; // entre linhas
const TOP = 8;

// Paleta monocromática (preto e branco).
const PANEL_BG = "#ffffff";
const GRID_LIGHT = "#cfcfcf";
const GRID_HEAVY = "#8f8f8f";
const BAND = "#efefef"; // faixa normal 110–160 bpm
const BAND_EDGE = "#7a7a7a";
const TRACE = "#000000";
const LABEL = "#555555";

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const f = (n: number) => n.toFixed(1);

/** Divide a série em segmentos contínuos, quebrando em valores nulos (perda de sinal). */
function segments(
  values: (number | null)[],
  s0: number,
  s1: number,
  left: number,
  pxPerSec: number,
  toY: (v: number) => number,
): string[] {
  const paths: string[] = [];
  let cur: string[] = [];
  for (let s = s0; s < s1 && s < values.length; s++) {
    const v = values[s];
    if (v == null) {
      if (cur.length > 1) paths.push("M " + cur.join(" L "));
      cur = [];
      continue;
    }
    const x = left + (s - s0) * pxPerSec;
    cur.push(`${f(x)},${f(toY(v))}`);
  }
  if (cur.length > 1) paths.push("M " + cur.join(" L "));
  return paths;
}

/** Gera o SVG (string) do traçado de uma gravação inteira, quebrado em linhas. */
export function renderCtgTraceSvg(trace: CtgTrace, opts: TraceSvgOptions = {}): string {
  const pxPerSec = opts.pxPerSec ?? 2;
  const rowSec = opts.rowSec ?? 360;
  const rowW = rowSec * pxPerSec;
  const width = LEFT + rowW + RIGHT;
  const rowHeight = FHR_H + GAP + TOCO_H + ROW_GAP;
  const nRows = Math.max(1, Math.ceil(trace.samples / rowSec));
  const height = TOP + nRows * rowHeight;

  const out: string[] = [];
  out.push(
    `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ` +
      `xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif" style="display:block">`,
  );

  for (let r = 0; r < nRows; r++) {
    const s0 = r * rowSec;
    const s1 = s0 + rowSec;
    const fTop = TOP + r * rowHeight;
    const tTop = fTop + FHR_H + GAP;

    const yFhr = (v: number) => fTop + ((FHR_HI - clamp(v, FHR_LO, FHR_HI)) / (FHR_HI - FHR_LO)) * FHR_H;
    const yToco = (v: number) => tTop + ((TOCO_HI - clamp(v, TOCO_LO, TOCO_HI)) / (TOCO_HI - TOCO_LO)) * TOCO_H;

    // ---- painel FHR ----
    out.push(`<rect x="${LEFT}" y="${fTop}" width="${rowW}" height="${FHR_H}" fill="${PANEL_BG}" stroke="${GRID_HEAVY}"/>`);
    // faixa normal 110–160 bpm (cinza claro, sem cor)
    out.push(
      `<rect x="${LEFT}" y="${f(yFhr(160))}" width="${rowW}" height="${f(yFhr(110) - yFhr(160))}" fill="${BAND}"/>`,
    );
    for (let v = FHR_LO; v <= FHR_HI; v += 10) {
      const edge = v === 110 || v === 160;
      const heavy = v % 30 === 0;
      const stroke = edge ? BAND_EDGE : GRID_LIGHT;
      const sw = edge ? 0.9 : heavy ? 0.8 : 0.4;
      out.push(`<line x1="${LEFT}" y1="${f(yFhr(v))}" x2="${LEFT + rowW}" y2="${f(yFhr(v))}" stroke="${stroke}" stroke-width="${sw}"/>`);
      if (v % 20 === 0) {
        out.push(`<text x="${LEFT - 4}" y="${f(yFhr(v) + 3)}" font-size="9" text-anchor="end" fill="${LABEL}">${v}</text>`);
      }
    }
    for (let sec = 0; sec <= rowSec; sec += 15) {
      const x = LEFT + sec * pxPerSec;
      const heavy = sec % 60 === 0;
      out.push(`<line x1="${f(x)}" y1="${fTop}" x2="${f(x)}" y2="${fTop + FHR_H}" stroke="${heavy ? GRID_HEAVY : GRID_LIGHT}" stroke-width="${heavy ? 0.8 : 0.35}"/>`);
      if (heavy) {
        const tsec = s0 + sec;
        const lbl = `${Math.floor(tsec / 60)}:${String(tsec % 60).padStart(2, "0")}`;
        out.push(`<text x="${f(x)}" y="${f(fTop - 2)}" font-size="8" text-anchor="middle" fill="${LABEL}">${lbl}</text>`);
      }
    }
    for (const d of segments(trace.fhr, s0, s1, LEFT, pxPerSec, yFhr)) {
      out.push(`<path d="${d}" fill="none" stroke="${TRACE}" stroke-width="1.1"/>`);
    }
    out.push(`<text x="6" y="${fTop + 12}" font-size="9" fill="${LABEL}">FHR</text>`);

    // ---- painel TOCO ----
    out.push(`<rect x="${LEFT}" y="${tTop}" width="${rowW}" height="${TOCO_H}" fill="${PANEL_BG}" stroke="${GRID_HEAVY}"/>`);
    for (let v = TOCO_LO; v <= TOCO_HI; v += 20) {
      out.push(`<line x1="${LEFT}" y1="${f(yToco(v))}" x2="${LEFT + rowW}" y2="${f(yToco(v))}" stroke="${GRID_LIGHT}" stroke-width="0.5"/>`);
      out.push(`<text x="${LEFT - 4}" y="${f(yToco(v) + 3)}" font-size="8" text-anchor="end" fill="${LABEL}">${v}</text>`);
    }
    for (let sec = 0; sec <= rowSec; sec += 60) {
      const x = LEFT + sec * pxPerSec;
      out.push(`<line x1="${f(x)}" y1="${tTop}" x2="${f(x)}" y2="${tTop + TOCO_H}" stroke="${GRID_HEAVY}" stroke-width="0.8"/>`);
    }
    for (const d of segments(trace.toco, s0, s1, LEFT, pxPerSec, yToco)) {
      out.push(`<path d="${d}" fill="none" stroke="${TRACE}" stroke-width="1.0"/>`);
    }
    out.push(`<text x="4" y="${tTop + 14}" font-size="9" fill="${LABEL}">TOCO</text>`);
  }

  out.push("</svg>");
  return out.join("");
}
