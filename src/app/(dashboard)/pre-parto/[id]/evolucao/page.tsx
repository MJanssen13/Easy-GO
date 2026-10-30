import Link from "next/link";
import { PageHero } from "@/components/page-header";
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
  searchParams: Promise<{ taskId?: string; voltar?: string }>;
}) {
  const { id } = await params;
  const { taskId, voltar } = await searchParams;
  // Aberta pelo quadro ("Aferir"): ao salvar, volta ao quadro.
  const returnTo = voltar === "/pre-parto" ? voltar : undefined;
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
      <PageHero
        back={{ href: `/pre-parto/${patient.id}`, label: "Paciente" }}
        eyebrow="Pré-Parto"
        title="Registrar aferição"
        meta={[patient.name, patient.bed && `Leito ${patient.bed}`, ga && `IG ${ga}`].filter(Boolean).join(" · ")}
      />

      <EvolutionForm
        patient={patient}
        taskId={task?.id}
        taskLabel={taskLabel}
        taskTimestamp={task?.timestamp}
        unlinkHref={`/pre-parto/${patient.id}/evolucao?taskId=none${returnTo ? `&voltar=${returnTo}` : ""}`}
        focus={task?.focus ?? []}
        returnTo={returnTo}
      />
    </div>
  );
}
