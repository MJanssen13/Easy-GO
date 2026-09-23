import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { currentGaLabel } from "@/core/patients/display";
import { dueTask } from "@/core/schedule/planner";
import { EvolutionForm } from "../../_components/evolution-form";

export default async function EvolutionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ taskId?: string }>;
}) {
  const { id } = await params;
  const { taskId } = await searchParams;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const ga = currentGaLabel(patient);

  // Sem tarefa escolhida, vincula à aferição pendente da vez (vencida ou nos
  // próximos 30 min); `?taskId=none` registra uma aferição avulsa.
  const schedule = patient.schedule ?? [];
  const task =
    taskId === "none"
      ? undefined
      : taskId
        ? schedule.find((t) => t.id === taskId)
        : dueTask(schedule);
  const taskLabel = task
    ? new Date(task.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href={`/pre-parto/${patient.id}`}
        className="-my-1.5 inline-flex min-h-9 items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à paciente
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Registrar aferição</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {patient.name}
          {patient.bed ? ` · Leito ${patient.bed}` : ""}
          {ga ? ` · IG ${ga}` : ""}
        </p>
      </div>

      <EvolutionForm
        patient={patient}
        taskId={task?.id}
        taskLabel={taskLabel}
        unlinkHref={`/pre-parto/${patient.id}/evolucao?taskId=none`}
        focus={task?.focus ?? []}
      />
    </div>
  );
}
