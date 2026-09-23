import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, ClipboardList, LogOut, RotateCcw, Trash2 } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import { DELIVERY_LABELS, readPuerperio } from "@/core/puerperio/types";
import { postpartumDay, puerperiumPhase } from "@/core/puerperio/render";
import { historyFromPsgo } from "@/core/puerperio/history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/copy-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { PuerperioWorkspace } from "../_components/puerperio-workspace";
import { dischargePuerperio, removeEvolution, removePuerperio, reopenPuerperio } from "../actions";

export const metadata: Metadata = { title: "Puerpério" };

function when(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function PuerperioPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const summary = readPuerperio(patient.clinicalSummary);
  // Veio direto do PSGO (sem passar pelo Pré-Parto): importa os antecedentes.
  if (!Object.values(summary.history).some((v) => v.trim())) {
    summary.history = historyFromPsgo(patient.clinicalSummary);
  }
  const resolved = RESOLVED_STATUSES.includes(patient.status);
  const day = postpartumDay(summary.delivery.at);
  const today = new Date().toDateString();
  const evolvedToday = summary.evolutions.some((e) => new Date(e.at).toDateString() === today);

  return (
    <div className="space-y-5">
      <Link
        href="/puerperio"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={resolved ? "outline" : "success"}>
              {resolved ? "Alta" : `Puerpério ${puerperiumPhase(day).toLowerCase()} · ${day}º DPP`}
            </Badge>
            <Badge variant="secondary">{DELIVERY_LABELS[summary.delivery.type]}</Badge>
            {evolvedToday ? (
              <Badge variant="success">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Evoluída hoje
              </Badge>
            ) : (
              !resolved && <Badge variant="warning">Evolução de hoje pendente</Badge>
            )}
            <span className="text-sm text-muted-foreground">
              {[patient.bed && `Leito ${patient.bed}`, patient.medicalRecordNumber && `RG ${patient.medicalRecordNumber}`]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
      </div>

      <PuerperioWorkspace patient={patient} summary={summary} observations={patient.observations ?? []} />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" /> Evoluções anteriores
              <span className="text-xs font-normal text-muted-foreground">({summary.evolutions.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {summary.evolutions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma evolução salva ainda.</p>
            ) : (
              <ul className="space-y-2">
                {summary.evolutions.map((e) => (
                  <li key={e.id}>
                    <details className="group rounded-md border">
                      <summary className="flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm">
                        <span>
                          <strong>{when(e.at)}</strong>
                          {e.author && <span className="text-muted-foreground"> · {e.author}</span>}
                        </span>
                        <span className="flex items-center gap-1">
                          <CopyButton text={e.text} />
                          <form action={removeEvolution}>
                            <input type="hidden" name="patientId" value={patient.id} />
                            <input type="hidden" name="evolutionId" value={e.id} />
                            <ConfirmSubmit
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              message="Apagar esta evolução do histórico?"
                            >
                              <Trash2 className="h-4 w-4" />
                            </ConfirmSubmit>
                          </form>
                        </span>
                      </summary>
                      <pre className="prontuario-text border-t px-3 py-2 text-xs">{e.text}</pre>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {resolved ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  Alta em{" "}
                  <strong>{patient.dischargeTime ? when(patient.dischargeTime) : "—"}</strong>
                </span>
                <form action={reopenPuerperio}>
                  <input type="hidden" name="id" value={patient.id} />
                  <Button type="submit" size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4" /> Reabrir
                  </Button>
                </form>
              </div>
            ) : (
              <form action={dischargePuerperio} className="flex flex-wrap items-end gap-2">
                <input type="hidden" name="id" value={patient.id} />
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Data/hora (opcional)</span>
                  <Input type="datetime-local" name="dischargeTime" className="w-52" />
                </div>
                <ConfirmSubmit size="sm" message={`Registrar a alta de ${patient.name}?`}>
                  <LogOut className="h-4 w-4" /> Dar alta
                </ConfirmSubmit>
              </form>
            )}
            <p className="text-[11px] text-muted-foreground">
              Para a CD de alta, use &quot;Alta hospitalar&quot; na Conduta antes de salvar a evolução.
            </p>
            <div className="flex justify-end border-t pt-3">
              <form action={removePuerperio}>
                <input type="hidden" name="id" value={patient.id} />
                <ConfirmSubmit
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  message={`Remover ${patient.name} e todo o histórico? Esta ação não pode ser desfeita.`}
                >
                  <Trash2 className="h-4 w-4" /> Remover paciente
                </ConfirmSubmit>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
