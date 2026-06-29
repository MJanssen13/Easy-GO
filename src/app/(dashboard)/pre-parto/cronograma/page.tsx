import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { listPatients } from "@/core/patients/repository";
import { pendingTasks } from "@/core/schedule/planner";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import { CronogramaBoard, type FlatTask } from "../_components/cronograma-board";

export default async function CronogramaPage() {
  let tasks: FlatTask[] = [];
  let error = false;

  try {
    const patients = await listPatients("pre_parto");
    tasks = patients
      .filter((p) => !RESOLVED_STATUSES.includes(p.status))
      .flatMap((p) =>
        pendingTasks(p.schedule ?? []).map((t) => ({
          id: t.id,
          patientId: p.id,
          patientName: p.name,
          bed: p.bed ?? null,
          timestamp: t.timestamp,
          focus: t.focus,
        })),
      );
  } catch {
    error = true;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/pre-parto"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cronograma do plantão</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Próximas aferições planejadas de todas as pacientes do Pré-Parto.
        </p>
      </div>

      {error ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Não foi possível carregar o cronograma. Verifique a conexão com o Supabase.
        </p>
      ) : (
        <CronogramaBoard tasks={tasks} />
      )}
    </div>
  );
}
