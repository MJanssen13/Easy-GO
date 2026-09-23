import type { Metadata } from "next";
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
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <Link
            href={`/pre-parto/${patient.id}`}
            className="-my-1.5 inline-flex min-h-9 items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar à paciente
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Partograma</h1>
          <p className="text-sm text-muted-foreground">
            {patient.name}
            {patient.bed ? ` · Leito ${patient.bed}` : ""}
            {opened
              ? ` · aberto em ${opened.toLocaleDateString("pt-BR")} às ${opened.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
        </div>
        {data && (
          <Link href={`/pre-parto/${patient.id}/evolucao`} className={buttonVariants()}>
            <Stethoscope className="h-4 w-4" /> Registrar aferição
          </Link>
        )}
      </div>

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
