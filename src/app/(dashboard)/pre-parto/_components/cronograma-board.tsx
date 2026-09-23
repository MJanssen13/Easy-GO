"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CheckCircle2, Clock, PencilLine } from "lucide-react";
import { shiftEnd, taskUrgency } from "@/core/schedule/planner";
import { paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import { updateTaskStatus } from "../actions";
import { EvolutionForm } from "./evolution-form";

export interface FlatTask {
  id: string;
  patientId: string;
  patientName: string;
  bed: string | null;
  timestamp: string;
  focus: string[];
  useMethyldopa: boolean;
  useMagnesiumSulfate: boolean;
}

const URGENCY_STYLE: Record<string, string> = {
  overdue: "border-destructive/40 bg-destructive/5",
  due: "border-amber-300 bg-amber-50",
  upcoming: "border-border bg-card",
};

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export function CronogramaBoard({ tasks }: { tasks: FlatTask[] }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [sortBy, setSortBy] = useState<"time" | "bed">("time");
  const [windowOpt, setWindowOpt] = useState<"2h" | "shift" | "all">("shift");
  const [selected, setSelected] = useState<FlatTask | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Desktop (lg+) abre a evolução ao lado; celular navega para a página cheia.
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  function openTask(task: FlatTask) {
    if (isDesktop) {
      setSelected(task);
    } else {
      router.push(`/pre-parto/${task.patientId}/evolucao?taskId=${task.id}`);
    }
  }

  const sorted = [...tasks].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Janela: atrasadas sempre aparecem; o resto até o limite escolhido.
  const limit =
    windowOpt === "2h"
      ? now.getTime() + 2 * 3600000
      : windowOpt === "shift"
        ? shiftEnd(now).getTime()
        : Infinity;
  const visible = sorted.filter((t) => new Date(t.timestamp).getTime() <= limit);
  const hidden = sorted.length - visible.length;
  const overdueCount = sorted.filter((t) => taskUrgency(t.timestamp, now) === "overdue").length;

  // Grupos: por horário (padrão) ou por leito.
  const groups: { key: string; title: string; urgency?: string; items: FlatTask[] }[] = [];
  if (sortBy === "time") {
    for (const t of visible) {
      const k = hhmm(t.timestamp);
      const last = groups[groups.length - 1];
      if (last && last.key === t.timestamp) last.items.push(t);
      else groups.push({ key: t.timestamp, title: k, urgency: taskUrgency(t.timestamp, now), items: [t] });
    }
  } else {
    const byPatient = new Map<string, FlatTask[]>();
    for (const t of visible) byPatient.set(t.patientId, [...(byPatient.get(t.patientId) ?? []), t]);
    for (const [pid, items] of [...byPatient.entries()].sort(([, a], [, b]) =>
      (a[0]!.bed ?? "").localeCompare(b[0]!.bed ?? "", undefined, { numeric: true }),
    )) {
      const f = items[0]!;
      groups.push({ key: pid, title: `${f.bed ? `Leito ${f.bed}` : "Sem leito"} · ${f.patientName}`, items });
    }
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-5">
      {/* Lista de tarefas */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
              <Clock className="h-3 w-3" /> {tasks.length} pendentes
            </span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1 text-xs font-bold text-destructive">
                {overdueCount} atrasadas
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Segmented
              value={windowOpt}
              onChange={(v) => setWindowOpt(v as typeof windowOpt)}
              options={[
                ["2h", "Próx. 2 h"],
                ["shift", "Plantão"],
                ["all", "Todas"],
              ]}
            />
            <Segmented
              value={sortBy}
              onChange={(v) => setSortBy(v as typeof sortBy)}
              options={[
                ["time", "Horário"],
                ["bed", "Leito"],
              ]}
            />
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
            <p className="font-semibold text-foreground">Tudo em dia</p>
            <p className="text-sm">
              {hidden > 0 ? `Nada nesta janela (${hidden} mais tarde).` : "Nenhuma aferição pendente no momento."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <section key={g.key} className="overflow-hidden rounded-xl border bg-card">
                <header
                  className={`flex items-center gap-2 border-b px-3 py-1.5 ${
                    g.urgency ? URGENCY_STYLE[g.urgency] : "bg-muted/40"
                  }`}
                >
                  <span className={sortBy === "time" ? "font-mono text-lg font-bold" : "text-sm font-semibold"}>
                    {g.title}
                  </span>
                  {g.urgency === "overdue" && (
                    <span className="text-xs font-bold text-destructive">atrasada</span>
                  )}
                  {g.urgency === "due" && <span className="text-xs font-bold text-amber-700">agora</span>}
                </header>
                <ul className="divide-y">
                  {g.items.map((task) => {
                    const active = selected?.id === task.id && selected.patientId === task.patientId;
                    const urgency = taskUrgency(task.timestamp, now);
                    return (
                      <li
                        key={`${task.patientId}:${task.id}`}
                        className={`flex items-center gap-2 px-3 py-2 ${active ? "bg-primary/5 ring-2 ring-inset ring-primary" : ""}`}
                      >
                        <button
                          type="button"
                          onClick={() => openTask(task)}
                          className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-left"
                          title="Registrar esta aferição"
                        >
                          {sortBy === "time" ? (
                            <span className="flex min-w-0 items-center gap-1 text-sm font-medium">
                              <BedDouble className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                              <span className="truncate">
                                {task.bed ? `L${task.bed}` : "—"} · {task.patientName}
                              </span>
                            </span>
                          ) : (
                            <span
                              className={`font-mono text-sm font-bold ${urgency === "overdue" ? "text-destructive" : urgency === "due" ? "text-amber-700" : ""}`}
                            >
                              {hhmm(task.timestamp)}
                            </span>
                          )}
                          <span className="flex flex-wrap gap-1">
                            {task.focus.map((f) => (
                              <span
                                key={f}
                                className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${GROUP_ACCENT[paramGroup(f)]}`}
                              >
                                {f}
                              </span>
                            ))}
                          </span>
                        </button>
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="patientId" value={task.patientId} />
                          <input type="hidden" name="taskId" value={task.id} />
                          <input type="hidden" name="status" value="completed" />
                          <button
                            type="submit"
                            title="Marcar como feita (sem registrar valores)"
                            className="rounded-full p-1.5 text-muted-foreground hover:bg-emerald-100 hover:text-emerald-600"
                          >
                            <CheckCircle2 className="h-5 w-5" />
                          </button>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {hidden > 0 && (
              <button
                type="button"
                onClick={() => setWindowOpt("all")}
                className="w-full rounded-lg border border-dashed py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Mostrar mais {hidden} aferições
              </button>
            )}
          </div>
        )}
      </div>

      {/* Painel de escrita rápida (desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto rounded-xl border bg-card p-4">
          {selected ? (
            <>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="flex items-center gap-1.5 text-sm font-bold">
                    <PencilLine className="h-4 w-4 text-primary" />
                    {hhmm(selected.timestamp)} · {selected.patientName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selected.bed ? `Leito ${selected.bed}` : "sem leito"}
                  </p>
                </div>
              </div>
              <EvolutionForm
                key={`${selected.patientId}:${selected.id}`}
                patient={{
                  id: selected.patientId,
                  useMethyldopa: selected.useMethyldopa,
                  useMagnesiumSulfate: selected.useMagnesiumSulfate,
                }}
                taskId={selected.id}
                taskLabel={hhmm(selected.timestamp)}
                focus={selected.focus}
                returnTo="/pre-parto/cronograma"
                onCancel={() => setSelected(null)}
              />
            </>
          ) : (
            <div className="flex h-full min-h-[40vh] flex-col items-center justify-center text-center text-muted-foreground">
              <PencilLine className="mb-2 h-8 w-8 text-primary/40" />
              <p className="font-semibold text-foreground">Escrita rápida</p>
              <p className="text-sm">Selecione uma aferição à esquerda para registrar aqui ao lado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={`rounded-md px-3 py-1 text-xs font-bold ${
            value === v ? "bg-background shadow-sm" : "text-muted-foreground"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
