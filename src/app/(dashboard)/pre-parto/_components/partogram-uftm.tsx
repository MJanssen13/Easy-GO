"use client";

import { useMemo, useRef, useState } from "react";
import { Eraser, MousePointer2, X } from "lucide-react";
import type {
  ContractionStrength,
  UftmContractionBlock,
  UftmHeader,
  UftmPoint,
  UftmTableColumn,
} from "@/core/partogram/types";
import { UFTM_COLS, type UftmAuto } from "@/core/partogram/derive";
import { cn } from "@/lib/utils";

/**
 * Ficha de Trabalho de Parto do HC-UFTM (modelo antigo), portada da plataforma
 * original (MJanssen13/Preparto, PartogramPage). Coordenadas exatas do SVG da
 * ficha (2481 × 3508). Pontos automáticos (das aferições) em azul na tela e
 * pretos na impressão; lançamentos manuais prevalecem na mesma célula.
 */

const VIEWBOX_W = 2481;
const VIEWBOX_H = 3508;
const SCALE = 1.04175;
const TRANS_X = -50.052284;
const TRANS_Y = -610.189202;
const toVisualX = (x: number) => x * SCALE + TRANS_X;
const toVisualY = (y: number) => y * SCALE + TRANS_Y;
const toInternalX = (vx: number) => (vx - TRANS_X) / SCALE;
const toInternalY = (vy: number) => (vy - TRANS_Y) / SCALE;

const GRID_X_START = 524.925;
const GRID_X_END = 1805.482;
const COL_WIDTH = 80.0348;
const Y_DILATION_10 = 1211.165;
const Y_DILATION_0 = 1804.416;
const GRAPH_H = Y_DILATION_0 - Y_DILATION_10;
const Y_BCF_180 = 2036.406;
const Y_BCF_80 = 2625.733;
const BCF_H = Y_BCF_80 - Y_BCF_180;
const Y_CONTRACTION_TOP = 2711.777;
const Y_CONTRACTION_BOTTOM = 2994.665;
const CONTRACTION_ROW_H = (Y_CONTRACTION_BOTTOM - Y_CONTRACTION_TOP) / 5;
const Y_TIME_REAL_TOP = 1888.829;
const TIME_ROW_H = 88.0;
const Y_TIME_REG_TOP = 1976.829;

type TableKey = "amnioticFluid" | "la" | "oxytocin" | "meds" | "examiner";
const TABLE_ROWS: { key: TableKey; y: number; h: number; rotate?: boolean; font: number }[] = [
  { key: "amnioticFluid", y: 2994.665, h: 61.5, font: 20 },
  { key: "la", y: 3056.164, h: 61.5, font: 18 },
  { key: "oxytocin", y: 3117.664, h: 61.5, font: 18 },
  { key: "meds", y: 3179.163, h: 553.066, rotate: true, font: 27 },
  { key: "examiner", y: 3732.229, h: 160.037, rotate: true, font: 27 },
];

export const VARIETIES = [
  { id: "P", label: "Padrão" },
  { id: "PS", label: "Pélvica simples" },
  { id: "PP", label: "Pélvica podal" },
  { id: "O", label: "Occipto" },
  { id: "B", label: "Bregma" },
  { id: "N", label: "Nariz" },
  { id: "M", label: "Mento" },
];
const varietySrc = (id: string) => `/partograma/variedades/${id}.png`;

const HEADER_FIELDS: { key: keyof UftmHeader; x: number; y: number; w: number }[] = [
  { key: "name", x: 400, y: 803, w: 1900 },
  { key: "date", x: 330, y: 882, w: 550 },
  { key: "id", x: 1130, y: 882, w: 600 },
  { key: "age", x: 1980, y: 882, w: 250 },
  { key: "dum", x: 340, y: 973, w: 500 },
  { key: "dpp", x: 850, y: 973, w: 330 },
  { key: "ig", x: 1427, y: 973, w: 480 },
  { key: "us", x: 1938, y: 973, w: 280 },
  { key: "parity", x: 430, y: 1056, w: 500 },
  { key: "bloodType", x: 1120, y: 1056, w: 560 },
  { key: "babyName", x: 1700, y: 1056, w: 500 },
];

