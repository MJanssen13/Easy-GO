import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-header";
import { getPatient } from "@/core/patients/repository";
import { ObservationSheet } from "../../_components/observation-sheet";

export const metadata: Metadata = { title: "Planilha de aferições — Pré-Parto" };

export default async function SheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ editar?: string }>;
}) {
  const [{ id }, { editar }] = await Promise.all([params, searchParams]);
  const patient = await getPatient(id);
  if (!patient) notFound();

  return (
    <div className="space-y-5">
      <PageHero
        back={{ href: `/pre-parto/${patient.id}`, label: "Paciente" }}
        eyebrow="Pré-Parto"
        title="Planilha de aferições"
        bed={patient.bed ?? null}
        meta={`${patient.name} · lançar e editar várias aferições de uma vez`}
      />
      <ObservationSheet patientId={patient.id} observations={patient.observations ?? []} focusObsId={editar} />
    </div>
  );
}
