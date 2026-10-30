import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-header";
import { getPatient } from "@/core/patients/repository";
import { getCtg } from "@/core/ctg/repository";
import { CtgForm } from "../../../_components/ctg-form";

export default async function EditCtgPage({ params }: { params: Promise<{ id: string; ctgId: string }> }) {
  const { id, ctgId } = await params;
  const [patient, ctg] = await Promise.all([getPatient(id), getCtg(ctgId).catch(() => null)]);
  if (!patient || !ctg || ctg.patientId !== patient.id) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHero
        back={{ href: `/pre-parto/${patient.id}`, label: "Paciente" }}
        eyebrow="Pré-Parto"
        title="Editar cardiotocografia"
        meta={[patient.name, patient.bed && `Leito ${patient.bed}`].filter(Boolean).join(" · ")}
      />
      <CtgForm patient={patient} ctg={ctg} />
    </div>
  );
}
