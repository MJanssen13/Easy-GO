import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Plus } from "lucide-react";
import { listPatients } from "@/core/patients/repository";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import type { Patient } from "@/core/patients/types";
import { readOnco } from "@/core/oncogineco/types";
import { oncoDiagnosisLine, postOpDay } from "@/core/oncogineco/render";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { BedAvatar, CardStrip } from "@/components/bed-avatar";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Onco-Ginecologia" };

function OncoCard({ patient }: { patient: Patient }) {
  const s = readOnco(patient.clinicalSummary);
  const resolved = RESOLVED_STATUSES.includes(patient.status);
  const pod = postOpDay(s.history);
  const today = new Date().toDateString();
  const evolvedToday = s.evolutions.some((e) => new Date(e.at).toDateString() === today);
  const dx = oncoDiagnosisLine(s.history);
  return (
    <Link href={`/oncogineco/${patient.id}`} className="group block">
      <Card className="relative flex h-full flex-col overflow-hidden p-4 pt-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <CardStrip alert={!resolved && !evolvedToday} />
        <div className="flex items-center gap-3">
          <BedAvatar bed={patient.bed} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold tracking-tight">{patient.name}</p>
            <div className="mt-1"><Badge variant={resolved ? "outline" : pod != null ? "warning" : "secondary"}>
            {resolved ? "Alta" : pod != null ? `${pod}º DPO` : "Internada"}
          </Badge></div>
          </div>
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{dx || "Diagnóstico não informado"}</p>
        {s.history.surgery && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{s.history.surgery}</p>
        )}
        <div className="flex-1" />
        {!resolved && (
          <div
            className={`mt-3 flex items-center gap-1.5 border-t pt-2 text-xs ${evolvedToday ? "text-emerald-700" : "font-semibold text-amber-700"}`}
          >
            {evolvedToday ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" /> Evoluída hoje
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" /> Evolução de hoje pendente
              </>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}

export default async function OncoBoard() {
  let patients: Patient[] = [];
  let loadError = false;
  try {
    patients = await listPatients("oncogineco");
  } catch {
    loadError = true;
  }
  const active = patients.filter((p) => !RESOLVED_STATUSES.includes(p.status));
  const resolved = patients.filter((p) => RESOLVED_STATUSES.includes(p.status));
  const today = new Date().toDateString();
  const pendingToday = active.filter(
    (p) => !readOnco(p.clinicalSummary).evolutions.some((e) => new Date(e.at).toDateString() === today),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        module="oncogineco"
        title="Onco-Ginecologia"
        subtitle={
          active.length > 0
            ? `${active.length} internada(s) · ${pendingToday > 0 ? `${pendingToday} sem evolução hoje` : "todas evoluídas hoje"}`
            : "Enfermaria oncológica"
        }
        actions={
          <Link href="/oncogineco/admissao" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Admitir
          </Link>
        }
      />

      {loadError && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Não foi possível carregar os leitos. Verifique a conexão com o Supabase.
        </div>
      )}

      {!loadError && active.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma paciente internada.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pacientes do PSGO chegam aqui pela transferência; ou admita diretamente.
          </p>
          <Link href="/oncogineco/admissao" className={`${buttonVariants({ variant: "outline" })} mt-3`}>
            <Plus className="h-4 w-4" /> Admitir paciente
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {active.map((p) => (
            <OncoCard key={p.id} patient={p} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section className="space-y-3 border-t pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Altas</h2>
          <div className="grid grid-cols-1 gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resolved.map((p) => (
              <OncoCard key={p.id} patient={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
