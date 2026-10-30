import Link from "next/link";
import { PageHero } from "@/components/page-header";
import { notFound } from "next/navigation";
import { IdCard, ChevronDown, ArrowLeft, Trash2, Table2, Printer, ClipboardList, Plus, CalendarClock, Activity, Pencil, CheckCircle2, RotateCcw, TrendingUp, Stethoscope, AlertTriangle, SkipForward, FileChartLine, Baby } from "lucide-react";
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
import { renderTimeline } from "@/core/prontuario/timeline";
import { deleteObservationAction } from "../sheet-actions";
import { upcomingTasks, overdueTasks, taskUrgency } from "@/core/schedule/planner";
import { latestValues } from "@/core/patients/stats";
import { vitalAlerts } from "@/core/obstetric/alerts";
import { readPartogram } from "@/core/partogram/types";
import { paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CopyButton } from "@/components/copy-button";
import { ActionForm } from "@/components/action-form";
import { ConfirmSubmit, SubmitButton } from "@/components/confirm-submit";
import { PhotoThumb } from "@/components/photo-field";
import { ParametersPaste } from "../_components/parameters-paste";
import { VitalCharts } from "../_components/vital-charts";
import { TransferToPuerperio } from "../_components/transfer-puerperio";
import {
  removePatient,
  removeCtg,
  resolvePatientAction,
  reopenPatientAction,
  updateTaskStatus,
  skipOverdueTasks,
} from "../actions";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-[0_1px_2px_0_rgb(16_24_40/0.04)] transition-colors hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";

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
  const partogramOpen = !!readPartogram(patient.partogramData);
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
      <PageHero
        back={{ href: "/pre-parto", label: "Leitos" }}
        eyebrow="Pré-Parto"
        bed={patient.bed ?? null}
        title={patient.name}
        badges={
          <>
            <Badge variant={PATIENT_STATUS_BADGE[patient.status]}>
              {PATIENT_STATUS_LABELS[patient.status]}
            </Badge>
            {patient.fetalDeath && <Badge variant="destructive">Óbito fetal</Badge>}
            {patient.useMagnesiumSulfate && <Badge variant="outline">MgSO₄</Badge>}
            {patient.useMethyldopa && <Badge variant="outline">Metildopa</Badge>}
          </>
        }
        meta={[ga && `IG ${ga}`, patient.parity, patient.bloodType].filter(Boolean).join(" · ")}
        actions={
          <>
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
          <Link href={`/pre-parto/${patient.id}/partograma`}>
            <Button variant={partogramOpen ? "secondary" : "outline"}>
              <FileChartLine className="h-4 w-4" /> {partogramOpen ? "Partograma" : "Abrir partograma"}
            </Button>
          </Link>
          <Link href={`/pre-parto/${patient.id}/rotina`}>
            <Button variant="outline">
              <CalendarClock className="h-4 w-4" /> Rotina
            </Button>
          </Link>
          <Link href={`/pre-parto/${patient.id}/planilha`}>
            <Button variant="outline" title="Lançar e editar aferições em lote">
              <Table2 className="h-4 w-4" /> Planilha
            </Button>
          </Link>
          <Link href={`/pre-parto/${patient.id}/folha`}>
            <Button variant="outline" title="Imprimir folha de parâmetros">
              <Printer className="h-4 w-4" /> Folha
            </Button>
          </Link>
          <Link href={`/pre-parto/${patient.id}/ctg`}>
            <Button variant="outline">
              <Activity className="h-4 w-4" /> CTG
            </Button>
          </Link>
          </>
        }
      />

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
                    <span className="text-[11px] text-muted-foreground">{timeOnly(v.at)}</span>
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
          <CardTitle className="flex flex-wrap items-center justify-between gap-y-2 text-base">
            <span className="flex items-center gap-2">
              <IdCard className="h-4 w-4" /> Identificação
            </span>
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" /> Evoluções
            <span className="text-xs font-normal text-muted-foreground">
              ({patient.observations?.length ?? 0})
            </span>
            <span className="ml-auto flex flex-wrap items-center gap-1.5">
              <Link
                href={`/pre-parto/${patient.id}/planilha`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium hover:bg-muted"
              >
                <Table2 className="h-3.5 w-3.5" /> Editar em lote
              </Link>
              {(patient.observations?.length ?? 0) > 0 && (
                <CopyButton text={renderTimeline(patient, patient.observations ?? [], ctgs)} label="Copiar linha do tempo" />
              )}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patient.observations && patient.observations.length > 0 ? (
            (() => {
              const item = (o: (typeof patient.observations)[number]) => {
                const line = renderObservationLine(o);
                return (
                  <li key={o.id} className="flex items-start justify-between gap-2 rounded-xl border bg-muted/20 px-3 py-2">
                    <div className="min-w-0">
                      <pre className="prontuario-text text-xs">{line}</pre>
                      {o.examinerName && (
                        <span className="text-[11px] text-muted-foreground">{o.examinerName}</span>
                      )}
                    </div>
                    <span className="flex shrink-0 items-center gap-0.5">
                      <CopyButton text={line} />
                      <Link
                        href={`/pre-parto/${patient.id}/planilha?editar=${o.id}`}
                        title="Editar esta aferição"
                        aria-label="Editar esta aferição"
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </Link>
                      <form action={deleteObservationAction}>
                        <input type="hidden" name="patientId" value={patient.id} />
                        <input type="hidden" name="obsId" value={o.id} />
                        <ConfirmSubmit
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          message="Excluir esta aferição? Não é possível desfazer."
                          aria-label="Excluir esta aferição"
                          title="Excluir esta aferição"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmSubmit>
                      </form>
                    </span>
                  </li>
                );
              };
              const obs = patient.observations!;
              return (
                <div className="space-y-4">
                  <ParametersPaste observations={obs} />
                  <details className="group rounded-lg border">
                    <summary className="flex min-h-10 cursor-pointer list-none items-center justify-between gap-2 px-3 text-sm font-medium hover:bg-muted/50 [&::-webkit-details-marker]:hidden">
                      <span>
                        Aferições registradas <span className="text-muted-foreground">({obs.length})</span>
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <ul className="space-y-2 border-t p-3">{obs.map(item)}</ul>
                  </details>
                </div>
              );
            })()
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Baby className="h-4 w-4" /> Parto, desfecho e alta
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!resolved && (
            <div className="mb-4">
              <TransferToPuerperio patientId={patient.id} bed={patient.bed} />
            </div>
          )}
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
              <ActionForm action={reopenPatientAction}>
                <input type="hidden" name="id" value={patient.id} />
                <SubmitButton size="sm" variant="outline">
                  <RotateCcw className="h-4 w-4" /> Reabrir
                </SubmitButton>
              </ActionForm>
            </div>
          ) : (
            <ActionForm action={resolvePatientAction} className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="id" value={patient.id} />
              <div className="space-y-1">
                <Label className="field-label">Desfecho</Label>
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
                <Label className="field-label">Data/hora (opcional)</Label>
                <Input type="datetime-local" name="dischargeTime" className="w-52" />
              </div>
              <SubmitButton size="sm">
                <CheckCircle2 className="h-4 w-4" /> Resolver
              </SubmitButton>
            </ActionForm>
          )}
          <div className="mt-4 flex justify-end border-t pt-3">
            <ActionForm action={removePatient}>
              <input type="hidden" name="id" value={patient.id} />
              <ConfirmSubmit
                variant="ghost"
                size="sm"
                className="text-destructive"
                message={`Remover ${patient.name} e todo o histórico (evoluções, CTGs, rotina)? Esta ação não pode ser desfeita.`}
              >
                <Trash2 className="h-4 w-4" /> Remover paciente
              </ConfirmSubmit>
            </ActionForm>
          </div>
        </CardContent>
      </Card>


      </div>

      <div className="order-first space-y-5 xl:order-none">

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center justify-between gap-y-2 gap-2 text-base">
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
                            className={`rounded border px-1.5 py-0.5 text-[11px] font-bold ${GROUP_ACCENT[paramGroup(f)]}`}
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
                        className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
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
                        <Link
                          href={`/pre-parto/${patient.id}/ctg/${c.id}`}
                          title="Editar CTG"
                          aria-label="Editar CTG"
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </Link>
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
                    <div className="flex flex-wrap items-start gap-3 px-3 py-2">
                      <pre className="prontuario-text min-w-0 flex-1 text-sm">{line}</pre>
                      {c.imagePath && <PhotoThumb src={c.imagePath} alt="Foto do traçado da CTG" />}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}


      </div>
      </div>
    </div>
  );
}
