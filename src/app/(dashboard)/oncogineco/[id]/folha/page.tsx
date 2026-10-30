import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero } from "@/components/page-header";
import { ParameterSheet } from "@/components/parameter-sheet";
import { getPatient } from "@/core/patients/repository";

export const metadata: Metadata = { title: "Folha de parâmetros — Onco-Ginecologia" };

export default async function ParameterSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  return (
    <div className="space-y-5">
      <PageHero
        back={{ href: `/oncogineco/${patient.id}`, label: "Paciente" }}
        eyebrow="Onco-Ginecologia"
        title="Folha de parâmetros"
        bed={patient.bed ?? null}
        meta={`${patient.name} · impressão A4 com as aferições registradas`}
      />
      <ParameterSheet patient={patient} observations={patient.observations ?? []} />
    </div>
  );
}
