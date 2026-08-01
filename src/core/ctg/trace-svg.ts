// Renderizador do traçado de cardiotocografia em SVG (string), em PRETO E BRANCO
// e ESCALA FÍSICA REAL. Linha contínua (sem quebra em faixas), pensado para caber
// em UMA folha A4 em paisagem por gravação. Coordenadas em milímetros:
//   • horizontal: 1 cm/min (papel);
//   • FHR: 1 cm / 30 bpm  (vertical);
//   • TOCO: 1 cm / 25 mmHg (vertical).
// Expõe também as marcações (botão de evento) e os autozeros do TOCO.
// Função pura (sem React); usada tanto na prévia quanto na impressão.

import type { CtgTrace } from "./trc";
import type { TraceMark } from "./stimuli";

export interface TraceSvgOptions {
  /** Milímetros por minuto (velocidade do papel). Padrão 10 (= 1 cm/min). */
  mmPerMin?: number;
  /** Largura máxima do traçado em mm (para caber em 1 folha). Padrão A4 paisagem. */
  maxTraceWidthMM?: number;
  /** Marcas a desenhar. Se ausente, deriva dos eventos do próprio arquivo. */
  marks?: TraceMark[];
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
const MM_PER_BPM = 10 / 30; // 1 cm = 30 bpm
const FHR_H = (FHR_HI - FHR_LO) * MM_PER_BPM; // ≈ 53,3 mm
const GAP = 11; // espaço entre painéis FHR e TOCO (setas de movimento + selos de estímulo)
const MM_PER_MMHG = 10 / 25; // 1 cm = 25 mmHg
const TOCO_H = (TOCO_HI - TOCO_LO) * MM_PER_MMHG; // 40 mm
const MARK_H = 4; // faixa inferior para marcações/legenda
const BOTTOM = 6;

// Espessura dos traçados (mm) — bem finos.
const FHR_SW = 0.14;
const TOCO_SW = 0.12;

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
  const mmPerMin = durationMin > 0 ? Math.min(requested, maxW / durationMin) : requested;
  const compressed = mmPerMin < requested - 1e-6;
  const mmPerSec = mmPerMin / 60;

  const traceW = trace.samples * mmPerSec;
  const width = LEFT + traceW + RIGHT;
  const fTop = TOP;
  const tTop = fTop + FHR_H + GAP;
  const tBottom = tTop + TOCO_H;
  const height = tBottom + MARK_H + BOTTOM;

  const yFhr = (v: number) => fTop + (FHR_HI - clamp(v, FHR_LO, FHR_HI)) * MM_PER_BPM;
  const yToco = (v: number) => tTop + (TOCO_HI - clamp(v, TOCO_LO, TOCO_HI)) * MM_PER_MMHG;
  const xAt = (sec: number) => LEFT + sec * mmPerSec;

  const out: string[] = [];
  // `data-*` expõem a geometria (em mm) para converter pixel → segundo ao
  // arrastar um estímulo na prévia.
  out.push(
    `<svg width="${f(width)}mm" height="${f(height)}mm" viewBox="0 0 ${f(width)} ${f(height)}" ` +
      `xmlns="http://www.w3.org/2000/svg" font-family="Arial, sans-serif" style="display:block" ` +
      `data-left="${f(LEFT)}" data-mm-per-sec="${mmPerSec}" data-samples="${trace.samples}">`,
  );

  // ---- painel FHR (1 cm = 30 bpm) ----
  out.push(`<rect x="${LEFT}" y="${fTop}" width="${f(traceW)}" height="${f(FHR_H)}" fill="${PANEL_BG}" stroke="${GRID_HEAVY}" stroke-width="0.3"/>`);
  out.push(`<rect x="${LEFT}" y="${f(yFhr(160))}" width="${f(traceW)}" height="${f(yFhr(110) - yFhr(160))}" fill="${BAND}"/>`);
  for (let v = FHR_LO; v <= FHR_HI; v += 10) {
    const edge = v === 110 || v === 160;
    const heavy = v % 30 === 0; // linhas de cm (30 bpm)
    const stroke = edge ? BAND_EDGE : GRID_LIGHT;
    const sw = edge ? 0.28 : heavy ? 0.22 : 0.1;
    out.push(`<line x1="${LEFT}" y1="${f(yFhr(v))}" x2="${f(LEFT + traceW)}" y2="${f(yFhr(v))}" stroke="${stroke}" stroke-width="${sw}"/>`);
    if (heavy || edge) {
      out.push(`<text x="${LEFT - 1.5}" y="${f(yFhr(v) + 1)}" font-size="2.4" text-anchor="end" fill="${LABEL}">${v}</text>`);
    }
  }

