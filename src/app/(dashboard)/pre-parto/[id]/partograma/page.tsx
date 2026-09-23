import type { Metadata } from "next";
import { PageHero } from "@/components/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Stethoscope } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { currentGaLabel } from "@/core/patients/display";
import { readPartogram } from "@/core/partogram/types";
import { buttonVariants } from "@/components/ui/button";
import { OpenPartogram } from "../../_components/open-partogram";
import { PartogramWorkspace } from "../../_components/partogram-workspace";

export const metadata: Metadata = { title: "Partograma" };

export default async function PartogramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();
  const data = readPartogram(patient.partogramData);
  const opened = data?.openedAt ? new Date(data.openedAt) : null;

  return (
    <div className="space-y-4">
      <PageHero
        back={{ href: `/pre-parto/${patient.id}`, label: "Paciente" }}
        eyebrow="Pré-Parto"
        title="Partograma"
        meta={[
          patient.name,
          patient.bed && `Leito ${patient.bed}`,
          opened &&
            `aberto em ${opened.toLocaleDateString("pt-BR")} às ${opened.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          data && (
            <Link href={`/pre-parto/${patient.id}/evolucao`} className={buttonVariants()}>
              <Stethoscope className="h-4 w-4" /> Registrar aferição
            </Link>
          )
        }
      />

      {data ? (
        <PartogramWorkspace
          patient={{
            id: patient.id,
            name: patient.name,
            medicalRecordNumber: patient.medicalRecordNumber,
            age: patient.age,
            parity: patient.parity,
            bloodType: patient.bloodType,
            babyName: [patient.babyName, patient.babyName2].filter(Boolean).join(" / ") || null,
            lmp: patient.lmp,
            edd: patient.edd,
            gaLabel: currentGaLabel(patient),
            usGa: patient.usGaWeeks != null ? `${patient.usGaWeeks}+${patient.usGaDays ?? 0}` : null,
          }}
          initial={data}
          observations={patient.observations ?? []}
        />
      ) : (
        <div className="max-w-md">
          <OpenPartogram patientId={patient.id} />
        </div>
      )}
    </div>
  );
}
