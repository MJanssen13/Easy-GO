import type { Metadata } from "next";
import Link from "next/link";
import { Siren, Plus, AlertTriangle, Pill } from "lucide-react";
import { listPatients, purgeExpiredDischarges } from "@/core/patients/repository";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import type { Patient } from "@/core/patients/types";
import { buttonVariants } from "@/components/ui/button";
import { PsgoPatientCard } from "./_components/psgo-patient-card";

export const metadata: Metadata = { title: "PSGO" };

export default async function PsgoBoard() {
  let patients: Patient[] = [];
  let loadError = false;
  try {
    // Retenção: remove as altas cujo prontuário passou das 24h (best-effort).
    await purgeExpiredDischarges("psgo").catch(() => {});
    patients = await listPatients("psgo");
  } catch {
    loadError = true;
  }

  const active = patients.filter((p) => !RESOLVED_STATUSES.includes(p.status));
  const resolved = patients.filter((p) => RESOLVED_STATUSES.includes(p.status));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Siren className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">PSGO</h1>
            <p className="text-sm text-muted-foreground">
              Pronto-socorro obstétrico — admissões e prontuário.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/psgo/receita" className={buttonVariants({ variant: "outline" })}>
            <Pill className="h-4 w-4" /> Receita
          </Link>
          <Link href="/psgo/admissao" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Nova admissão
          </Link>
        </div>
      </div>

      {loadError && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Não foi possível carregar as admissões. Verifique a conexão com o Supabase (variáveis de
            ambiente e migração aplicada).
          </span>
        </div>
      )}

      {!loadError && active.length === 0 && (
        <div className="rounded-xl border border-dashed bg-white py-12 text-center">
          <p className="text-sm text-muted-foreground">Nenhuma admissão no PSGO.</p>
          <Link
            href="/psgo/admissao"
            className={`${buttonVariants({ variant: "outline" })} mt-3`}
          >
            <Plus className="h-4 w-4" /> Nova admissão
          </Link>
        </div>
      )}

      {active.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {active.map((p) => (
            <PsgoPatientCard key={p.id} patient={p} />
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <section className="space-y-3 border-t pt-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Altas recentes
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              O prontuário fica salvo por 24h após a alta e depois é excluído automaticamente.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 opacity-75 sm:grid-cols-2 lg:grid-cols-3">
            {resolved.map((p) => (
              <PsgoPatientCard key={p.id} patient={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