  // ---- painel TOCO (1 cm = 25 mmHg) ----
  out.push(`<rect x="${LEFT}" y="${f(tTop)}" width="${f(traceW)}" height="${f(TOCO_H)}" fill="${PANEL_BG}" stroke="${GRID_HEAVY}" stroke-width="0.3"/>`);
  for (let v = TOCO_LO; v <= TOCO_HI; v += 25) {
    out.push(`<line x1="${LEFT}" y1="${f(yToco(v))}" x2="${f(LEFT + traceW)}" y2="${f(yToco(v))}" stroke="${GRID_LIGHT}" stroke-width="0.15"/>`);
    out.push(`<text x="${LEFT - 1.5}" y="${f(yToco(v) + 1)}" font-size="2.4" text-anchor="end" fill="${LABEL}">${v}</text>`);
  }

  // ---- linhas verticais de tempo (1 cm/min) ----
  const totalSec = trace.samples;
  for (let sec = 0; sec <= totalSec; sec += 20) {
    const x = xAt(sec);
    const isMin = sec % 60 === 0;
    out.push(`<line x1="${f(x)}" y1="${fTop}" x2="${f(x)}" y2="${f(fTop + FHR_H)}" stroke="${isMin ? GRID_HEAVY : GRID_LIGHT}" stroke-width="${isMin ? 0.22 : 0.1}"/>`);
    out.push(`<line x1="${f(x)}" y1="${f(tTop)}" x2="${f(x)}" y2="${f(tBottom)}" stroke="${isMin ? GRID_HEAVY : GRID_LIGHT}" stroke-width="${isMin ? 0.22 : 0.1}"/>`);
    if (isMin) {
      out.push(`<text x="${f(x)}" y="${f(fTop - 1.5)}" font-size="2.4" text-anchor="middle" fill="${LABEL}">${sec / 60}</text>`);
    }
  }

  // ---- traçados (finos) ----
  for (const d of segments(trace.fhr, mmPerSec, yFhr)) {
    out.push(`<path d="${d}" fill="none" stroke="${TRACE}" stroke-width="${FHR_SW}" stroke-linejoin="round"/>`);
  }
  for (const d of segments(trace.toco, mmPerSec, yToco)) {
    out.push(`<path d="${d}" fill="none" stroke="${TRACE}" stroke-width="${TOCO_SW}" stroke-linejoin="round"/>`);
  }

  // ---- marcas: movimento fetal, estímulos e autozeros ----
  // MOVIMENTO FETAL → seta para cima, logo abaixo do painel de FHR, na posição
  // real do evento (convenção do papel de cardiotocografia). Uma seta por evento;
  // setas próximas podem se sobrepor.
  // ESTÍMULOS (EM/ES) → linha indicativa vertical na posição real (sólida =
  // mecânico, tracejada = sonoro) + selo circular com a sigla, numa faixa própria
  // abaixo das setas. Selos que se sobreporiam são deslocados na horizontal e
  // ligados à sua linha por um fio-guia. Cada selo é arrastável (`data-stim`).
  // AUTOZERO → triângulo vazado na linha de base do TOCO.
  const marks =
    opts.marks ??
    trace.events.map((e) => ({ positionSec: e.positionSec, kind: e.kind } as TraceMark));
  const gapTop = fTop + FHR_H;
  const ARROW_TIP = gapTop + 0.7; // ponta da seta (encostada no painel de FHR)
  const ARROW_BASE = gapTop + 4.6; // base da seta
  const STIM_CY = gapTop + 8.0; // centro dos selos de estímulo

