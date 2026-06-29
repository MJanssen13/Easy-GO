import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { currentGaLabel } from "@/core/patients/display";
import { EvolutionForm } from "../../_components/evolution-form";

export default async function EvolutionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const ga = currentGaLabel(patient);

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

      <EvolutionForm patient={patient} />
    </div>
  );
}
