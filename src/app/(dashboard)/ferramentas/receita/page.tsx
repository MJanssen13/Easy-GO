import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import {
  toISODateLocal,
  gaFromEdd,
  gaFromLMP,
  type GestationalAge,
} from "@/core/obstetric/gestational-age";
import { listPatients } from "@/core/patients/repository";
import type { Patient } from "@/core/patients/types";
import { ReceitaGenerator, type PacienteLite } from "../../psgo/_components/receita-generator";

export const metadata: Metadata = { title: "Receita" };

/** IG legível ("24 semanas e 3 dias"). */
function fmtGa(ga: GestationalAge): string {
  const w = `${ga.weeks} semana${ga.weeks === 1 ? "" : "s"}`;
  return ga.days ? `${w} e ${ga.days} dia${ga.days === 1 ? "" : "s"}` : w;
}

/** IG atual da paciente pela datação do prontuário (DPP ancora a linha do tempo). */
function igAtual(p: Patient): string | null {
  const today = new Date();
  const edd = p.edd ? new Date(`${p.edd}T00:00:00`) : null;
  if (edd && !Number.isNaN(edd.getTime())) return fmtGa(gaFromEdd(edd, today));
  const lmp = p.lmp ? new Date(`${p.lmp}T00:00:00`) : null;
  if (lmp && !Number.isNaN(lmp.getTime())) return fmtGa(gaFromLMP(lmp, today));
  return null;
}

export default async function ReceitaPage({
  searchParams,
}: {
  searchParams: Promise<{ patientId?: string }>;
}) {
  const { patientId } = await searchParams;

  // Pacientes do PSGO para preenchimento automático (best-effort — a ferramenta
  // funciona mesmo sem conexão com o Supabase).
  let patients: PacienteLite[] = [];
  try {
    const rows: Patient[] = await listPatients("psgo");
    patients = rows.map((p) => ({
      id: p.id,
      name: p.name,
      medicalRecordNumber: p.medicalRecordNumber,
      age: p.age,
      ga: igAtual(p),
    }));
  } catch {
    patients = [];
  }

  return (
    <div className="space-y-5">
      <PageHeader
        module="ferramentas"
        title="Receita"
        subtitle="Ferramentas · receita comum ou de controle especial"
        actions={
          <Link href="/ferramentas" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
        }
      />

      <ReceitaGenerator
        today={toISODateLocal(new Date())}
        patients={patients}
        admissionPatientId={patientId}
      />
    </div>
  );
}
