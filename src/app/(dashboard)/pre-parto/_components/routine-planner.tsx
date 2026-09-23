"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Check, Loader2, Pencil, Plus, RotateCcw, X } from "lucide-react";
import { saveRoutine, type RoutineState } from "../actions";
import type { Patient } from "@/core/patients/types";
import {
  BASE_ROUTINES,
  PROTOCOL_ROUTINES,
  hasDiabetesRisk,
  suggestedBaseRoutine,
  type MonitoringRoutine,
  type RoutineRule,
} from "@/core/schedule/routines";
import { MONITOR_PARAMS, paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import { nextHalfHour, shiftEnd, tasksFromRoutines } from "@/core/schedule/planner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const selectClass =
  "flex h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: RoutineState = {};

/** ISO timestamp → parâmetros. */
type Grid = Record<string, string[]>;

const HORIZONS = [
  { id: "shift", label: "Fim do plantão" },
  { id: "2h", label: "2 h" },
  { id: "6h", label: "6 h" },
  { id: "12h", label: "12 h" },
  { id: "24h", label: "24 h" },
];

const INTERVALS = [
  { min: 5, label: "5 min" },
  { min: 15, label: "15 min" },
  { min: 30, label: "30 min" },
  { min: 60, label: "1 h" },
  { min: 120, label: "2 h" },
  { min: 180, label: "3 h" },
  { min: 240, label: "4 h" },
  { min: 360, label: "6 h" },
];

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function hhmm(d: Date | string): string {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${pad2(x.getHours())}:${pad2(x.getMinutes())}`;
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/** "30 min", "2/2h". */
function intervalLabel(min: number): string {
  return min < 60 ? `${min} min` : `${min / 60}/${min / 60}h`;
}

function horizonEnd(option: string, from: Date): Date {
  if (option === "shift") return shiftEnd(from);
  const hours = Number(option.replace("h", ""));
  return new Date(from.getTime() + hours * 60 * 60000);
}

/** Próxima ocorrência (a partir de agora) do horário HH:mm. */
function startFromTime(value: string): Date {
  const [h, m] = value.split(":").map(Number);
  const now = new Date();
  const d = new Date(now);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  // Horário já passado há mais de 1 h → assume o dia seguinte (virada do plantão noturno).
  if (d.getTime() < now.getTime() - 60 * 60000) d.setDate(d.getDate() + 1);
  return d;
}

/** Mesmo dia de `ref`, no horário HH:mm (vira o dia se ficar antes do início). */
function isoAt(value: string, ref: Date): string {
  const [h, m] = value.split(":").map(Number);
  const d = new Date(ref);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  if (d.getTime() < ref.getTime()) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

const rmKey = (iso: string, param: string) => `${iso}|${param}`;

/**
 * Planejador da rotina de aferições em 4 escolhas (fase, protocolos, período,
 * extras). A linha do tempo é derivada dessas escolhas e pode ser ajustada à
 * mão: tocar num parâmetro o risca/restaura; "editar" abre todos os parâmetros
 * do horário; horários avulsos podem ser adicionados.
 */
export function RoutinePlanner({ patient }: { patient: Patient }) {
  const [state, formAction, pending] = useActionState(saveRoutine, initialState);

  const diabetesAuto = hasDiabetesRisk(patient.riskFactors);

  const [phaseId, setPhaseId] = useState<string | null>(() =>
    suggestedBaseRoutine(patient.status),
  );
  const [protocols, setProtocols] = useState<string[]>(() => (diabetesAuto ? ["diabetes"] : []));
  const [horizon, setHorizon] = useState("shift");
  // Definido após montar (hora local do navegador; evita divergência de hidratação).
  const [startTime, setStartTime] = useState("");
  useEffect(() => setStartTime(hhmm(nextHalfHour())), []);
  const [customRules, setCustomRules] = useState<RoutineRule[]>([]);
  const [draftParams, setDraftParams] = useState<string[]>([]);
  const [draftInterval, setDraftInterval] = useState(60);
  const [replaceFuture, setReplaceFuture] = useState(true);

  // Ajustes manuais sobre a linha do tempo gerada.
  const [removed, setRemoved] = useState<string[]>([]);
  const [added, setAdded] = useState<Grid>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [newTime, setNewTime] = useState("");

  const start = useMemo(() => (startTime ? startFromTime(startTime) : null), [startTime]);
  const end = useMemo(() => (start ? horizonEnd(horizon, start) : null), [horizon, start]);

  // Linha do tempo gerada = fase + protocolos + extras, somada aos ajustes.
  const timeline = useMemo(() => {
    if (!start || !end) return [];
    const routines: MonitoringRoutine[] = [];
    const phase = BASE_ROUTINES.find((r) => r.id === phaseId);
    if (phase) routines.push(phase);
    for (const p of PROTOCOL_ROUTINES) if (protocols.includes(p.id)) routines.push(p);
    if (customRules.length > 0)
      routines.push({ id: "custom", label: "", description: "", rules: customRules, references: [] });

    const grid: Grid = {};
    for (const t of tasksFromRoutines(routines, start, end)) grid[t.timestamp] = t.focus;
    for (const [iso, params] of Object.entries(added))
      grid[iso] = [...new Set([...(grid[iso] ?? []), ...params])];

    return Object.entries(grid)
      .map(([iso, params]) => ({
        iso,
        params: MONITOR_PARAMS.map((p) => p.id).filter((id) => params.includes(id)),
      }))
      .sort((a, b) => new Date(a.iso).getTime() - new Date(b.iso).getTime());
  }, [phaseId, protocols, customRules, added, start, end]);

  const finalTasks = useMemo(
    () =>
      timeline
        .map(({ iso, params }) => ({
          timestamp: iso,
          focus: params.filter((p) => !removed.includes(rmKey(iso, p))),
        }))
        .filter((t) => t.focus.length > 0),
    [timeline, removed],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const t of finalTasks) for (const p of t.focus) c[p] = (c[p] ?? 0) + 1;
    return MONITOR_PARAMS.filter((p) => c[p.id]).map((p) => ({ id: p.id, n: c[p.id] }));
  }, [finalTasks]);

  const hasManualEdits = removed.length > 0 || Object.keys(added).length > 0;

  function toggleProtocol(id: string) {
    setProtocols((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function toggleDraftParam(id: string) {
    setDraftParams((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  function addCustomRule() {
    if (draftParams.length === 0) return;
    setCustomRules((prev) => [...prev, { params: draftParams, intervalMin: draftInterval }]);
    setDraftParams([]);
  }

  function toggleRemoved(iso: string, param: string) {
    const k = rmKey(iso, param);
    setRemoved((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));
  }

  /** No editor do horário: liga/desliga um parâmetro. */
  function toggleRowParam(iso: string, param: string, on: boolean) {
    const k = rmKey(iso, param);
    if (on) {
      setAdded((g) => ({ ...g, [iso]: (g[iso] ?? []).filter((p) => p !== param) }));
      setRemoved((prev) => [...prev, k]);
    } else {
      setRemoved((prev) => prev.filter((x) => x !== k));
      setAdded((g) => ({ ...g, [iso]: [...new Set([...(g[iso] ?? []), param])] }));
    }
  }

  function removeRow(iso: string, params: string[]) {
    setRemoved((prev) => [...new Set([...prev, ...params.map((p) => rmKey(iso, p))])]);
    setEditing(null);
  }

  function addRow() {
    if (!newTime || !start) return;
    const iso = isoAt(newTime, start);
    if (!timeline.some((r) => r.iso === iso)) setAdded((g) => ({ ...g, [iso]: g[iso] ?? [] }));
    setEditing(iso);
    setNewTime("");
  }

  function resetManual() {
    setRemoved([]);
    setAdded({});
    setEditing(null);
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="patientId" value={patient.id} />
      <input type="hidden" name="tasks" value={JSON.stringify(finalTasks)} />
      {replaceFuture && <input type="hidden" name="replaceFuture" value="on" />}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ---------------- Escolhas ---------------- */}
        <Card>
          <CardContent className="space-y-6 p-5 sm:p-6">
            <Step n={1} title="Fase do trabalho de parto">
              <div className="grid gap-2 sm:grid-cols-2">
                {BASE_ROUTINES.map((r) => (
                  <OptionCard
                    key={r.id}
                    selected={phaseId === r.id}
                    onClick={() => setPhaseId(phaseId === r.id ? null : r.id)}
                    title={r.label}
                    rules={r.rules}
                    references={r.references}
                  />
                ))}
              </div>
            </Step>

            <Step n={2} title="Protocolos" hint="opcional — some à fase">
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {PROTOCOL_ROUTINES.map((r) => (
                  <OptionCard
                    key={r.id}
                    selected={protocols.includes(r.id)}
                    onClick={() => toggleProtocol(r.id)}
                    title={r.label}
                    rules={r.rules}
                    references={r.references}
                    badge={r.id === "diabetes" && diabetesAuto ? "DMG" : undefined}
                    multi
                  />
                ))}
              </div>
            </Step>

            <Step n={3} title="Período">
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  Início
                  <input
                    type="time"
                    value={startTime}
                    step={900}
                    onChange={(e) => e.target.value && setStartTime(e.target.value)}
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm font-semibold text-foreground"
                  />
                </label>
                <span className="text-sm text-muted-foreground">até</span>
                <div className="flex flex-wrap gap-1">
                  {HORIZONS.map((h) => (
                    <Chip key={h.id} active={horizon === h.id} onClick={() => setHorizon(h.id)}>
                      {h.label}
                    </Chip>
                  ))}
                </div>
                {end && <span className="text-xs text-muted-foreground">({hhmm(end)})</span>}
              </div>
            </Step>

            <Step n={4} title="Aferições extras" hint="opcional">
              <div className="space-y-2">
                {customRules.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {customRules.map((r, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full border bg-muted px-2.5 py-1 text-xs font-medium"
                      >
                        {r.params.join(" + ")} · {intervalLabel(r.intervalMin)}
                        <button
                          type="button"
                          onClick={() => setCustomRules((prev) => prev.filter((_, j) => j !== i))}
                          aria-label="Remover"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-1">
                  {MONITOR_PARAMS.map((p) => (
                    <ParamChip
                      key={p.id}
                      id={p.id}
                      active={draftParams.includes(p.id)}
                      onClick={() => toggleDraftParam(p.id)}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">a cada</span>
                  <select
                    value={draftInterval}
                    onChange={(e) => setDraftInterval(Number(e.target.value))}
                    className={selectClass}
                  >
                    {INTERVALS.map((i) => (
                      <option key={i.min} value={i.min}>
                        {i.label}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={addCustomRule}
                    disabled={draftParams.length === 0}
                  >
                    <Plus className="h-4 w-4" /> Adicionar
                  </Button>
                </div>
              </div>
            </Step>

            <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Intervalos de apoio à decisão (baixo risco / protocolos padrão). Valide com a equipe.
            </p>
          </CardContent>
        </Card>

        {/* ---------------- Linha do tempo ---------------- */}
        <div className="lg:sticky lg:top-20 lg:h-fit">
          <Card>
            <CardHeader className="space-y-2 pb-3">
              <CardTitle className="flex items-center justify-between gap-2 text-base">
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  {finalTasks.length} horários
                </span>
                {hasManualEdits && (
                  <Button type="button" size="sm" variant="ghost" onClick={resetManual}>
                    <RotateCcw className="h-4 w-4" /> Desfazer ajustes
                  </Button>
                )}
              </CardTitle>
              {counts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {counts.map((c) => (
                    <span
                      key={c.id}
                      className={cn(
                        "rounded border px-1.5 py-0.5 text-[11px] font-semibold",
                        GROUP_ACCENT[paramGroup(c.id)],
                      )}
                    >
                      {c.id} ×{c.n}
                    </span>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {timeline.length > 0 ? (
                <>
                  <p className="text-[11px] text-muted-foreground">
                    Toque num parâmetro para riscá-lo; o lápis edita o horário.
                  </p>
                  <ol className="max-h-[55vh] divide-y overflow-y-auto rounded-md border">
                    {timeline.map(({ iso, params }) => {
                      const isEditing = editing === iso;
                      const active = params.filter((p) => !removed.includes(rmKey(iso, p)));
                      return (
                        <li key={iso} className={cn("px-3 py-1.5", active.length === 0 && "opacity-50")}>
                          <div className="flex items-center gap-2">
                            <span className="w-12 shrink-0 font-mono text-sm font-bold">{hhmm(iso)}</span>
                            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                              {params.map((p) => {
                                const off = removed.includes(rmKey(iso, p));
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => toggleRemoved(iso, p)}
                                    title={off ? "Restaurar" : "Remover deste horário"}
                                    className={cn(
                                      "rounded border px-1.5 py-0.5 text-[11px] font-semibold transition-colors",
                                      off
                                        ? "bg-background text-muted-foreground line-through"
                                        : GROUP_ACCENT[paramGroup(p)],
                                    )}
                                  >
                                    {p}
                                  </button>
                                );
                              })}
                              {params.length === 0 && (
                                <span className="text-xs text-muted-foreground">sem parâmetros</span>
                              )}
                            </div>
                            <span className="hidden text-[10px] text-muted-foreground sm:inline">
                              {dayLabel(iso)}
                            </span>
                            <button
                              type="button"
                              onClick={() => setEditing(isEditing ? null : iso)}
                              aria-label="Editar horário"
                              className={cn(
                                "rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground",
                                isEditing && "bg-muted text-foreground",
                              )}
                            >
                              {isEditing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {isEditing && (
                            <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2">
                              <div className="flex flex-wrap gap-1">
                                {MONITOR_PARAMS.map((p) => {
                                  const on = params.includes(p.id) && !removed.includes(rmKey(iso, p.id));
                                  return (
                                    <ParamChip
                                      key={p.id}
                                      id={p.id}
                                      active={on}
                                      onClick={() => toggleRowParam(iso, p.id, on)}
                                    />
                                  );
                                })}
                              </div>
                              <button
                                type="button"
                                onClick={() => removeRow(iso, params)}
                                className="text-xs font-medium text-destructive hover:underline"
                              >
                                Remover horário
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </>
              ) : (
                <p className="rounded-md border border-dashed py-8 text-center text-sm text-muted-foreground">
                  Escolha uma fase ou um protocolo para gerar os horários.
                </p>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  aria-label="Horário avulso"
                />
                <Button type="button" size="sm" variant="outline" onClick={addRow} disabled={!newTime}>
                  <Plus className="h-4 w-4" /> Horário avulso
                </Button>
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={replaceFuture}
                  onChange={(e) => setReplaceFuture(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Substituir a rotina pendente atual
              </label>

              {state.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 border-t pt-3">
                <Link
                  href={`/pre-parto/${patient.id}`}
                  className="text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Link>
                <Button type="submit" disabled={pending || finalTasks.length === 0}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Salvar rotina
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}

function Step({
  n,
  title,
  hint,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
          {n}
        </span>
        {title}
        {hint && <span className="text-xs font-normal text-muted-foreground">{hint}</span>}
      </h2>
      {children}
    </section>
  );
}

/** Cartão selecionável (fase: escolha única; protocolo: `multi`). */
function OptionCard({
  selected,
  onClick,
  title,
  rules,
  references,
  badge,
  multi,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  rules: RoutineRule[];
  references: string[];
  badge?: string;
  multi?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      title={`Referências: ${references.join(" · ")}`}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/60",
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold">
        <span
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center border",
            multi ? "rounded" : "rounded-full",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input",
          )}
        >
          {selected && <Check className="h-3 w-3" />}
        </span>
        {title}
        {badge && (
          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
            {badge}
          </span>
        )}
      </span>
      <span className="flex flex-wrap gap-1 pl-6">
        {rules.map((r, i) => (
          <span key={i} className="text-[11px] text-muted-foreground">
            {r.params.join("+")} {intervalLabel(r.intervalMin)}
            {i < rules.length - 1 && " ·"}
          </span>
        ))}
      </span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function ParamChip({ id, active, onClick }: { id: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
        active ? GROUP_ACCENT[paramGroup(id)] : "bg-background text-muted-foreground hover:bg-muted",
      )}
    >
      {id}
    </button>
  );
}