  const DASH: Record<"mecanico" | "sonoro", string> = { mecanico: "", sonoro: "1.6 1" };
  const TAG: Record<"mecanico" | "sonoro", string> = { mecanico: "EM", sonoro: "ES" };

  // 1) Autozeros; separa movimentos (setas) e estímulos (selos).
  const movesX: number[] = [];
  const stims: { x: number; kind: "mecanico" | "sonoro"; id?: string }[] = [];
  for (const mk of marks) {
    const x = clamp(xAt(mk.positionSec), LEFT, LEFT + traceW);
    if (mk.kind === "autozero") {
      const y = yToco(TOCO_LO);
      out.push(`<path d="M ${f(x - 1.4)} ${f(y)} L ${f(x + 1.4)} ${f(y)} L ${f(x)} ${f(y - 2.6)} Z" fill="#fff" stroke="#000" stroke-width="0.2"/>`);
      out.push(`<text x="${f(x + 2)}" y="${f(y - 0.5)}" font-size="2.2" fill="${LABEL}">AZ</text>`);
    } else if (mk.kind === "movimento") {
      movesX.push(x);
    } else {
      stims.push({ x, kind: mk.kind, id: mk.id });
    }
  }

  // 2) Setas de movimento fetal: UMA por evento, sempre na posição real. Setas
  //    próximas podem se sobrepor — a aglomeração é a própria leitura de que
  //    houve muitos movimentos ali, e nenhum evento é omitido.
  const AR_HALF = 0.85; // meia-largura da cabeça da seta
  movesX.sort((a, b) => a - b);
  for (const x of movesX) {
    out.push(`<path d="M ${f(x)} ${f(ARROW_BASE)} L ${f(x)} ${f(ARROW_TIP + 1.6)}" stroke="#000" stroke-width="0.32" fill="none"/>`);
    out.push(`<path d="M ${f(x - AR_HALF)} ${f(ARROW_TIP + 1.9)} L ${f(x)} ${f(ARROW_TIP)} L ${f(x + AR_HALF)} ${f(ARROW_TIP + 1.9)} Z" fill="#000"/>`);
  }

  // 3) Selos de estímulo: linha na posição real, selo deslocado só o necessário
  //    para não colidir com o anterior, com fio-guia quando sai do lugar.
  const R = 2.4; // raio do selo
  const PAD = 0.7; // folga mínima entre selos
  const FS = 2.2;
  stims.sort((a, b) => a.x - b.x);
  let usedRight = -Infinity;
  for (const s of stims) {
    const da = DASH[s.kind] ? ` stroke-dasharray="${DASH[s.kind]}"` : "";
    let bx = clamp(s.x, LEFT + R, Math.max(LEFT + R, LEFT + traceW - R));
    if (bx - R < usedRight + PAD) bx = usedRight + PAD + R;
    usedRight = bx + R;
    const attrs = s.id ? ` data-stim="${s.id}" data-kind="${s.kind}" style="cursor:grab"` : "";
    out.push(`<g${attrs}>`);
    out.push(`<line x1="${f(s.x)}" y1="${f(fTop)}" x2="${f(s.x)}" y2="${f(tBottom)}" stroke="#000" stroke-width="0.2"${da}/>`);
    if (Math.abs(bx - s.x) > 0.15) {
      // fio-guia ligando o selo deslocado à sua linha (posição verdadeira).
      out.push(`<path d="M ${f(s.x)} ${f(STIM_CY - R)} L ${f(bx)} ${f(STIM_CY - R)}" stroke="#000" stroke-width="0.15" stroke-dasharray="0.4 0.4" fill="none"/>`);
    }
    // área de captura maior, para facilitar o arrasto.
    out.push(`<circle cx="${f(bx)}" cy="${f(STIM_CY)}" r="${f(R + 1.2)}" fill="transparent"/>`);
    out.push(`<circle cx="${f(bx)}" cy="${f(STIM_CY)}" r="${f(R)}" fill="#000"/>`);
    out.push(`<text x="${f(bx)}" y="${f(STIM_CY)}" font-size="${FS}" text-anchor="middle" dominant-baseline="central" fill="#fff">${TAG[s.kind]}</text>`);
    out.push(`</g>`);
  }

