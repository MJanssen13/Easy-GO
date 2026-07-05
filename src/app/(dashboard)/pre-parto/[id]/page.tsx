import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Trash2,
  ClipboardList,
  Plus,
  CalendarClock,
  Activity,
  Pencil,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { listCtgs } from "@/core/ctg/repository";
import { renderCtgLine } from "@/core/ctg/render";
import {
  PATIENT_STATUS_LABELS,
  PATIENT_STATUS_BADGE,
  PATIENT_OUTCOME_LABELS,
  RESOLVED_STATUSES,
} from "@/core/patients/status";
import { currentGaLabel } from "@/core/patients/display";
import { renderObservationLine } from "@/core/prontuario/preparto";
import { upcomingTasks } from "@/core/schedule/planner";
import { paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { ShiftEvolution } from "../_components/shift-evolution";
import { removePatient, removeCtg, resolvePatientAction, reopenPatientAction } from "../actions";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function hhmm(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default async function PatientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const ctgs = await listCtgs(id).catch(() => []);
  const ga = currentGaLabel(patient);
  const fields: { label: string; value: string }[] = [
    { label: "Leito", value: patient.bed ?? "—" },
    { label: "Prontuário", value: patient.medicalRecordNumber ?? "—" },
    { label: "Idade", value: patient.age != null ? `${patient.age} anos` : "—" },
    { label: "Paridade", value: patient.parity ?? "—" },
    { label: "Tipo sanguíneo", value: patient.bloodType ?? "—" },
    { label: "IG (hoje)", value: ga ?? "—" },
    { label: "DUM", value: formatBR(patient.lmp) },
    { label: "DPP", value: formatBR(patient.edd) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/pre-parto"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={PATIENT_STATUS_BADGE[patient.status]}>
              {PATIENT_STATUS_LABELS[patient.status]}
            </Badge>
            {patient.bed && <span className="text-sm text-muted-foreground">Leito {patient.bed}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/pre-parto/${patient.id}/editar`}>
            <Button size="sm" variant="outline">
              <Pencil className="h-4 w-4" /> Editar
            </Button>
          </Link>
          <Link href={`/pre-parto/${patient.id}/rotina`}>
            <Button size="sm" variant="outline">
              <CalendarClock className="h-4 w-4" /> Planejar rotina
            </Button>
          </Link>
          <Link href={`/pre-parto/${patient.id}/ctg`}>
            <Button size="sm" variant="outline">
              <Activity className="h-4 w-4" /> CTG
            </Button>
          </Link>
          <Link href={`/pre-parto/${patient.id}/evolucao`}>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Nova evolução
            </Button>
          </Link>
          <form action={removePatient}>
            <input type="hidden" name="id" value={patient.id} />
            <Button type="submit" variant="outline" size="sm" className="text-destructive">
              <Trash2 className="h-4 w-4" /> Remover
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                <dd className="text-sm font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
          {patient.riskFactors.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {patient.riskFactors.map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desfecho</CardTitle>
        </CardHeader>
        <CardContent>
          {RESOLVED_STATUSES.includes(patient.status) ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm">
                <Badge variant="success">{PATIENT_OUTCOME_LABELS[patient.outcome]}</Badge>
                {patient.dischargeTime && (
                  <span className="ml-2 text-muted-foreground">
                    {new Date(patient.dischargeTime).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
              <form action={reopenPatientAction}>
                <input type="hidden" name="id" value={patient.id} />
                <Button type="submit" size="sm" variant="outline">
                  <RotateCcw className="h-4 w-4" /> Reabrir
                </Button>
              </form>
            </div>
          ) : (
            <form action={resolvePatientAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={patient.id} />
              <div className="space-y-1">
                <Label className="text-xs">Desfecho</Label>
                <select name="outcome" required defaultValue="" className={selectClass}>
                  <option value="" disabled>
                    Selecione…
                  </option>
                  <option value="vaginal_delivery">Parto normal</option>
                  <option value="c_section">Cesárea</option>
                  <option value="transfer">Transferência</option>
                  <option value="discharge">Alta</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data/hora (opcional)</Label>
                <Input type="datetime-local" name="dischargeTime" className="w-52" />
              </div>
              <Button type="submit" size="sm">
                <CheckCircle2 className="h-4 w-4" /> Resolver
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <ShiftEvolution patient={patient} observations={patient.observations ?? []} />

      {(() => {
        const next = upcomingTasks(patient.schedule ?? [], 6);
        if (next.length === 0) return null;
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarClock className="h-4 w-4" /> Próximas aferições
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {next.map((t) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <Link
                      href={`/pre-parto/${patient.id}/evolucao?taskId=${t.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <span className="font-mono font-bold">{hhmm(t.timestamp)}</span>
                      <span className="flex flex-wrap gap-1">
                        {t.focus.map((f) => (
                          <span
                            key={f}
                            className={`rounded border px-1.5 py-0.5 text-[10px] font-bold ${GROUP_ACCENT[paramGroup(f)]}`}
                          >
                            {f}
                          </span>
                        ))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        );
      })()}

      {ctgs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" /> Cardiotocografias
              <span className="text-xs font-normal text-muted-foreground">({ctgs.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {ctgs.map((c) => {
                const line = renderCtgLine(c);
                return (
                  <li key={c.id} className="rounded-md border">
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {new Date(c.recordedAt).toLocaleString("pt-BR")}
                        </span>
                        <Badge variant={c.score >= 4 ? "success" : c.score >= 2 ? "warning" : "destructive"}>
                          {c.score}/5 · {c.conclusion}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <CopyButton text={line} />
                        <form action={removeCtg}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="patientId" value={patient.id} />
                          <Button type="submit" variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </form>
                      </div>
                    </div>
                    <pre className="prontuario-text px-3 py-2 text-sm">{line}</pre>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" /> Evoluções
            <span className="text-xs font-normal text-muted-foreground">
              ({patient.observations?.length ?? 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patient.observations && patient.observations.length > 0 ? (
            <ul className="space-y-2">
              {patient.observations.map((o) => {
                const line = renderObservationLine(o);
                return (
                  <li key={o.id} className="flex items-start justify-between gap-2 rounded-md border px-3 py-2">
                    <div className="min-w-0">
                      <pre className="prontuario-text text-xs">{line}</pre>
                      {o.examinerName && (
                        <span className="text-[11px] text-muted-foreground">{o.examinerName}</span>
                      )}
                    </div>
                    <CopyButton text={line} />
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma evolução registrada. Use{" "}
              <Link
                href={`/pre-parto/${patient.id}/evolucao`}
                className="font-medium text-primary hover:underline"
              >
                Nova evolução
              </Link>{" "}
              para registrar sinais vitais, dinâmica, toque e protocolos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
