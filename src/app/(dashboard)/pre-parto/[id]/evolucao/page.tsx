import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { currentGaLabel } from "@/core/patients/display";
import { EvolutionForm } from "../../_components/evolution-form";

/** ISO → local "YYYY-MM-DDTHH:mm" for datetime-local default. */
function toLocalInput(iso: string): string | undefined {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

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

  const task = taskId ? (patient.schedule ?? []).find((t) => t.id === taskId) : undefined;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href={`/pre-parto/${patient.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à paciente
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova evolução</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {patient.name}
          {patient.bed ? ` · Leito ${patient.bed}` : ""}
          {ga ? ` · IG ${ga}` : ""}
        </p>
      </div>

      <EvolutionForm
        patient={patient}
        taskId={task?.id}
        focus={task?.focus ?? []}
        defaultRecordedAt={task ? toLocalInput(task.timestamp) : undefined}
      />
    </div>
  );
}
