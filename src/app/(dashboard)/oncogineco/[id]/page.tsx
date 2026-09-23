import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRightLeft, CheckCircle2, ClipboardList, LogOut, RotateCcw, Trash2 } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import { readOnco } from "@/core/oncogineco/types";
import { oncoDiagnosisLine, postOpDay } from "@/core/oncogineco/render";
import { historyFromPsgo } from "@/core/prontuario/psgo-history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/copy-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { OncoWorkspace } from "../_components/onco-workspace";
import { dischargeOnco, removeOnco, removeOncoEvolution, reopenOnco, transferOncoToPsgo } from "../actions";

export const metadata: Metadata = { title: "Onco-Ginecologia" };

function when(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function OncoPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const summary = readOnco(patient.clinicalSummary);
  // Veio do PSGO: importa os antecedentes da admissão do PS.
  if (![summary.history.cmb, summary.history.meu, summary.history.allergies, summary.history.hcv].some((v) => v.trim())) {
    const ps = historyFromPsgo(patient.clinicalSummary);
    summary.history = {
      ...summary.history,
      origin: summary.history.origin || ps.origin,
      cmb: ps.cmb,
      meu: ps.meu,
      pastMeds: ps.pastMeds,
      surgeries: ps.surgeries,
      allergies: ps.allergies,
      hcv: ps.hcv,
    };
  }
  const resolved = RESOLVED_STATUSES.includes(patient.status);
  const pod = postOpDay(summary.history);
  const today = new Date().toDateString();
  const evolvedToday = summary.evolutions.some((e) => new Date(e.at).toDateString() === today);
  const dx = oncoDiagnosisLine(summary.history);

  return (
    <div className="space-y-5">
      <Link
        href="/oncogineco"
        className="-my-1.5 inline-flex min-h-9 items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <Badge variant={resolved ? "outline" : "secondary"}>{resolved ? "Alta" : "Internada"}</Badge>
          {pod != null && !resolved && <Badge variant="warning">{pod}º DPO</Badge>}
          {evolvedToday ? (
            <Badge variant="success">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Evoluída hoje
            </Badge>
          ) : (
            !resolved && <Badge variant="warning">Evolução de hoje pendente</Badge>
          )}
          <span className="text-sm text-muted-foreground">
            {[patient.bed && `Leito ${patient.bed}`, patient.medicalRecordNumber && `RG ${patient.medicalRecordNumber}`, dx]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      </div>

      <OncoWorkspace patient={patient} summary={summary} observations={patient.observations ?? []} />

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
                  <li key={e.id} className="rounded-md border">
                    <div className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                      <span>
                        <strong>{when(e.at)}</strong>
                        {e.author && <span className="text-muted-foreground"> · {e.author}</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        <CopyButton text={e.text} />
                        <form action={removeOncoEvolution}>
                          <input type="hidden" name="patientId" value={patient.id} />
                          <input type="hidden" name="evolutionId" value={e.id} />
                          <ConfirmSubmit
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            message="Apagar esta evolução do histórico?"
                            aria-label="Apagar evolução"
                            title="Apagar evolução"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmSubmit>
                        </form>
                      </span>
                    </div>
                    <details className="border-t">
                      <summary className="cursor-pointer px-3 py-1.5 text-xs text-muted-foreground">Ver texto</summary>
                      <pre className="prontuario-text px-3 py-2 text-xs">{e.text}</pre>
                    </details>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alta e transferência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resolved ? (
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  Alta em <strong>{patient.dischargeTime ? when(patient.dischargeTime) : "—"}</strong>
                </span>
                <form action={reopenOnco}>
                  <input type="hidden" name="id" value={patient.id} />
                  <Button type="submit" size="sm" variant="outline">
                    <RotateCcw className="h-4 w-4" /> Reabrir
                  </Button>
                </form>
              </div>
            ) : (
              <>
                <form action={dischargeOnco} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={patient.id} />
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Data/hora (opcional)</span>
                    <Input aria-label="Data e hora da alta" type="datetime-local" name="dischargeTime" className="w-52" />
                  </div>
                  <ConfirmSubmit size="sm" message={`Registrar a alta de ${patient.name}?`}>
                    <LogOut className="h-4 w-4" /> Dar alta
                  </ConfirmSubmit>
                </form>
                <form action={transferOncoToPsgo} className="space-y-2 border-t pt-3">
                  <input type="hidden" name="id" value={patient.id} />
                  <Input name="reason" placeholder="Motivo da transferência ao PSGO (opcional)" aria-label="Motivo da transferência" />
                  <ConfirmSubmit size="sm" variant="outline" message="Transferir a paciente para o PSGO?">
                    <ArrowRightLeft className="h-4 w-4" /> Transferir para o PSGO
                  </ConfirmSubmit>
                </form>
              </>
            )}
            <div className="flex justify-end border-t pt-3">
              <form action={removeOnco}>
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
