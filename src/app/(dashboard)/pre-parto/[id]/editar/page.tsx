import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { EditPatientForm } from "../../_components/edit-patient-form";

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href={`/pre-parto/${patient.id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar à paciente
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar paciente</h1>
        <p className="mt-1 text-sm text-muted-foreground">{patient.name}</p>
      </div>

      <EditPatientForm patient={patient} />
    </div>
  );
}
