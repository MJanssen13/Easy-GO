"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BedDouble, CheckCircle2, Clock } from "lucide-react";
import { taskUrgency } from "@/core/schedule/planner";
import { paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import { updateTaskStatus } from "../actions";

export interface FlatTask {
  id: string;
  patientId: string;
  patientName: string;
  bed: string | null;
  timestamp: string;
  focus: string[];
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
  const [now, setNow] = useState(() => new Date());
  const [sortBy, setSortBy] = useState<"time" | "bed">("time");

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const sorted = [...tasks].sort((a, b) => {
    if (sortBy === "bed") {
      const bd = (a.bed ?? "").localeCompare(b.bed ?? "", undefined, { numeric: true });
      if (bd !== 0) return bd;
    }
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  return (
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
            return (
              <li key={task.id} className={`rounded-xl border p-3 ${URGENCY_STYLE[urgency]}`}>
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/pre-parto/${task.patientId}/evolucao?taskId=${task.id}`} className="flex-1">
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
                  </Link>

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
  );
}
