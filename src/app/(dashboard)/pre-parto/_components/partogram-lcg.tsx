"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Play, X } from "lucide-react";
import type { LcgData } from "@/core/partogram/types";
import {
  LCG_FIRST_SLOTS,
  LCG_SECOND_SLOTS,
  hhmm,
  slotTime,
} from "@/core/partogram/derive";
import {
  LCG_ROWS,
  LCG_SECTIONS,
  cervixAlerts,
  secondStageAlertHours,
  type LcgRow,
  type LcgStage,
} from "@/core/partogram/lcg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * WHO Labour Care Guide (2020) — tabela por seções. 1ª fase em meias horas
 * (12 h), 2ª fase em 15 min (3 h). Células automáticas (das aferições) em
 * azul; manuais em preto e prevalecem. Células em alerta ficam vermelhas.
 */

type Cells = Record<string, Record<string, string>>;

const LEGEND: Record<string, string> = {
  companion: "S sim · N não",
  pain: "S sim · N não",
  oral: "S sim · N não",
  posture: "SP supina · MO em movimento",
  decel: "N nenhuma · P precoce · T tardia · V variável",
  fluid: "I íntegra · C claro · M+/M++/M+++ meconial · S sanguinolento",
  position: "OA anterior · OP posterior · OT transversa",
  caput: "0 · + · ++ · +++",
  moulding: "0 · + · ++ · +++",
  descent: "quintos palpáveis acima da pelve",
};

