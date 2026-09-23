import Link from "next/link";
import { PageHero } from "@/components/page-header";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { RoutinePlanner } from "../../_components/routine-planner";

export default async function RoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  return (
    <div className="space-y-5">
      <PageHero
        back={{ href: `/pre-parto/${patient.id}`, label: "Paciente" }}
        eyebrow="Pré-Parto"
        title="Rotina de aferições"
        meta={[patient.name, patient.bed && `Leito ${patient.bed}`].filter(Boolean).join(" · ")}
      />

      <RoutinePlanner patient={patient} />
    </div>
  );
}
