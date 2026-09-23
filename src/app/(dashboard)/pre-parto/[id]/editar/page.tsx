import Link from "next/link";
import { PageHero } from "@/components/page-header";
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
      <PageHero
        back={{ href: `/pre-parto/${patient.id}`, label: "Paciente" }}
        eyebrow="Pré-Parto"
        title="Editar paciente"
        meta={[patient.name, patient.bed && `Leito ${patient.bed}`].filter(Boolean).join(" · ")}
      />

      <EditPatientForm patient={patient} />
    </div>
  );
}