function toLocalInput(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function PartogramLcg({
  openedAt,
  data,
  autoFirst,
  autoSecond,
  nulliparous,
  onChange,
}: {
  openedAt: string;
  data: LcgData;
  autoFirst: Cells;
  autoSecond: Cells;
  nulliparous: boolean;
  onChange: (d: LcgData) => void;
}) {
  const [edit, setEdit] = useState<{ stage: LcgStage; slot: number; row: LcgRow } | null>(null);
  const [draft, setDraft] = useState("");

  const value = (stage: LcgStage, slot: number, rowId: string) => {
    const man = (stage === "first" ? data.first : data.second)[String(slot)]?.[rowId] ?? "";
    if (man !== "") return { v: man, auto: false };
    const a = (stage === "first" ? autoFirst : autoSecond)[String(slot)]?.[rowId] ?? "";
    return { v: a, auto: a !== "" };
  };

  const cervixAlert = useMemo(
    () => cervixAlerts(Array.from({ length: LCG_FIRST_SLOTS }, (_, i) => value("first", i, "cervix").v || undefined)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, autoFirst],
  );

  const isAlert = (stage: LcgStage, slot: number, row: LcgRow, v: string) =>
    v !== "" && (row.id === "cervix" ? stage === "first" && cervixAlert.has(slot) : !!row.alert?.(v));

  // Lista de alertas (para a seção "Avaliação e plano").
  const alerts = useMemo(() => {
    const out: { when: string; text: string }[] = [];
    const scan = (stage: LcgStage, slots: number, start: string, minutes: number) => {
      if (!start) return;
      for (let i = 0; i < slots; i++)
        for (const row of LCG_ROWS.filter((r) => r.stages.includes(stage))) {
          const { v } = value(stage, i, row.id);
          if (isAlert(stage, i, row, v))
            out.push({
              when: hhmm(slotTime(start, i, minutes)),
              text: row.id === "cervix" ? `Colo parado em ${v} cm` : `${row.label}: ${v} (alerta ${row.alertLabel})`,
            });
        }
    };
    scan("first", LCG_FIRST_SLOTS, openedAt, 30);
    scan("second", LCG_SECOND_SLOTS, data.secondStageAt, 15);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, autoFirst, autoSecond, openedAt, cervixAlert]);

  const secondHours = data.secondStageAt
    ? (Date.now() - new Date(data.secondStageAt).getTime()) / 3600000
    : 0;
  const secondLimit = secondStageAlertHours(nulliparous);

  function openCell(stage: LcgStage, slot: number, row: LcgRow) {
    setEdit({ stage, slot, row });
    setDraft((stage === "first" ? data.first : data.second)[String(slot)]?.[row.id] ?? "");
  }

  function commit(v: string) {
    if (!edit) return;
    const key = edit.stage === "first" ? "first" : "second";
    const cells = { ...data[key] };
    const col = { ...(cells[String(edit.slot)] ?? {}) };
    if (v === "") delete col[edit.row.id];
    else col[edit.row.id] = v;
    cells[String(edit.slot)] = col;
    onChange({ ...data, [key]: cells });
    setEdit(null);
  }

  const setInfo = (patch: Partial<LcgData["info"]>) => onChange({ ...data, info: { ...data.info, ...patch } });

  return (
    <div className="lcg space-y-4">
      {/* 1 — Identificação / características */}
      <div className="grid gap-2 rounded-lg border bg-card p-3 text-xs sm:grid-cols-4">
        <label className="space-y-1">
          <span className="font-semibold">Início do TP</span>
          <select
            className="h-8 w-full rounded border px-2"
            value={data.info.laborOnset}
            onChange={(e) => setInfo({ laborOnset: e.target.value as LcgData["info"]["laborOnset"] })}
          >
            <option value="">—</option>
            <option value="espontaneo">Espontâneo</option>
            <option value="induzido">Induzido</option>
          </select>
        </label>
        <label className="space-y-1">
          <span className="font-semibold">Diagnóstico da fase ativa (≥ 5 cm)</span>
          <input
            type="datetime-local"
            className="h-8 w-full rounded border px-2"
            value={toLocalInput(data.info.activeLaborAt)}
            onChange={(e) => setInfo({ activeLaborAt: e.target.value ? new Date(e.target.value).toISOString() : "" })}
          />
        </label>
        <label className="space-y-1">
          <span className="font-semibold">Rotura das membranas</span>
          <input
            type="datetime-local"
            className="h-8 w-full rounded border px-2"
            value={toLocalInput(data.info.membranesRupturedAt)}
            onChange={(e) => setInfo({ membranesRupturedAt: e.target.value ? new Date(e.target.value).toISOString() : "" })}
          />
        </label>
        <label className="space-y-1">
          <span className="font-semibold">Fatores de risco</span>
          <input
            className="h-8 w-full rounded border px-2"
            value={data.info.riskFactors}
            onChange={(e) => setInfo({ riskFactors: e.target.value })}
          />
        </label>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-800">
            <AlertTriangle className="h-4 w-4" /> {alerts.length} alerta(s) — registre avaliação e plano
          </p>
          <ul className="mt-1 grid gap-x-4 text-xs text-rose-800 sm:grid-cols-2">
            {alerts.slice(-12).map((a, i) => (
              <li key={i}>
                <strong>{a.when}</strong> · {a.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Grid
        title="1ª fase — fase ativa (a cada 30 min)"
        stage="first"
        slots={LCG_FIRST_SLOTS}
        start={openedAt}
        minutes={30}
        value={value}
        isAlert={isAlert}
        onCell={openCell}
        plans={data.plans}
        onPlan={(h, v) => onChange({ ...data, plans: { ...data.plans, [String(h)]: v } })}
      />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {!data.secondStageAt ? (
            <Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...data, secondStageAt: new Date().toISOString() })}>
              <Play className="h-4 w-4" /> Iniciar 2º período (dilatação total)
            </Button>
          ) : (
            <>
              <span className="text-xs">
                2º período desde{" "}
                <input
                  type="datetime-local"
                  className="h-7 rounded border px-1"
                  value={toLocalInput(data.secondStageAt)}
                  onChange={(e) => onChange({ ...data, secondStageAt: e.target.value ? new Date(e.target.value).toISOString() : "" })}
                />
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-semibold",
                  secondHours >= secondLimit ? "bg-rose-100 text-rose-800" : "bg-muted text-muted-foreground",
                )}
              >
                {secondHours.toFixed(1).replace(".", ",")} h · alerta ≥ {secondLimit} h ({nulliparous ? "nulípara" : "multípara"})
              </span>
            </>
          )}
        </div>
        {data.secondStageAt && (
          <Grid
            title="2º período (a cada 15 min)"
            stage="second"
            slots={LCG_SECOND_SLOTS}
            start={data.secondStageAt}
            minutes={15}
            value={value}
            isAlert={isAlert}
            onCell={openCell}
          />
        )}
      </div>

      <p className="text-[11px] text-muted-foreground">
        OMS, Labour Care Guide (2020) — limiares da coluna &quot;Alerta&quot;. *Colo: alerta se sem progresso por 5 cm ≥ 6 h ·
        6 cm ≥ 5 h · 7 cm ≥ 3 h · 8 cm ≥ 2,5 h · 9 cm ≥ 2 h. Apoio à decisão — validar com a equipe.
      </p>

      {edit && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/20 p-4 sm:items-center print:hidden" onClick={() => setEdit(null)}>
          <div className="w-full max-w-xs space-y-3 rounded-xl border bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                {edit.row.label} ·{" "}
                {hhmm(slotTime(edit.stage === "first" ? openedAt : data.secondStageAt, edit.slot, edit.stage === "first" ? 30 : 15))}
              </p>
              <button type="button" onClick={() => setEdit(null)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            {LEGEND[edit.row.id] && <p className="text-[11px] text-muted-foreground">{LEGEND[edit.row.id]}</p>}
            {edit.row.options ? (
              <div className="flex flex-wrap gap-1.5">
                {edit.row.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => commit(o)}
                    className={cn(
                      "h-9 min-w-10 rounded-md border px-2 text-sm font-bold",
                      draft === o ? "chip-on" : "hover:bg-muted",
                      edit.row.alert?.(o) && "text-rose-700",
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  commit(draft.trim().toUpperCase());
                }}
                className="flex gap-2"
              >
                <input
                  autoFocus
                  inputMode={edit.row.numeric ? "decimal" : "text"}
                  className="h-9 flex-1 rounded-md border px-2 text-sm"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={value(edit.stage, edit.slot, edit.row.id).auto ? `auto: ${value(edit.stage, edit.slot, edit.row.id).v}` : ""}
                />
                <Button type="submit" size="sm">
                  OK
                </Button>
              </form>
            )}
            <button type="button" onClick={() => commit("")} className="text-xs text-muted-foreground hover:underline">
              Limpar lançamento manual
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Grid({
  title,
  stage,
  slots,
  start,
  minutes,
  value,
  isAlert,
  onCell,
  plans,
  onPlan,
}: {
  title: string;
  stage: LcgStage;
  slots: number;
  start: string;
  minutes: number;
  value: (stage: LcgStage, slot: number, rowId: string) => { v: string; auto: boolean };
  isAlert: (stage: LcgStage, slot: number, row: LcgRow, v: string) => boolean;
  onCell: (stage: LcgStage, slot: number, row: LcgRow) => void;
  plans?: Record<string, string>;
  onPlan?: (hour: number, v: string) => void;
}) {
  const rows = LCG_ROWS.filter((r) => r.stages.includes(stage));
  const perHour = 60 / minutes;
  return (
    <div className="overflow-x-auto rounded-lg border bg-white">
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-muted/60">
            <th className="sticky left-0 z-10 min-w-36 bg-muted px-2 py-1 text-left">{title}</th>
            <th className="min-w-16 px-1 py-1 text-rose-700">Alerta</th>
            {Array.from({ length: slots }, (_, i) => (
              <th
                key={i}
                className={cn("min-w-9 px-0.5 py-1 font-mono font-semibold", i % perHour === 0 && "border-l-2 border-l-slate-400")}
              >
                {i % perHour === 0 ? hhmm(slotTime(start, i, minutes)) : ""}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {LCG_SECTIONS.map((section) => {
            const secRows = rows.filter((r) => r.section === section);
            if (secRows.length === 0) return null;
            return [
              <tr key={section} className="bg-slate-100">
                <td colSpan={slots + 2} className="sticky left-0 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  {section}
                </td>
              </tr>,
              ...secRows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="sticky left-0 z-10 bg-white px-2 py-0.5 font-medium">{row.label}</td>
                  <td className="px-1 text-center text-[11px] text-rose-700">{row.alertLabel}</td>
                  {Array.from({ length: slots }, (_, i) => {
                    const { v, auto } = value(stage, i, row.id);
                    const alert = isAlert(stage, i, row, v);
                    return (
                      <td
                        key={i}
                        onClick={() => onCell(stage, i, row)}
                        className={cn(
                          "h-6 cursor-pointer border-l px-0.5 text-center font-semibold hover:bg-primary/10",
                          i % perHour === 0 && "border-l-2 border-l-slate-400",
                          auto && "pg-auto-text",
                          alert && "bg-rose-100 text-rose-800",
                        )}
                        title={auto ? "Das aferições" : undefined}
                      >
                        <span className="block max-w-[3.5rem] truncate">{v}</span>
                      </td>
                    );
                  })}
                </tr>
              )),
            ];
          })}
          {plans && onPlan && (
            <>
              <tr className="bg-slate-100">
                <td colSpan={slots + 2} className="sticky left-0 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                  Tomada de decisão compartilhada — avaliação e plano
                </td>
              </tr>
              <tr className="border-t align-top">
                <td className="sticky left-0 z-10 bg-white px-2 py-1 font-medium">Avaliação / plano</td>
                <td />
                {Array.from({ length: slots / perHour }, (_, h) => (
                  <td key={h} colSpan={perHour} className="border-l-2 border-l-slate-400 p-0.5">
                    <textarea
                      rows={3}
                      value={plans[String(h)] ?? ""}
                      onChange={(e) => onPlan(h, e.target.value.toUpperCase())}
                      className="w-full min-w-[4.5rem] resize-y rounded border-0 bg-transparent p-0.5 text-[11px] uppercase outline-none focus:bg-primary/5"
                    />
                  </td>
                ))}
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