export interface UftmManual {
  points: UftmPoint[];
  contractionBlocks: UftmContractionBlock[];
  tableData: UftmTableColumn[];
  activePhaseStartIndex?: number;
  headerData: UftmHeader;
  observations: string;
}

type Mode = "select" | "eraser";

export function emptyTable(): UftmTableColumn[] {
  return Array.from({ length: UFTM_COLS }, (_, i) => ({
    hourIndex: i,
    realTime: "",
    amnioticFluid: "",
    la: "",
    oxytocin: "",
    meds: "",
    examiner: "",
    notes: "",
  }));
}

export function PartogramUftm({
  manual,
  auto,
  onChange,
}: {
  manual: UftmManual;
  auto: UftmAuto;
  onChange: (m: UftmManual) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [mode, setMode] = useState<Mode>("select");
  const set = (patch: Partial<UftmManual>) => onChange({ ...manual, ...patch });

  // ---------------------------- mescla auto + manual ----------------------------
  const merged = useMemo(() => {
    const man = manual.points;
    const has = (p: UftmPoint) =>
      man.some((m) => m.type === p.type && (p.type === "fcf" ? Math.abs(m.x - p.x) < 0.02 : m.x === p.x));
    const points = [
      ...man.map((p) => ({ ...p, auto: false })),
      ...auto.points.filter((p) => !has(p)).map((p) => ({ ...p, auto: true })),
    ];
    const manualHours = new Set(manual.contractionBlocks.map((c) => c.x));
    const blocks = [
      ...manual.contractionBlocks.map((c) => ({ ...c, auto: false })),
      ...auto.contractionBlocks.filter((c) => !manualHours.has(c.x)).map((c) => ({ ...c, auto: true })),
    ];
    const table = manual.tableData.map((col, i) => {
      const a = auto.table[i] ?? {};
      const pick = (k: keyof UftmTableColumn) => {
        const m = (col[k] as string | undefined) ?? "";
        return m.trim() ? { v: m, auto: false } : { v: ((a[k] as string | undefined) ?? "").toString(), auto: true };
      };
      return {
        realTime: pick("realTime"),
        registerHour: pick("registerHour"),
        amnioticFluid: pick("amnioticFluid"),
        la: pick("la"),
        oxytocin: pick("oxytocin"),
        meds: pick("meds"),
        examiner: pick("examiner"),
      };
    });
    // Linha de alerta: manual; senão 1º ponto de dilatação ≥ 4 cm (partograma
    // OMS 1994 — fase ativa a partir de 4 cm, linha de ação 4 h à direita).
    const dil = points.filter((p) => p.type === "dilation").sort((a, b) => a.x - b.x);
    const activeIdx =
      manual.activePhaseStartIndex != null
        ? manual.activePhaseStartIndex
        : dil.find((p) => p.y >= 4)?.x;
    return { points, blocks, table, activeIdx };
  }, [manual, auto]);

  // --------------------------------- menus ---------------------------------
  const [exam, setExam] = useState<{
    hour: number;
    vx: number;
    vy: number;
    dilation: number | null;
    station: number | null;
    variety?: string;
    rotation: number;
  } | null>(null);
  const [bcf, setBcf] = useState<{ hour: number; vx: number; vy: number; readings: { value: string; minutes: string }[] } | null>(null);
  const [dyn, setDyn] = useState<{ hour: number; vx: number; vy: number; weak: number; moderate: number; strong: number } | null>(null);

  function onSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const vx = (e.clientX - r.left) * (VIEWBOX_W / r.width);
    const vy = (e.clientY - r.top) * (VIEWBOX_H / r.height);
    const x = toInternalX(vx);
    const y = toInternalY(vy);
    if (x < GRID_X_START || x > GRID_X_END) return;
    const colRaw = (x - GRID_X_START) / COL_WIDTH;
    const hour = Math.floor(colRaw);
    if (hour < 0 || hour >= UFTM_COLS) return;
    setExam(null);
    setBcf(null);
    setDyn(null);

    if (y >= Y_DILATION_10 && y <= Y_DILATION_0) {
      if (mode === "eraser") {
        set({ points: manual.points.filter((p) => !(p.x === hour && (p.type === "dilation" || p.type === "station"))) });
        return;
      }
      const d = merged.points.find((p) => p.x === hour && p.type === "dilation");
      const s = merged.points.find((p) => p.x === hour && p.type === "station");
      setExam({ hour, vx, vy, dilation: d ? d.y : null, station: s ? 6 - s.y : null, variety: s?.variety, rotation: s?.rotation ?? 0 });
    } else if (y >= Y_BCF_180 && y <= Y_BCF_80) {
      if (mode === "eraser") {
        set({ points: manual.points.filter((p) => !(p.type === "fcf" && Math.floor(p.x) === hour)) });
        return;
      }
      const existing = merged.points.filter((p) => p.type === "fcf" && Math.floor(p.x) === hour);
      const readings = existing.map((p) => ({ value: String(p.y), minutes: String(Math.round((p.x - hour) * 60)) }));
      const bpm = Math.round((180 - ((y - Y_BCF_180) * 100) / BCF_H) / 5) * 5;
      const mins = Math.round(((colRaw - hour) * 60) / 5) * 5;
      if (readings.length < 4 && !readings.some((r) => Math.abs(Number(r.minutes) - mins) < 3))
        readings.push({ value: String(bpm), minutes: String(Math.min(55, mins)) });
      while (readings.length < 4) readings.push({ value: "", minutes: "" });
      setBcf({ hour, vx, vy, readings });
    } else if (y >= Y_CONTRACTION_TOP && y <= Y_CONTRACTION_BOTTOM) {
      if (mode === "eraser") {
        set({ contractionBlocks: manual.contractionBlocks.filter((c) => c.x !== hour) });
        return;
      }
      const ex = merged.blocks.filter((c) => c.x === hour);
      setDyn({
        hour,
        vx,
        vy,
        weak: ex.filter((c) => c.type === "weak").length,
        moderate: ex.filter((c) => c.type === "moderate").length,
        strong: ex.filter((c) => c.type === "strong").length,
      });
    }
  }

  function confirmExam() {
    if (!exam) return;
    let pts = manual.points.filter((p) => !(p.x === exam.hour && (p.type === "dilation" || p.type === "station")));
    if (exam.dilation != null) pts = [...pts, { x: exam.hour, y: exam.dilation, type: "dilation" }];
    if (exam.station != null)
      pts = [...pts, { x: exam.hour, y: 6 - exam.station, type: "station", variety: exam.variety, rotation: exam.rotation }];
    set({ points: pts });
    setExam(null);
  }

  function confirmBcf() {
    if (!bcf) return;
    const others = manual.points.filter((p) => !(p.type === "fcf" && Math.floor(p.x) === bcf.hour));
    const next: UftmPoint[] = bcf.readings
      .filter((r) => r.value !== "" && r.minutes !== "")
      .map((r) => ({ x: bcf.hour + Math.min(59, Math.max(0, Number(r.minutes))) / 60, y: Number(r.value), type: "fcf" as const }))
      .filter((p) => p.y >= 80 && p.y <= 180);
    set({ points: [...others, ...next] });
    setBcf(null);
  }

  function confirmDyn() {
    if (!dyn) return;
    const others = manual.contractionBlocks.filter((c) => c.x !== dyn.hour);
    const next: UftmContractionBlock[] = [];
    let slot = 0;
    const push = (n: number, type: ContractionStrength) => {
      for (let i = 0; i < n && slot < 5; i++) next.push({ x: dyn.hour, slot: slot++, type });
    };
    push(dyn.strong, "strong");
    push(dyn.moderate, "moderate");
    push(dyn.weak, "weak");
    set({ contractionBlocks: [...others, ...next] });
    setDyn(null);
  }

  const setCell = (i: number, key: keyof UftmTableColumn, v: string) =>
    set({ tableData: manual.tableData.map((c, j) => (j === i ? { ...c, [key]: v.toUpperCase() } : c)) });

  const menuStyle = (vx: number, vy: number): React.CSSProperties => {
    const xp = (vx / VIEWBOX_W) * 100;
    const yp = (vy / VIEWBOX_H) * 100;
    return {
      position: "absolute",
      left: xp > 50 ? "auto" : `calc(${xp}% + 10px)`,
      right: xp > 50 ? `calc(${100 - xp}% + 10px)` : "auto",
      top: yp > 50 ? "auto" : `calc(${yp}% + 10px)`,
      bottom: yp > 50 ? `calc(${100 - yp}% + 10px)` : "auto",
      zIndex: 40,
    };
  };

  const fcf = merged.points.filter((p) => p.type === "fcf").sort((a, b) => a.x - b.x);
  const fcfPath = fcf
    .map((p, i) => `${i ? "L" : "M"} ${GRID_X_START + p.x * COL_WIDTH} ${Y_BCF_180 + ((180 - p.y) / 100) * BCF_H}`)
    .join(" ");
  const ink = (autoPt: boolean) => (autoPt ? "pg-auto" : "pg-ink");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("select")}
            className={cn("flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold", mode === "select" && "bg-background shadow-sm")}
          >
            <MousePointer2 className="h-3.5 w-3.5" /> Lançar
          </button>
          <button
            type="button"
            onClick={() => setMode("eraser")}
            className={cn("flex items-center gap-1 rounded-md px-3 py-1 text-xs font-semibold", mode === "eraser" && "bg-background text-destructive shadow-sm")}
          >
            <Eraser className="h-3.5 w-3.5" /> Apagar
          </button>
        </div>
        <span className="text-xs text-muted-foreground">
          Toque no gráfico de dilatação, BCF ou contrações da hora. <span className="font-semibold text-blue-700">Azul</span> = veio das
          aferições (corrija na aferição); preto = lançado aqui.
        </span>
        <label className="ml-auto flex items-center gap-1 text-xs">
          Linha de alerta na hora
          <select
            className="h-7 rounded border px-1"
            value={manual.activePhaseStartIndex ?? ""}
            onChange={(e) => set({ activePhaseStartIndex: e.target.value === "" ? undefined : Number(e.target.value) })}
          >
            <option value="">auto (1º ponto ≥ 4 cm)</option>
            {Array.from({ length: UFTM_COLS }, (_, i) => (
              <option key={i} value={i}>
                {i + 1}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto print:overflow-visible">
        <div
          className="pg-sheet relative mx-auto bg-white shadow-lg print:shadow-none"
          style={{ width: "210mm", height: "297mm", minWidth: "210mm" }}
        >
          <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
            width="100%"
            height="100%"
            preserveAspectRatio="none"
            className={cn("select-none", mode === "eraser" ? "cursor-not-allowed" : "cursor-crosshair")}
            onClick={onSvgClick}
          >
            <image href="/partograma/uftm.png" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" />
            <g transform={`matrix(${SCALE},0,0,${SCALE},${TRANS_X},${TRANS_Y})`}>
              {HEADER_FIELDS.map((f) => (
                <foreignObject key={f.key} x={f.x} y={f.y} width={f.w} height={120}>
                  <input
                    value={manual.headerData[f.key] ?? ""}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => set({ headerData: { ...manual.headerData, [f.key]: e.target.value.toUpperCase() } })}
                    className="h-full w-full border-none bg-transparent text-[40px] font-bold uppercase text-black outline-none"
                  />
                </foreignObject>
              ))}

              {merged.activeIdx != null &&
                (() => {
                  const p = merged.points.find((pt) => pt.x === merged.activeIdx && pt.type === "dilation");
                  if (!p) return null;
                  const x1 = GRID_X_START + merged.activeIdx * COL_WIDTH + COL_WIDTH / 2;
                  const y1 = Y_DILATION_10 + ((10 - p.y) / 10) * GRAPH_H;
                  const x2 = x1 + (10 - p.y) * COL_WIDTH;
                  return (
                    <g>
                      <line x1={x1} y1={y1} x2={x2} y2={Y_DILATION_10} stroke="black" strokeWidth={6} />
                      <line x1={x1 + 4 * COL_WIDTH} y1={y1} x2={x2 + 4 * COL_WIDTH} y2={Y_DILATION_10} stroke="black" strokeWidth={8} />
                    </g>
                  );
                })()}

              {merged.points
                .filter((p) => p.type === "dilation")
                .map((p, i) => {
                  const cx = GRID_X_START + p.x * COL_WIDTH + COL_WIDTH / 2;
                  const cy = Y_DILATION_10 + ((10 - p.y) / 10) * GRAPH_H + GRAPH_H / 20;
                  const s = 30;
                  return <polygon key={`d${i}`} className={ink(p.auto)} points={`${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`} />;
                })}
              {merged.points
                .filter((p) => p.type === "station")
                .map((p, i) => {
                  const cx = GRID_X_START + p.x * COL_WIDTH + COL_WIDTH / 2;
                  const cy = Y_DILATION_10 + ((10 - p.y) / 10) * GRAPH_H + GRAPH_H / 20;
                  if (p.variety)
                    return (
                      <image
                        key={`s${i}`}
                        href={varietySrc(p.variety)}
                        x={cx - 25}
                        y={cy - 25}
                        width={50}
                        height={50}
                        transform={`rotate(${p.rotation ?? 0}, ${cx}, ${cy})`}
                      />
                    );
                  return <circle key={`s${i}`} cx={cx} cy={cy} r={25} fill="none" strokeWidth={6} className={p.auto ? "pg-auto-stroke" : "pg-ink-stroke"} />;
                })}

              <path d={fcfPath} fill="none" strokeWidth={4} className="pg-ink-stroke" />
              {fcf.map((p, i) => (
                <circle
                  key={`f${i}`}
                  cx={GRID_X_START + p.x * COL_WIDTH}
                  cy={Y_BCF_180 + ((180 - p.y) / 100) * BCF_H}
                  r={10}
                  className={ink(p.auto)}
                />
              ))}

              {merged.blocks.map((c, i) => {
                const x = GRID_X_START + c.x * COL_WIDTH;
                const y = Y_CONTRACTION_BOTTOM - (c.slot + 1) * CONTRACTION_ROW_H;
                const h = CONTRACTION_ROW_H + 1;
                const cls = c.auto ? "pg-auto" : "pg-ink";
                if (c.type === "weak")
                  return (
                    <g key={`c${i}`} className={c.auto ? "pg-auto-stroke" : "pg-ink-stroke"}>
                      <rect x={x} y={y} width={COL_WIDTH} height={h} fill="white" strokeWidth={1} />
                      <line x1={x} y1={y} x2={x + COL_WIDTH} y2={y + h} strokeWidth={3} />
                      <line x1={x + COL_WIDTH} y1={y} x2={x} y2={y + h} strokeWidth={3} />
                    </g>
                  );
                if (c.type === "moderate")
                  return (
                    <g key={`c${i}`}>
                      <rect x={x} y={y} width={COL_WIDTH} height={h} fill="white" stroke="black" strokeWidth={1} />
                      <polygon className={cls} points={`${x},${y} ${x},${y + h} ${x + COL_WIDTH},${y + h}`} />
                    </g>
                  );
                return <rect key={`c${i}`} className={cls} x={x} y={y} width={COL_WIDTH} height={h} />;
              })}
            </g>

            {/* Hora real / hora de registro */}
            <foreignObject
              x={toVisualX(GRID_X_START)}
              y={toVisualY(Y_TIME_REAL_TOP) - 61}
              width={toVisualX(GRID_X_END) - toVisualX(GRID_X_START)}
              height={120}
            >
              <div className="flex h-full w-full">
                {merged.table.map((c, i) => (
                  <textarea
                    key={i}
                    value={c.realTime.v}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setCell(i, "realTime", e.target.value)}
                    className={cn(
                      "h-full resize-none overflow-hidden border-none bg-transparent p-0 text-center text-[28px] font-bold leading-[56px] outline-none [writing-mode:vertical-lr] rotate-180",
                      c.realTime.auto ? "pg-auto-text" : "text-black",
                    )}
                    style={{ width: `${100 / UFTM_COLS}%` }}
                  />
                ))}
              </div>
            </foreignObject>
            <foreignObject
              x={toVisualX(GRID_X_START)}
              y={toVisualY(Y_TIME_REG_TOP) - 40}
              width={toVisualX(GRID_X_END) - toVisualX(GRID_X_START)}
              height={toVisualY(Y_TIME_REG_TOP + TIME_ROW_H) - toVisualY(Y_TIME_REG_TOP)}
            >
              <div className="flex h-full w-full">
                {merged.table.map((c, i) => (
                  <textarea
                    key={i}
                    value={c.registerHour.v || String(i + 1)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => setCell(i, "registerHour", e.target.value)}
                    className="h-full resize-none overflow-hidden border-none bg-transparent pt-[10px] text-center text-[36px] font-bold text-black outline-none"
                    style={{ width: `${100 / UFTM_COLS}%` }}
                  />
                ))}
              </div>
            </foreignObject>

            {TABLE_ROWS.map((row) => (
              <foreignObject
                key={row.key}
                x={toVisualX(GRID_X_START)}
                y={toVisualY(row.y)}
                width={toVisualX(GRID_X_END) - toVisualX(GRID_X_START)}
                height={toVisualY(row.y + row.h) - toVisualY(row.y)}
              >
                <div className="flex h-full w-full">
                  {merged.table.map((c, i) => (
                    <textarea
                      key={i}
                      value={c[row.key].v}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setCell(i, row.key, e.target.value)}
                      className={cn(
                        "h-full resize-none overflow-hidden border-none bg-transparent p-0 text-center font-bold uppercase leading-[0.85] outline-none",
                        c[row.key].auto ? "pg-auto-text" : "text-black",
                      )}
                      style={{
                        width: `${100 / UFTM_COLS}%`,
                        fontSize: row.font,
                        ...(row.rotate ? { writingMode: "vertical-rl", transform: "rotate(180deg)" } : {}),
                      }}
                    />
                  ))}
                </div>
              </foreignObject>
            ))}

            <foreignObject
              x={toVisualX(GRID_X_END + 130)}
              y={toVisualY(1830)}
              width={VIEWBOX_W - toVisualX(GRID_X_END + 130) - 50}
              height={toVisualY(3892) - toVisualY(1830)}
            >
              <textarea
                value={manual.observations}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => set({ observations: e.target.value.toUpperCase() })}
                className="h-full w-full resize-none overflow-hidden border-none bg-transparent p-0 text-left text-[30px] font-bold uppercase leading-tight text-black outline-none"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
              />
            </foreignObject>
          </svg>

          {exam && (
            <div className="w-72 space-y-3 rounded-lg border bg-white p-3 shadow-xl print:hidden" style={menuStyle(exam.vx, exam.vy)}>
              <div className="flex items-center justify-between border-b pb-1">
                <p className="text-sm font-bold">Exame — hora {exam.hour + 1}</p>
                <button type="button" onClick={() => setExam(null)}>
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Dilatação (cm)</p>
                <div className="grid grid-cols-6 gap-1">
                  {Array.from({ length: 11 }, (_, i) => (
                    <Pick key={i} active={exam.dilation === i} onClick={() => setExam({ ...exam, dilation: exam.dilation === i ? null : i })}>
                      {i}
                    </Pick>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">De Lee</p>
                <div className="grid grid-cols-5 gap-1">
                  {[-3, -2, -1, 0, 1, 2, 3, 4, 5].map((v) => (
                    <Pick key={v} active={exam.station === v} onClick={() => setExam({ ...exam, station: exam.station === v ? null : v })}>
                      {v > 0 ? `+${v}` : v}
                    </Pick>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-muted-foreground">Variedade de posição</p>
                <div className="flex flex-wrap gap-1">
                  {VARIETIES.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      title={v.label}
                      onClick={() => setExam({ ...exam, variety: exam.variety === v.id ? undefined : v.id, rotation: v.id === "P" ? 0 : exam.rotation })}
                      className={cn("h-9 w-9 rounded border p-0.5", exam.variety === v.id && "ring-2 ring-black")}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={varietySrc(v.id)} alt={v.label} className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
                {exam.variety && exam.variety !== "P" && (
                  <div className="mt-1 grid grid-cols-8 gap-1">
                    {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                      <button
                        key={a}
                        type="button"
                        title={`${a}°`}
                        onClick={() => setExam({ ...exam, rotation: a })}
                        className={cn("h-7 w-7 rounded border p-0.5", exam.rotation === a && "ring-2 ring-black")}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={varietySrc(exam.variety!)} alt="" style={{ transform: `rotate(${a}deg)` }} className="h-full w-full object-contain" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <MenuActions onCancel={() => setExam(null)} onConfirm={confirmExam} />
            </div>
          )}

          {bcf && (
            <div className="w-56 space-y-2 rounded-lg border bg-white p-3 shadow-xl print:hidden" style={menuStyle(bcf.vx, bcf.vy)}>
              <p className="border-b pb-1 text-sm font-bold">BCF — hora {bcf.hour + 1}</p>
              <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold text-muted-foreground">
                <span>bpm</span>
                <span>minuto</span>
              </div>
              {bcf.readings.map((r, i) => (
                <div key={i} className="grid grid-cols-2 gap-1">
                  <input
                    inputMode="numeric"
                    className="h-8 rounded border px-2 text-sm"
                    value={r.value}
                    onChange={(e) => {
                      const rs = [...bcf.readings];
                      rs[i] = { ...r, value: e.target.value.replace(/\D/g, "") };
                      setBcf({ ...bcf, readings: rs });
                    }}
                  />
                  <select
                    className="h-8 rounded border px-1 text-sm"
                    value={r.minutes}
                    onChange={(e) => {
                      const rs = [...bcf.readings];
                      rs[i] = { ...r, minutes: e.target.value };
                      setBcf({ ...bcf, readings: rs });
                    }}
                  >
                    <option value="">—</option>
                    {Array.from({ length: 12 }, (_, k) => (
                      <option key={k} value={k * 5}>
                        {k * 5}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <MenuActions onCancel={() => setBcf(null)} onConfirm={confirmBcf} />
            </div>
          )}

          {dyn && (
            <div className="w-56 space-y-2 rounded-lg border bg-white p-3 shadow-xl print:hidden" style={menuStyle(dyn.vx, dyn.vy)}>
              <p className="border-b pb-1 text-sm font-bold">Contrações — hora {dyn.hour + 1}</p>
              {(
                [
                  ["weak", "Fracas (1-19 s)"],
                  ["moderate", "Médias (20-39 s)"],
                  ["strong", "Fortes (≥ 40 s)"],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="flex items-center justify-between gap-2 text-xs">
                  {label}
                  <input
                    inputMode="numeric"
                    className="h-7 w-12 rounded border px-2"
                    value={dyn[k]}
                    onChange={(e) => setDyn({ ...dyn, [k]: Math.min(5, Math.max(0, Number(e.target.value.replace(/\D/g, "")) || 0)) })}
                  />
                </label>
              ))}
              <MenuActions onCancel={() => setDyn(null)} onConfirm={confirmDyn} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Pick({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("h-8 rounded border text-xs font-bold", active ? "border-black bg-black text-white" : "bg-white hover:bg-muted")}
    >
      {children}
    </button>
  );
}

function MenuActions({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className="flex justify-end gap-2 border-t pt-2">
      <button type="button" onClick={onCancel} className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted">
        Cancelar
      </button>
      <button type="button" onClick={onConfirm} className="rounded bg-black px-3 py-1 text-xs font-bold text-white">
        Confirmar
      </button>
    </div>
  );
}
