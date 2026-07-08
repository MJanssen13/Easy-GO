"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, CheckCircle2, Clock, PencilLine } from "lucide-react";
import { taskUrgency } from "@/core/schedule/planner";
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

/** ISO → "YYYY-MM-DDTHH:mm" local, for the datetime-local default. */
function toLocalInput(iso: string): string | undefined {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function CronogramaBoard({ tasks }: { tasks: FlatTask[] }) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [sortBy, setSortBy] = useState<"time" | "bed">("time");
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

  const sorted = [...tasks].sort((a, b) => {
    if (sortBy === "bed") {
      const bd = (a.bed ?? "").localeCompare(b.bed ?? "", undefined, { numeric: true });
      if (bd !== 0) return bd;
    }
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)] lg:gap-5">
      {/* Lista de tarefas */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1 rounded-full border bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
            <Clock className="h-3 w-3" /> {tasks.length} pendentes
          </div>
          <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
            <button
              onClick={() => setSortBy("time")}
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                sortBy === "time" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Horário
            </button>
            <button
              onClick={() => setSortBy("bed")}
              className={`rounded-md px-3 py-1 text-xs font-bold ${
                sortBy === "bed" ? "bg-background shadow-sm" : "text-muted-foreground"
              }`}
            >
              Leito
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-muted-foreground">
            <CheckCircle2 className="mb-2 h-8 w-8 text-emerald-500" />
            <p className="font-semibold text-foreground">Tudo em dia</p>
            <p className="text-sm">Nenhuma aferição pendente no momento.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sorted.map((task) => {
              const urgency = taskUrgency(task.timestamp, now);
              const active = selected?.id === task.id;
              return (
                <li
                  key={task.id}
                  className={`rounded-xl border p-3 ${URGENCY_STYLE[urgency]} ${
                    active ? "ring-2 ring-primary" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => openTask(task)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-baseline gap-2">
                        <span className="font-mono text-xl font-bold">{hhmm(task.timestamp)}</span>
                        {urgency === "overdue" && (
                          <span className="text-xs font-bold text-destructive">atrasada</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                        <BedDouble className="h-3.5 w-3.5" />
                        {task.bed ? `Leito ${task.bed}` : "sem leito"} · {task.patientName}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {task.focus.length > 0 ? (
                          task.focus.map((f) => (
                            <span
                              key={f}
                              className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${GROUP_ACCENT[paramGroup(f)]}`}
                            >
                              {f}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs italic text-muted-foreground">rotina padrão</span>
                        )}
                      </div>
                    </button>

                    <form action={updateTaskStatus}>
                      <input type="hidden" name="patientId" value={task.patientId} />
                      <input type="hidden" name="taskId" value={task.id} />
                      <input type="hidden" name="status" value="completed" />
                      <button
                        type="submit"
                        title="Marcar como feita"
                        className="rounded-full p-1.5 text-muted-foreground hover:bg-emerald-100 hover:text-emerald-600"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Painel de escrita rápida (desktop) */}
      <div className="hidden lg:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border bg-card p-4">
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
                key={selected.id}
                patient={{
                  id: selected.patientId,
                  useMethyldopa: selected.useMethyldopa,
                  useMagnesiumSulfate: selected.useMagnesiumSulfate,
                }}
                taskId={selected.id}
                focus={selected.focus}
                defaultRecordedAt={toLocalInput(selected.timestamp)}
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