  // ---- rótulos dos painéis, escala e legenda ----
  out.push(`<text x="1" y="${f(fTop + 4)}" font-size="2.6" fill="${LABEL}">FHR</text>`);
  out.push(`<text x="1" y="${f(fTop + 7)}" font-size="2" fill="${LABEL}">bpm</text>`);
  out.push(`<text x="1" y="${f(tTop + 5)}" font-size="2.6" fill="${LABEL}">TOCO</text>`);
  out.push(`<text x="1" y="${f(tTop + 8)}" font-size="2" fill="${LABEL}">mmHg</text>`);
  const scaleLabel = compressed
    ? `${mmPerMin.toFixed(1)} mm/min (comprimido) · FHR 30 bpm/cm · TOCO 25 mmHg/cm · eixo em minutos`
    : `1 cm/min · FHR 30 bpm/cm · TOCO 25 mmHg/cm · eixo em minutos`;
  const legendY = height - 1.5;
  const lx = LEFT + 1;
  // legenda: seta (movimento fetal), selos dos estímulos e o autozero.
  const legItem = (x: number, dash: string, tag: string, text: string): number => {
    const cy = legendY - 0.9;
    const da = dash ? ` stroke-dasharray="${dash}"` : "";
    out.push(`<line x1="${f(x)}" y1="${f(cy - 2)}" x2="${f(x)}" y2="${f(cy + 2)}" stroke="#000" stroke-width="0.25"${da}/>`);
    out.push(`<circle cx="${f(x)}" cy="${f(cy)}" r="1.8" fill="#000"/>`);
    out.push(`<text x="${f(x)}" y="${f(cy)}" font-size="1.7" text-anchor="middle" dominant-baseline="central" fill="#fff">${tag}</text>`);
    out.push(`<text x="${f(x + 2.6)}" y="${f(legendY)}" font-size="2.2" fill="${LABEL}">${text}</text>`);
    return x + 2.6 + text.length * 1.25 + 4;
  };
  const legArrow = (x: number, text: string): number => {
    const cy = legendY - 0.9;
    out.push(`<path d="M ${f(x)} ${f(cy + 2)} L ${f(x)} ${f(cy - 1.1)}" stroke="#000" stroke-width="0.32" fill="none"/>`);
    out.push(`<path d="M ${f(x - 0.85)} ${f(cy - 0.8)} L ${f(x)} ${f(cy - 2.3)} L ${f(x + 0.85)} ${f(cy - 0.8)} Z" fill="#000"/>`);
    out.push(`<text x="${f(x + 2)}" y="${f(legendY)}" font-size="2.2" fill="${LABEL}">${text}</text>`);
    return x + 2 + text.length * 1.25 + 4;
  };
  let cx = lx;
  cx = legArrow(cx, "movimento fetal");
  cx = legItem(cx, "", "EM", "est. mecânico");
  cx = legItem(cx, "1.6 1", "ES", "est. sonoro");
  // autozero (triângulo)
  out.push(`<path d="M ${f(cx)} ${f(legendY)} L ${f(cx + 2.8)} ${f(legendY)} L ${f(cx + 1.4)} ${f(legendY - 2.4)} Z" fill="#fff" stroke="#000" stroke-width="0.2"/>`);
  out.push(`<text x="${f(cx + 4)}" y="${f(legendY)}" font-size="2.2" fill="${LABEL}">AZ = autozero</text>`);
  cx += 4 + 13 * 1.25 + 5;
  out.push(`<text x="${f(cx)}" y="${f(legendY)}" font-size="2.2" fill="${LABEL}">${scaleLabel}</text>`);

  out.push("</svg>");
  return { svg: out.join(""), mmPerMin, compressed };
}

/** Conveniência: retorna apenas o SVG (string) com as opções padrão. */
export function renderCtgTraceSvg(trace: CtgTrace, opts: TraceSvgOptions = {}): string {
  return renderCtgTrace(trace, opts).svg;
}
