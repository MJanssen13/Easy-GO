import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Activity } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { CtgForm } from "../../_components/ctg-form";

export default async function CtgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href={`/pre-parto/${patient.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à paciente
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Activity className="h-6 w-6 text-primary" /> Nova cardiotocografia
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {patient.name}
          {patient.bed ? ` · Leito ${patient.bed}` : ""}
        </p>
      </div>

      <CtgForm patient={patient} />
    </div>
  );
}
