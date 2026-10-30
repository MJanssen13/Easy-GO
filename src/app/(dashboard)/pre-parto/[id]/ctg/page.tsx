import Link from "next/link";
import { PageHero } from "@/components/page-header";
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
      <PageHero
        back={{ href: `/pre-parto/${patient.id}`, label: "Paciente" }}
        eyebrow="Pré-Parto"
        title="Nova cardiotocografia"
        meta={[patient.name, patient.bed && `Leito ${patient.bed}`].filter(Boolean).join(" · ")}
      />

      <CtgForm patient={patient} />
    </div>
  );
}
