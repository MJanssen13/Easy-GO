import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { toISODateLocal } from "@/core/obstetric/gestational-age";
import { listPatients } from "@/core/patients/repository";
import type { Patient } from "@/core/patients/types";
import { AtestadoGenerator, type PacienteLite } from "../_components/atestado-generator";

export const metadata: Metadata = { title: "Atestado" };

export default async function AtestadoPage() {
  // Pacientes do PSGO para preenchimento automático (best-effort).
  let patients: PacienteLite[] = [];
  try {
    const rows: Patient[] = await listPatients("psgo");
    patients = rows.map((p) => ({
      id: p.id,
      name: p.name,
      medicalRecordNumber: p.medicalRecordNumber,
    }));
  } catch {
    patients = [];
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Atestado</h1>
            <p className="text-sm text-muted-foreground">
              Atestado médico e declarações. Apoio à documentação; valide e assine.
            </p>
          </div>
        </div>
        <Link href="/ferramentas" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <AtestadoGenerator today={toISODateLocal(new Date())} patients={patients} />
    </div>
  );
}
