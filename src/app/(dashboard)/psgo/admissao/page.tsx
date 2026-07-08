import type { Metadata } from "next";
import Link from "next/link";
import { Siren, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { getPatient } from "@/core/patients/repository";
import { patientToPsgoForm } from "@/core/psgo/patient-mapper";
import type { PsgoForm } from "@/core/psgo/types";
import { PsgoGenerator } from "../_components/psgo-generator";

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Siren className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {editId ? "Editar admissão" : "Nova admissão"} — PSGO
            </h1>
            <p className="text-sm text-muted-foreground">
              Pronto-socorro obstétrico. Apoio à decisão; valide com a equipe.
            </p>
          </div>
        </div>
        <Link href="/psgo" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <PsgoGenerator initialForm={initialForm} patientId={editId} />
    </div>
  );
}
