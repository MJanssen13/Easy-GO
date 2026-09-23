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
  TrendingUp,
  Stethoscope,
  AlertTriangle,
  SkipForward,
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
import { upcomingTasks, overdueTasks, taskUrgency } from "@/core/schedule/planner";
import { latestValues } from "@/core/patients/stats";
import { vitalAlerts } from "@/core/obstetric/alerts";
import { paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { ShiftEvolution } from "../_components/shift-evolution";
import { VitalCharts } from "../_components/vital-charts";
import {
  removePatient,
  removeCtg,
  resolvePatientAction,
  reopenPatientAction,
  updateTaskStatus,
  skipOverdueTasks,
} from "../actions";

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

function timeOnly(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/** "há 25 min", "há 2 h". */
function ago(iso: string, now: Date): string {
  const min = Math.round((now.getTime() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  return `há ${h} h${min % 60 ? ` ${min % 60} min` : ""}`;
}

/** "em 10 min", "atrasada 25 min". */
function until(iso: string, now: Date): string {
  const min = Math.round((new Date(iso).getTime() - now.getTime()) / 60000);
  if (min < -10) return `atrasada ${-min} min`;
  if (min <= 0) return "agora";
  if (min < 60) return `em ${min} min`;
  return `às ${timeOnly(iso)}`;
}

function formatBR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default async function PatientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Busca paciente e CTGs em paralelo (economiza uma ida ao banco).
  const [patient, ctgs] = await Promise.all([getPatient(id), listCtgs(id).catch(() => [])]);
  if (!patient) notFound();
  const ga = currentGaLabel(patient);
  const datingLabel =
    patient.datingMethod === "ultrasound"
      ? "USG"
      : patient.datingMethod === "lmp" || patient.lmp
        ? "DUM"
        : "—";
  const babyDisplay =
    [patient.babyName, patient.babyName2].filter(Boolean).join(" / ") || "—";
  const fields: { label: string; value: string }[] = [
    { label: "Leito", value: patient.bed ?? "—" },
    { label: "Prontuário", value: patient.medicalRecordNumber ?? "—" },
    { label: "Idade", value: patient.age != null ? `${patient.age} anos` : "—" },
    { label: "Paridade", value: patient.parity ?? "—" },
    { label: "Tipo sanguíneo", value: patient.bloodType ?? "—" },
    { label: "IG (hoje)", value: ga ?? "—" },
    { label: "Datação", value: datingLabel },
    { label: "DPP", value: formatBR(patient.edd) },
    { label: "Bebê", value: babyDisplay },
  ];

  const now = new Date();
  const resolved = RESOLVED_STATUSES.includes(patient.status);
  const schedule = patient.schedule ?? [];
  const overdue = overdueTasks(schedule, now);
  const next = upcomingTasks(schedule, 6);
  const latest = latestValues(patient.observations);
  const last = patient.lastObservation;
  const lastAlerts = last
    ? vitalAlerts({
        bcf: last.obstetric.bcf,
        paSystolic: last.vitals.paSystolic,
        paDiastolic: last.vitals.paDiastolic,
        fc: last.vitals.fc,
        tax: last.vitals.tax,
        spo2: last.vitals.spo2,
        mgReflex: last.magnesiumData?.reflex,
        respiratoryRate: last.magnesiumData?.respiratoryRate,
      })
    : [];

  return (
    <div className="space-y-5">
      <Link
        href="/pre-parto"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Badge variant={PATIENT_STATUS_BADGE[patient.status]}>
              {PATIENT_STATUS_LABELS[patient.status]}
            </Badge>
            {patient.fetalDeath && <Badge variant="destructive">Óbito fetal</Badge>}
            {patient.useMagnesiumSulfate && <Badge variant="outline">MgSO₄</Badge>}
            {patient.useMethyldopa && <Badge variant="outline">Metildopa</Badge>}
            <span className="text-sm text-muted-foreground">
              {[patient.bed && `Leito ${patient.bed}`, ga && `IG ${ga}`, patient.parity, patient.bloodType]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!resolved && (
            <Link href={`/pre-parto/${patient.id}/evolucao`}>
              <Button>
                <Stethoscope className="h-4 w-4" /> Registrar aferição
                {overdue.length > 0 && (
                  <span className="ml-1 rounded-full bg-white/25 px-1.5 text-xs">{overdue.length}</span>
                )}
              </Button>
            </Link>
          )}
          <Link href={`/pre-parto/${patient.id}/rotina`}>
            <Button variant="outline">
              <CalendarClock className="h-4 w-4" /> Rotina
            </Button>
          </Link>
          <Link href={`/pre-parto/${patient.id}/ctg`}>
            <Button variant="outline">
              <Activity className="h-4 w-4" /> CTG
            </Button>
          </Link>
        </div>
      </div>

      {/* Situação agora: próxima aferição, atrasos e últimos valores */}
      {!resolved && (
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <Link
            href={`/pre-parto/${patient.id}/evolucao`}
            className={`flex items-center gap-3 rounded-xl border p-4 transition-colors hover:bg-muted/40 ${
              overdue.length > 0 ? "border-rose-300 bg-rose-50" : "bg-card"
            }`}
          >
            <CalendarClock
              className={`h-8 w-8 shrink-0 ${overdue.length > 0 ? "text-rose-600" : "text-primary"}`}
            />
            {next[0] ? (
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {overdue.length > 0
                    ? `${overdue.length} aferição(ões) atrasada(s)`
                    : "Próxima aferição"}
                </p>
                <p className="text-lg font-bold">
                  {timeOnly(next[0].timestamp)}{" "}
                  <span
                    className={`text-sm font-medium ${overdue.length > 0 ? "text-rose-700" : "text-muted-foreground"}`}
                  >
                    {until(next[0].timestamp, now)}
                  </span>
                </p>
                <p className="truncate text-xs text-muted-foreground">{next[0].focus.join(" · ")}</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold">Sem aferições pendentes</p>
                <p className="text-xs text-muted-foreground">Crie uma rotina ou registre avulsa</p>
              </div>
            )}
          </Link>
          <div className="rounded-xl border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Últimos valores
              {latest[0] && (
                <span className="ml-1 normal-case tracking-normal">
                  · última aferição {ago(patient.observations![0]!.recordedAt, now)}
                </span>
              )}
            </p>
            {latest.length > 0 ? (
              <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                {latest.map((v) => (
                  <div key={v.label} className="flex items-baseline gap-1.5">
                    <dt className="text-xs text-muted-foreground">{v.label}</dt>
                    <dd className="text-base font-bold">{v.value}</dd>
                    <span className="text-[10px] text-muted-foreground">{timeOnly(v.at)}</span>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-1.5 text-sm text-muted-foreground">Nenhuma aferição registrada.</p>
            )}
            {lastAlerts.length > 0 && (
              <div className="mt-2 space-y-0.5">
                {lastAlerts.map((a) => (
                  <p
                    key={a.text}
                    className={`flex items-center gap-1.5 text-xs ${a.level === "danger" ? "font-semibold text-rose-700" : "text-amber-700"}`}
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {a.text}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
      <div className="space-y-5">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            <span>Identificação</span>
            <Link href={`/pre-parto/${patient.id}/editar`}>
              <Button size="sm" variant="outline">
                <Pencil className="h-4 w-4" /> Editar
              </Button>
            </Link>
          </CardTitle>
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

      <ShiftEvolution patient={patient} observations={patient.observations ?? []} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Desfecho e alta</CardTitle>
        </CardHeader>
        <CardContent>
          {resolved ? (
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
          <div className="mt-4 flex justify-end border-t pt-3">
            <form action={removePatient}>
              <input type="hidden" name="id" value={patient.id} />
              <ConfirmSubmit
                variant="ghost"
                size="sm"
                className="text-destructive"
                message={`Remover ${patient.name} e todo o histórico (evoluções, CTGs, rotina)? Esta ação não pode ser desfeita.`}
              >
                <Trash2 className="h-4 w-4" /> Remover paciente
              </ConfirmSubmit>
            </form>
          </div>
        </CardContent>
      </Card>


      </div>

      <div className="order-first space-y-5 xl:order-none">

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4" /> Próximas aferições
            </span>
            <span className="flex items-center gap-1">
            {overdue.length > 0 && (
              <form action={skipOverdueTasks}>
                <input type="hidden" name="patientId" value={patient.id} />
                <Button type="submit" size="sm" variant="ghost" title="Marcar as atrasadas como não aferidas">
                  <SkipForward className="h-4 w-4" /> Pular atrasadas ({overdue.length})
                </Button>
              </form>
            )}
            <Link href={`/pre-parto/${patient.id}/rotina`}>
              <Button size="sm" variant="outline">
                {next.length > 0 ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                {next.length > 0 ? "Editar rotina" : "Criar rotina"}
              </Button>
            </Link>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {next.length > 0 ? (
            <ul className="divide-y text-sm">
              {next.map((t) => {
                const urgency = taskUrgency(t.timestamp, now);
                return (
                  <li key={t.id} className="flex items-center gap-2 py-1.5">
                    <Link
                      href={`/pre-parto/${patient.id}/evolucao?taskId=${t.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2 rounded hover:bg-muted/50"
                      title="Registrar esta aferição"
                    >
                      <span
                        className={`w-12 font-mono font-bold ${urgency === "overdue" ? "text-rose-600" : urgency === "due" ? "text-amber-600" : ""}`}
                      >
                        {timeOnly(t.timestamp)}
                      </span>
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
                      {urgency !== "upcoming" && (
                        <span
                          className={`ml-auto text-[11px] font-medium ${urgency === "overdue" ? "text-rose-600" : "text-amber-600"}`}
                        >
                          {until(t.timestamp, now)}
                        </span>
                      )}
                    </Link>
                    <form action={updateTaskStatus}>
                      <input type="hidden" name="patientId" value={patient.id} />
                      <input type="hidden" name="taskId" value={t.id} />
                      <input type="hidden" name="status" value="cancelled" />
                      <button
                        type="submit"
                        title="Pular (não será aferida)"
                        className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <SkipForward className="h-3.5 w-3.5" />
                      </button>
                    </form>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
              Nenhuma aferição pendente.
            </p>
          )}
        </CardContent>
      </Card>

      {patient.observations && patient.observations.length >= 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-primary" /> Tendências
            </CardTitle>
          </CardHeader>
          <CardContent>
            <VitalCharts observations={patient.observations} />
          </CardContent>
        </Card>
      )}

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
                          <ConfirmSubmit
                            variant="ghost"
                            size="icon"
                            className="text-destructive"
                            message="Apagar esta CTG?"
                          >
                            <Trash2 className="h-4 w-4" />
                          </ConfirmSubmit>
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
      </div>
    </div>
  );
}
