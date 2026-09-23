import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getPatient } from "@/core/patients/repository";
import { patientToPsgoForm } from "@/core/psgo/patient-mapper";
import { toISODateLocal } from "@/core/obstetric/gestational-age";
import type { PsgoForm } from "@/core/psgo/types";
import { PsgoGenerator } from "../_components/psgo-generator";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Admissão — PSGO" };

export default async function PsgoAdmissionPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  let initialForm: PsgoForm | undefined;
  let editId: string | undefined;
  if (id) {
    const patient = await getPatient(id).catch(() => null);
    if (patient) {
      editId = id;
      initialForm = patientToPsgoForm(patient) ?? undefined;
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        module="psgo"
        title={editId ? "Editar admissão" : "Nova admissão"}
        subtitle="PSGO"
        actions={
          <Link href="/psgo" className={buttonVariants({ variant: "outline" })}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
        }
      />

      <PsgoGenerator
        initialForm={initialForm}
        patientId={editId}
        today={toISODateLocal(new Date())}
      />
    </div>
  );
}
