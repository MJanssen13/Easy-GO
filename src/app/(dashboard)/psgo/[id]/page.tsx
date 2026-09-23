import type { Metadata } from "next";
import { PageHero } from "@/components/page-header";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Siren, ArrowLeft, Pencil, ArrowRightLeft, LogOut } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { patientToPsgoForm, type PsgoClinicalSummary } from "@/core/psgo/patient-mapper";
import { renderPsgo } from "@/core/psgo/render";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { PsgoTransfer } from "../_components/psgo-transfer";
import { PsgoLifecycle } from "../_components/psgo-lifecycle";
import { PsgoTermosButton } from "../_components/psgo-termos-button";

export const metadata: Metadata = { title: "Paciente — PSGO" };

function gaLabel(gaWeeks?: number | null, gaDays?: number | null): string | null {
  if (gaWeeks == null) return null;
  return `${gaWeeks}s${gaDays ? ` ${gaDays}d` : ""}`;
}

export default async function PsgoPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id).catch(() => null);
  if (!patient) notFound();

  const cs = patient.clinicalSummary as unknown as PsgoClinicalSummary | null;
  const form = patientToPsgoForm(patient);
  const prontuario = cs?.prontuario ?? (form ? renderPsgo(form) : "");
  const ga = gaLabel(patient.gaWeeks, patient.gaDays);

  return (
    <div className="space-y-5">
      <PageHero
        back={{ href: "/psgo", label: "PSGO" }}
        eyebrow="PSGO"
        title={patient.name}
        meta={[
          patient.medicalRecordNumber && `RG ${patient.medicalRecordNumber}`,
          patient.age != null && `${patient.age} anos`,
          ga && `IG ${ga}`,
          cs?.robsonGroup != null && `Robson ${cs.robsonGroup}`,
        ]
          .filter(Boolean)
          .join(" · ")}
        actions={
          <>
            <PsgoTermosButton name={patient.name} rg={patient.medicalRecordNumber ?? ""} size="default" />
            <Link href={`/psgo/admissao?id=${patient.id}`} className={buttonVariants()}>
              <Pencil className="h-4 w-4" /> Editar admissão
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-y-2 text-base">
              Prontuário
              <CopyButton text={prontuario} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            {prontuario ? (
              <pre className="prontuario-text overflow-x-auto text-xs">{prontuario}</pre>
            ) : (
              <p className="text-sm text-muted-foreground">
                Esta paciente não tem uma admissão do PSGO registrada (pode ter vindo de outro
                módulo).
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5 lg:h-fit">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
            <ArrowRightLeft className="h-4 w-4" /> Transferir
          </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-xs text-muted-foreground">
                Move a paciente para outro módulo. Os dados comuns e a admissão viajam junto; a
                transferência fica registrada.
              </p>
              <PsgoTransfer patientId={patient.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
            <LogOut className="h-4 w-4" /> Alta e exclusão
          </CardTitle>
            </CardHeader>
            <CardContent>
              <PsgoLifecycle
                patientId={patient.id}
                discharged={patient.outcome === "discharge"}
                dischargeTime={patient.dischargeTime}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
