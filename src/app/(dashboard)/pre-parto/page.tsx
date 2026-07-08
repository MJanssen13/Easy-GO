import type { Metadata } from "next";
import Link from "next/link";
import { Activity, Plus, AlertTriangle, CalendarClock } from "lucide-react";
import { listPatients, listObservationsSince } from "@/core/patients/repository";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import { get24hStats, type Stats24h } from "@/core/patients/stats";
import type { Patient, Observation } from "@/core/patients/types";
import { buttonVariants } from "@/components/ui/button";
import { PatientCard } from "./_components/patient-card";
import { ShiftTeamCard } from "./_components/shift-team-card";

export const metadata: Metadata = { title: "Pré-Parto" };

export default async function PrePartoBoard() {
  let patients: Patient[] = [];
  let loadError = false;
  try {
    patients = await listPatients("pre_parto");
  } catch {
    loadError = true;
  }

  const active = patients.filter((p) => !RESOLVED_STATUSES.includes(p.status));
  const resolved = patients.filter((p) => RESOLVED_STATUSES.includes(p.status));

  // Faixas de BCF/PA das últimas 24h para o card (uma query só).
  const statsByPatient: Record<string, Stats24h | null> = {};
  if (active.length > 0) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    try {
      const obs = await listObservationsSince(
        active.map((p) => p.id),
        since,
      );
      const grouped: Record<string, Observation[]> = {};
      for (const o of obs) (grouped[o.patientId] ||= []).push(o);
      for (const p of active) statsByPatient[p.id] = get24hStats(grouped[p.id]);
    } catch {
      // sem stats se a consulta falhar
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Activity className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pré-Parto</h1>
            <p className="text-sm text-muted-foreground">Leitos e trabalho de parto</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pre-parto/cronograma" className={buttonVariants({ variant: "outline" })}>
            <CalendarClock className="h-4 w-4" /> Cronograma
          </Link>
          <Link href="/pre-parto/admissao" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Admitir
          </Link>
        </div>
      </div>

      <ShiftTeamCard />

      {loadError && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Não foi possível carregar os leitos. Verifique a conexão com o Supabase (variáveis de
            ambiente e migração aplicada).
          </span>
        </div>
      )}

      {!loadError && active.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma paciente no pré-parto.</p>
          <Link href="/pre-parto/admissao" className={`${buttonVariants({ variant: "outline" })} mt-3`}>
            <Plus className="h-4 w-4" /> Admitir primeira paciente
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {active.map((p) => (
            <PatientCard key={p.id} patient={p} stats={statsByPatient[p.id]} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section className="space-y-3 border-t pt-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Resolvidas
          </h2>
          <div className="grid grid-cols-1 gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3">
            {resolved.map((p) => (
              <PatientCard key={p.id} patient={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
