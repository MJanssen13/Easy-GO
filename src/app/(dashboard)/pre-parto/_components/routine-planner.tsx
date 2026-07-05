"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, Loader2, Sparkles, Trash2, Plus, ShieldPlus, X } from "lucide-react";
import { saveRoutine, type RoutineState } from "../actions";
import type { Patient } from "@/core/patients/types";
import {
  BASE_ROUTINES,
  PROTOCOL_ROUTINES,
  hasDiabetesRisk,
  type MonitoringRoutine,
} from "@/core/schedule/routines";
import { MONITOR_PARAMS, paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import { nextHalfHour, shiftEnd, tasksFromRoutine } from "@/core/schedule/planner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: RoutineState = {};

/** Grid = single source of truth: ISO timestamp → params. Doubles as summary. */
type Grid = Record<string, string[]>;

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function hhmm(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function horizonEnd(option: string, from: Date): Date {
  if (option === "shift") return shiftEnd(from);
  const hours = Number(option.replace("h", ""));
  return new Date(from.getTime() + hours * 60 * 60000);
}

/** Union a routine's tasks (from → end) into `grid` by exact timestamp. */
function mergeRoutine(grid: Grid, routine: MonitoringRoutine, from: Date, end: Date): Grid {
  const out: Grid = {};
  for (const [k, v] of Object.entries(grid)) out[k] = [...v];
  for (const t of tasksFromRoutine(routine, from, end)) {
    const set = new Set(out[t.timestamp] ?? []);
    t.focus.forEach((p) => set.add(p));
    out[t.timestamp] = [...set];
  }
  return out;
}

/** Re-key an entry to a new HH:mm (same calendar day). */
function reTime(iso: string, value: string): string {
  const [h, m] = value.split(":").map(Number);
  const d = new Date(iso);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d.toISOString();
}

export function RoutinePlanner({ patient }: { patient: Patient }) {
  const [state, formAction, pending] = useActionState(saveRoutine, initialState);

  const diabetesAuto = hasDiabetesRisk(patient.riskFactors);

  const [horizon, setHorizon] = useState("shift");
  const [customParams, setCustomParams] = useState<string[]>([]);
  const [customInterval, setCustomInterval] = useState(60);
  const [replaceFuture, setReplaceFuture] = useState(true);

  // Diabetes é adicionado automaticamente se DMG / Overt Diabetes.
  const [grid, setGrid] = useState<Grid>(() => {
    if (!diabetesAuto) return {};
    const from = nextHalfHour();
    const diabetes = PROTOCOL_ROUTINES.find((p) => p.id === "diabetes")!;
    return mergeRoutine({}, diabetes, from, shiftEnd(from));
  });

  const finalTasks = useMemo(
    () =>
      Object.entries(grid)
        .filter(([, focus]) => focus.length > 0)
        .map(([timestamp, focus]) => ({ timestamp, focus }))
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()),
    [grid],
  );

  // Linhas exibidas no ajuste manual (inclui horários vazios recém-adicionados).
  const rows = useMemo(
    () =>
      Object.keys(grid).sort((a, b) => new Date(a).getTime() - new Date(b).getTime()),
    [grid],
  );

  function applyRoutine(routine: MonitoringRoutine) {
    const from = nextHalfHour();
    setGrid((g) => mergeRoutine(g, routine, from, horizonEnd(horizon, from)));
  }

  function applyCustom() {
    if (customParams.length === 0) return;
    const from = nextHalfHour();
    const end = horizonEnd(horizon, from);
    setGrid((g) => {
      const out: Grid = {};
      for (const [k, v] of Object.entries(g)) out[k] = [...v];
      for (let t = from.getTime(); t <= end.getTime(); t += customInterval * 60000) {
        const iso = new Date(t).toISOString();
        const set = new Set(out[iso] ?? []);
        customParams.forEach((p) => set.add(p));
        out[iso] = [...set];
      }
      return out;
    });
  }

  function toggleCustomParam(param: string) {
    setCustomParams((prev) =>
      prev.includes(param) ? prev.filter((p) => p !== param) : [...prev, param],
    );
  }

  function toggleRowParam(iso: string, param: string) {
    setGrid((g) => {
      const cur = g[iso] ?? [];
      const next = cur.includes(param) ? cur.filter((p) => p !== param) : [...cur, param];
      return { ...g, [iso]: next };
    });
  }

  function changeRowTime(iso: string, value: string) {
    const newIso = reTime(iso, value);
    if (newIso === iso) return;
    setGrid((g) => {
      const { [iso]: moved, ...rest } = g;
      const set = new Set([...(rest[newIso] ?? []), ...(moved ?? [])]);
      return { ...rest, [newIso]: [...set] };
    });
  }

  function removeRow(iso: string) {
    setGrid((g) => {
      const { [iso]: _drop, ...rest } = g;
      return rest;
    });
  }

  function addRow() {
    setGrid((g) => {
      let t = nextHalfHour().getTime();
      while (g[new Date(t).toISOString()] !== undefined) t += 30 * 60000;
      return { ...g, [new Date(t).toISOString()]: [] };
    });
  }

  function clearAll() {
    setGrid({});
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="patientId" value={patient.id} />
      <input type="hidden" name="tasks" value={JSON.stringify(finalTasks)} />
      {replaceFuture && <input type="hidden" name="replaceFuture" value="on" />}

      <div className="grid gap-5 xl:grid-cols-2">
        {/* ------------------------------------------------------------- */}
        {/* ESQUERDA — Planejamento                                        */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Horizonte do planejamento</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={horizon}
                  onChange={(e) => setHorizon(e.target.value)}
                  className={`${selectClass} w-auto`}
                >
                  <option value="shift">Até o fim do plantão</option>
                  <option value="1h">Próxima 1 hora</option>
                  <option value="2h">Próximas 2 horas</option>
                  <option value="6h">Próximas 6 horas</option>
                  <option value="12h">Próximas 12 horas</option>
                  <option value="24h">Próximas 24 horas</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Geração a partir da próxima hora exata/meia-hora até esse limite.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" /> Rotinas por fase
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {BASE_ROUTINES.map((r) => (
                <RoutineRow key={r.id} routine={r} onApply={() => applyRoutine(r)} />
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ShieldPlus className="h-4 w-4 text-primary" /> Protocolos específicos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {PROTOCOL_ROUTINES.map((r) => (
                <RoutineRow
                  key={r.id}
                  routine={r}
                  onApply={() => applyRoutine(r)}
                  auto={r.id === "diabetes" && diabetesAuto}
                />
              ))}
              <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
                ⚠️ Intervalos de apoio à decisão (baixo risco / protocolos padrão). Ao desmarcar um
                protocolo, remova as aferições futuras aqui; as já coletadas permanecem no histórico.
                Valide com a equipe.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ------------------------------------------------------------- */}
        {/* DIREITA — Gerador personalizado + Ajuste manual / Resumo       */}
        {/* ------------------------------------------------------------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gerador personalizado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {MONITOR_PARAMS.map((p) => {
                  const active = customParams.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleCustomParam(p.id)}
                      className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                        active ? GROUP_ACCENT[p.group] : "bg-background text-muted-foreground"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={customInterval}
                  onChange={(e) => setCustomInterval(Number(e.target.value))}
                  className={`${selectClass} w-auto`}
                >
                  <option value={5}>A cada 5 min</option>
                  <option value={15}>A cada 15 min</option>
                  <option value={30}>A cada 30 min</option>
                  <option value={60}>A cada 1 hora</option>
                  <option value={120}>A cada 2 horas</option>
                  <option value={180}>A cada 3 horas</option>
                  <option value={240}>A cada 4 horas</option>
                  <option value={360}>A cada 6 horas</option>
                </select>
                <Button type="button" size="sm" variant="outline" onClick={applyCustom}>
                  <Plus className="h-4 w-4" /> Aplicar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>Ajuste manual e resumo — {finalTasks.length} aferições</span>
                <span className="flex items-center gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={addRow}>
                    <Plus className="h-4 w-4" /> Horário
                  </Button>
                  {rows.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={clearAll}
                    >
                      <Trash2 className="h-4 w-4" /> Limpar
                    </Button>
                  )}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.length > 0 ? (
                <div className="max-h-[60vh] space-y-1.5 overflow-y-auto pr-1">
                  {rows.map((iso) => {
                    const sel = grid[iso] ?? [];
                    return (
                      <div key={iso} className="rounded-md border p-2">
                        <div className="mb-1.5 flex items-center gap-2">
                          <input
                            type="time"
                            value={hhmm(iso)}
                            onChange={(e) => changeRowTime(iso, e.target.value)}
                            className="h-8 w-[104px] rounded-md border border-input bg-background px-2 text-sm font-bold"
                          />
                          <span className="text-[11px] text-muted-foreground">{dayLabel(iso)}</span>
                          <button
                            type="button"
                            onClick={() => removeRow(iso)}
                            className="ml-auto text-muted-foreground hover:text-destructive"
                            aria-label="Remover horário"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-6 gap-1">
                          {MONITOR_PARAMS.map((p) => {
                            const active = sel.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => toggleRowParam(iso, p.id)}
                                className={`h-7 rounded text-[10px] font-bold transition-colors ${
                                  active
                                    ? GROUP_ACCENT[paramGroup(p.id)]
                                    : "border bg-background text-muted-foreground"
                                }`}
                              >
                                {p.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma aferição planejada. Aplique uma rotina, um protocolo ou o gerador — ou
                  adicione um horário manualmente.
                </p>
              )}

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={replaceFuture}
                  onChange={(e) => setReplaceFuture(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Substituir rotina futura pendente existente
              </label>

              {state.error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {state.error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Link
                  href={`/pre-parto/${patient.id}`}
                  className="self-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Cancelar
                </Link>
                <Button type="submit" disabled={pending || finalTasks.length === 0}>
                  {pending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CalendarClock className="h-4 w-4" />
                  )}
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

function RoutineRow({
  routine,
  onApply,
  auto,
}: {
  routine: MonitoringRoutine;
  onApply: () => void;
  auto?: boolean;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            {routine.label}
            {auto && (
              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                AUTO
              </span>
            )}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{routine.description}</p>
        </div>
        <Button type="button" size="sm" variant="outline" onClick={onApply}>
          <Plus className="h-4 w-4" /> Aplicar
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {routine.rules.map((rule, i) => (
          <span
            key={i}
            className="rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground"
          >
            {rule.params.join("+")} · {rule.intervalMin}min
          </span>
        ))}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-muted-foreground">Referências</summary>
        <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">
          {routine.references.map((ref) => (
            <li key={ref}>{ref}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}
