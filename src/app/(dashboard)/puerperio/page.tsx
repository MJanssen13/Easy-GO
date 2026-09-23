import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Baby, BedDouble, CheckCircle2, Plus } from "lucide-react";
import { listPatients } from "@/core/patients/repository";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import type { Patient } from "@/core/patients/types";
import { DELIVERY_LABELS, readPuerperio } from "@/core/puerperio/types";
import { postpartumDay } from "@/core/puerperio/render";
import { puerperioPendings } from "@/core/puerperio/checklist";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Puerpério" };

function PuerperaCard({ patient }: { patient: Patient }) {
  const s = readPuerperio(patient.clinicalSummary);
  const resolved = RESOLVED_STATUSES.includes(patient.status);
  const day = postpartumDay(s.delivery.at);
  const today = new Date().toDateString();
  const evolvedToday = s.evolutions.some((e) => new Date(e.at).toDateString() === today);
  const pendings = resolved ? [] : puerperioPendings(patient, s);
  const nb = s.delivery.newborn;

  return (
    <Link href={`/puerperio/${patient.id}`} className="group block">
      <Card className="flex h-full flex-col p-4 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <BedDouble className="h-4 w-4 text-muted-foreground" />
            {patient.bed ? `Leito ${patient.bed}` : "Sem leito"}
          </div>
          <Badge variant={resolved ? "outline" : "success"}>{resolved ? "Alta" : `${day}º DPP`}</Badge>
        </div>
        <p className="mt-2 truncate text-base font-bold">{patient.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>{DELIVERY_LABELS[s.delivery.type]}</span>
          {patient.bloodType && <span>{patient.bloodType}</span>}
          {(nb.sex || nb.weight) && (
            <span className="inline-flex items-center gap-1">
              <Baby className="h-3.5 w-3.5" />
              {[nb.sex === "F" ? "♀" : nb.sex === "M" ? "♂" : "", nb.weight && `${nb.weight} g`]
                .filter(Boolean)
                .join(" ")}
            </span>
          )}
        </div>
        {pendings.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {pendings.slice(0, 2).map((p) => (
              <p
                key={p.text}
                className={`flex items-start gap-1 text-[11px] ${p.level === "danger" ? "font-semibold text-rose-700" : "text-amber-700"}`}
              >
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" /> {p.text}
              </p>
            ))}
          </div>
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

export default async function PuerperioBoard() {
  let patients: Patient[] = [];
  let loadError = false;
  try {
    patients = await listPatients("puerperio");
  } catch {
    loadError = true;
  }
  const active = patients.filter((p) => !RESOLVED_STATUSES.includes(p.status));
  const resolved = patients.filter((p) => RESOLVED_STATUSES.includes(p.status));
  const today = new Date().toDateString();
  const pendingToday = active.filter(
    (p) => !readPuerperio(p.clinicalSummary).evolutions.some((e) => new Date(e.at).toDateString() === today),
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        module="puerperio"
        title="Puerpério"
        subtitle={
          active.length > 0
            ? `${active.length} puérpera(s) · ${pendingToday > 0 ? `${pendingToday} sem evolução hoje` : "todas evoluídas hoje"}`
            : "Enfermaria GO geral"
        }
        actions={
          <Link href="/puerperio/admissao" className={buttonVariants()}>
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
          <p className="text-sm text-muted-foreground">Nenhuma puérpera internada.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Pacientes do Pré-Parto chegam aqui pelo botão &quot;Transferir para o Puerpério&quot; após o parto.
          </p>
          <Link href="/puerperio/admissao" className={`${buttonVariants({ variant: "outline" })} mt-3`}>
            <Plus className="h-4 w-4" /> Admitir puérpera
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {active.map((p) => (
            <PuerperaCard key={p.id} patient={p} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section className="space-y-3 border-t pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Altas</h2>
          <div className="grid grid-cols-1 gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {resolved.map((p) => (
              <PuerperaCard key={p.id} patient={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
