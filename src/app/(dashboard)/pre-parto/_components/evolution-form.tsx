"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Check, Loader2, Plus, Save, Target, Calculator, Link2, Hand, Activity, Pill, FlaskConical, HeartPulse, NotebookPen, ClipboardList } from "lucide-react";
import { recordObservation, type ObservationState } from "../actions";
import type { Patient } from "@/core/patients/types";
import { MONITOR_PARAMS, paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import {
  bishopScore,
  bishopInterpretation,
  type CervixConsistency,
  type CervixPosition,
} from "@/core/obstetric/bishop";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { vitalAlerts, parseDiuresisMlH, type VitalAlert } from "@/core/obstetric/alerts";
import { readShiftTeam } from "@/lib/shift-team";

const selectClass =
  "flex h-9 w-full rounded-lg border border-input bg-white px-3 text-sm shadow-[0_1px_2px_0_rgb(16_24_40/0.04)] transition-colors hover:border-foreground/20 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15";

const initialState: ObservationState = {};

const EXAMINER_KEY = "easygo.lastExaminer";

/** Contrações em 10 min e duração (s) para montar a dinâmica "3x40''/10'". */
const DYN_COUNTS = [0, 1, 2, 3, 4, 5];
const DYN_DURATIONS = [20, 30, 40, 50, 60];

function num(fd: FormData, k: string): number | null {
  const v = fd.get(k);
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

const VITAL_PARAMS = ["PA", "FC", "TAX", "Sat", "DXT"];
const MG_PARAMS = ["Reflexo", "Diurese", "FR"];

/** Só o que o formulário realmente usa da paciente (permite reuso inline). */
type EvolutionPatient = Pick<Patient, "id" | "useMethyldopa" | "useMagnesiumSulfate">;

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local default value. */
function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Campos (name) de cada parâmetro — para avisar antes de fechar um preenchido. */
const PARAM_FIELDS: Record<string, string[]> = {
  PA: ["paSystolic", "paDiastolic", "paStandingSystolic", "paStandingDiastolic"],
  FC: ["fc"],
  TAX: ["tax"],
  Sat: ["spo2"],
  DXT: ["dxt"],
  BCF: ["bcf"],
  Dinâmica: ["dynamicsSummary"],
  Toque: ["dilation", "effacement", "station", "cervixObservation"],
  Medicação: ["misoprostolDose", "misoprostolCount", "oxytocinDose", "antibiotic", "medicationOther"],
  Reflexo: ["mgReflex"],
  Diurese: ["mgDiuresis"],
  FR: ["mgRespiratoryRate"],
};

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

export function EvolutionForm({
  patient,
  taskId,
  taskLabel,
  unlinkHref,
  focus = [],
  defaultRecordedAt,
  returnTo,
  onCancel,
}: {
  patient: EvolutionPatient;
  taskId?: string;
  /** Ex.: "13:00" — horário da tarefa do cronograma que esta aferição conclui. */
  taskLabel?: string;
  /** Link para registrar sem vincular à tarefa. */
  unlinkHref?: string;
  focus?: string[];
  defaultRecordedAt?: string;
  returnTo?: string;
  onCancel?: () => void;
}) {
  const [state, formAction, pending] = useActionState(recordObservation, initialState);

  // Seleção de parâmetros: o cronograma (focus) começa selecionado; clicar em
  // qualquer chip abre/fecha o campo correspondente.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set([...focus, ...(patient.useMagnesiumSulfate ? MG_PARAMS : [])]),
  );
  const show = (p: string) => selected.has(p);
  const formRef = useRef<HTMLFormElement>(null);
  // Fechar um parâmetro com valores digitados apagaria esses valores: confirma antes.
  const toggle = (p: string) => {
    if (selected.has(p) && formRef.current) {
      const typed = (PARAM_FIELDS[p] ?? []).some((name) => {
        const el = formRef.current!.elements.namedItem(name);
        return el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
          ? el.value.trim() !== ""
          : false;
      });
      if (typed && !window.confirm(`Remover ${p} desta aferição? Os valores digitados serão apagados.`)) return;
    }
    setSelected((s) => {
      const n = new Set(s);
      n.has(p) ? n.delete(p) : n.add(p);
      return n;
    });
  };

  // Toque controlado → índice de Bishop automático.
  const [dilation, setDilation] = useState("");
  const [effacement, setEffacement] = useState("");
  const [station, setStation] = useState("");
  const [cervixConsistency, setCervixConsistency] = useState<CervixConsistency | "">("");
  const [cervixPosition, setCervixPosition] = useState<CervixPosition | "">("");

  const bishop = useMemo(
    () =>
      bishopScore({
        dilation: dilation === "" ? null : Number(dilation),
        effacement: effacement === "" ? null : Number(effacement),
        station: station === "" ? null : Number(station),
        consistency: cervixConsistency || null,
        position: cervixPosition || null,
      }),
    [dilation, effacement, station, cervixConsistency, cervixPosition],
  );

  // Dinâmica uterina: texto livre + atalho (nº de contrações × duração).
  const [dynamics, setDynamics] = useState("");
  const [dynCount, setDynCount] = useState<number | null>(null);
  function pickDynamics(count: number | null, dur: number | null) {
    setDynCount(count);
    if (count === 0) setDynamics("AUSENTE");
    else if (count != null && dur != null) setDynamics(`${count}x${dur}''/10'`);
  }

  // Examinador(a): lembra o último neste aparelho e sugere a equipe de plantão.
  const [examiner, setExaminer] = useState("");
  const [teamNames, setTeamNames] = useState<string[]>([]);
  useEffect(() => {
    try {
      setExaminer(window.localStorage.getItem(EXAMINER_KEY) ?? "");
    } catch {
      // sem localStorage
    }
    const team = readShiftTeam();
    setTeamNames(
      [...new Set((Object.values(team) as string[]).flatMap((v) => v.split(",").map((n) => n.trim())).filter(Boolean))],
    );
  }, []);
  function rememberExaminer(v: string) {
    setExaminer(v);
    try {
      window.localStorage.setItem(EXAMINER_KEY, v);
    } catch {
      // sem localStorage
    }
  }

  // Alertas ao vivo (valores fora da faixa) — lidos do próprio formulário.
  const [alerts, setAlerts] = useState<VitalAlert[]>([]);
  function refreshAlerts(form: HTMLFormElement) {
    const fd = new FormData(form);
    setAlerts(
      vitalAlerts({
        bcf: num(fd, "bcf"),
        paSystolic: num(fd, "paSystolic"),
        paDiastolic: num(fd, "paDiastolic"),
        fc: num(fd, "fc"),
        tax: num(fd, "tax"),
        spo2: num(fd, "spo2"),
        mgReflex: (fd.get("mgReflex") as string) || null,
        respiratoryRate: num(fd, "mgRespiratoryRate"),
        diuresisMlH: parseDiuresisMlH(fd.get("mgDiuresis") as string),
      }),
    );
  }

  const showVitais = VITAL_PARAMS.some(show);
  const showBcfDin = show("BCF") || show("Dinâmica");
  const showToque = show("Toque");
  const showMed = show("Medicação");
  const showMg = MG_PARAMS.some(show) || patient.useMagnesiumSulfate;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="space-y-5"
      onInput={(e) => refreshAlerts(e.currentTarget)}
      onChange={(e) => refreshAlerts(e.currentTarget)}
    >
      <input type="hidden" name="patientId" value={patient.id} />
      {taskId && <input type="hidden" name="taskId" value={taskId} />}
      {returnTo && <input type="hidden" name="returnTo" value={returnTo} />}

      {taskId && taskLabel && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4" />
            Conclui a aferição das <strong>{taskLabel}</strong> do cronograma.
          </span>
          {unlinkHref && (
            <Link href={unlinkHref} className="-my-2 inline-flex min-h-9 items-center py-2 text-xs font-medium underline-offset-2 hover:underline">
              Registrar avulsa
            </Link>
          )}
        </div>
      )}

      {/* Seletor de aferições — todas disponíveis; cronograma em destaque */}
      <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
          <Target className="h-4 w-4" /> Aferir nesta tarefa
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MONITOR_PARAMS.map((p) => {
            const scheduled = focus.includes(p.id);
            const sel = selected.has(p.id);
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={sel}
                title={sel ? "Remover desta aferição" : "Adicionar a esta aferição"}
                className={`inline-flex min-h-9 items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-bold transition-colors ${
                  sel ? GROUP_ACCENT[p.group] : "border-dashed bg-background text-muted-foreground"
                } ${scheduled ? "ring-2 ring-primary/70 ring-offset-1" : ""}`}
              >
                {sel ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                {p.label}
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          <Check className="inline h-3 w-3" /> = será aferido · <Plus className="inline h-3 w-3" /> = adicionar ·
          contorno = previsto no cronograma agora.
        </p>
      </div>

      {/* Cabeçalho do registro */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" /> Registro
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Data e hora" htmlFor="recordedAt">
              <Input
                id="recordedAt"
                name="recordedAt"
                type="datetime-local"
                defaultValue={defaultRecordedAt ?? nowLocal()}
              />
            </Field>
            <Field label="Examinador(a)" htmlFor="examinerName">
              <Input
                id="examinerName"
                name="examinerName"
                autoComplete="off"
                list="examiner-options"
                value={examiner}
                onChange={(e) => rememberExaminer(e.target.value)}
              />
              <datalist id="examiner-options">
                {teamNames.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Sinais vitais */}
      {showVitais && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4" /> Sinais vitais
          </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {show("PA") && (
                <>
                  <Field
                    label={patient.useMethyldopa ? "PA sist. (sentada)" : "PA sistólica"}
                    htmlFor="paSystolic"
                  >
                    <Input id="paSystolic" name="paSystolic" type="number" inputMode="numeric" placeholder="mmHg" />
                  </Field>
                  <Field
                    label={patient.useMethyldopa ? "PA diast. (sentada)" : "PA diastólica"}
                    htmlFor="paDiastolic"
                  >
                    <Input id="paDiastolic" name="paDiastolic" type="number" inputMode="numeric" placeholder="mmHg" />
                  </Field>
                </>
              )}
              {show("PA") && patient.useMethyldopa && (
                <>
                  <Field label="PA sist. (em pé)" htmlFor="paStandingSystolic">
                    <Input
                      id="paStandingSystolic"
                      name="paStandingSystolic"
                      type="number"
                      inputMode="numeric"
                      placeholder="mmHg"
                    />
                  </Field>
                  <Field label="PA diast. (em pé)" htmlFor="paStandingDiastolic">
                    <Input
                      id="paStandingDiastolic"
                      name="paStandingDiastolic"
                      type="number"
                      inputMode="numeric"
                      placeholder="mmHg"
                    />
                  </Field>
                </>
              )}
              {show("FC") && (
                <Field label="FC" htmlFor="fc">
                  <Input id="fc" name="fc" type="number" inputMode="numeric" placeholder="bpm" />
                </Field>
              )}
              {show("TAX") && (
                <Field label="Temperatura" htmlFor="tax">
                  <Input id="tax" name="tax" type="number" step="0.1" inputMode="decimal" placeholder="°C" />
                </Field>
              )}
              {show("Sat") && (
                <Field label="SpO₂" htmlFor="spo2">
                  <Input id="spo2" name="spo2" type="number" inputMode="numeric" placeholder="%" />
                </Field>
              )}
              {show("DXT") && (
                <Field label="Dextro / glicemia" htmlFor="dxt">
                  <Input id="dxt" name="dxt" type="number" inputMode="numeric" placeholder="mg/dL" />
                </Field>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dinâmica uterina e BCF */}
      {showBcfDin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4" /> Dinâmica uterina e BCF
          </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {show("Dinâmica") && (
                <Field label="Dinâmica uterina" htmlFor="dynamicsSummary" className="sm:col-span-2">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="w-24 text-xs text-muted-foreground">Contrações/10&apos;</span>
                      {DYN_COUNTS.map((c) => (
                        <QuickChip key={c} active={dynCount === c} onClick={() => pickDynamics(c, null)}>
                          {c}
                        </QuickChip>
                      ))}
                    </div>
                    {dynCount != null && dynCount > 0 && (
                      <div className="flex flex-wrap items-center gap-1">
                        <span className="w-24 text-xs text-muted-foreground">Duração</span>
                        {DYN_DURATIONS.map((d) => (
                          <QuickChip
                            key={d}
                            active={dynamics === `${dynCount}x${d}''/10'`}
                            onClick={() => pickDynamics(dynCount, d)}
                          >
                            {d}&quot;
                          </QuickChip>
                        ))}
                      </div>
                    )}
                    <Input
                      id="dynamicsSummary"
                      name="dynamicsSummary"
                      placeholder="ex.: 3x40''/10'"
                      value={dynamics}
                      onChange={(e) => setDynamics(e.target.value)}
                    />
                  </div>
                </Field>
              )}
              {show("BCF") && (
                <Field label="BCF" htmlFor="bcf">
                  <Input id="bcf" name="bcf" type="number" inputMode="numeric" placeholder="bpm" />
                </Field>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Toque vaginal */}
      {showToque && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
            <Hand className="h-4 w-4" /> Toque vaginal
          </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Dilatação (cm)" htmlFor="dilation">
                <Input
                  id="dilation"
                  name="dilation"
                  type="number"
                  step="0.5"
                  min={0}
                  max={10}
                  inputMode="decimal"
                  value={dilation}
                  onChange={(e) => setDilation(e.target.value)}
                />
              </Field>
              <Field label="Esvaecimento (%)" htmlFor="effacement">
                <Input
                  id="effacement"
                  name="effacement"
                  type="number"
                  min={0}
                  max={100}
                  inputMode="numeric"
                  value={effacement}
                  onChange={(e) => setEffacement(e.target.value)}
                />
              </Field>
              <Field label="De Lee" htmlFor="station">
                <Input
                  id="station"
                  name="station"
                  type="number"
                  min={-4}
                  max={4}
                  inputMode="numeric"
                  placeholder="-4 a +4"
                  value={station}
                  onChange={(e) => setStation(e.target.value)}
                />
              </Field>
              <Field label="Apresentação" htmlFor="presentation">
                <select id="presentation" name="presentation" className={selectClass} defaultValue="">
                  <option value="">—</option>
                  <option value="cephalic">Cefálica</option>
                  <option value="breech">Pélvica</option>
                  <option value="transverse">Córmica</option>
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Posição do colo" htmlFor="cervixPosition">
                <select
                  id="cervixPosition"
                  name="cervixPosition"
                  className={selectClass}
                  value={cervixPosition}
                  onChange={(e) => setCervixPosition(e.target.value as CervixPosition | "")}
                >
                  <option value="">—</option>
                  <option value="posterior">Posterior</option>
                  <option value="intermediate">Intermediário</option>
                  <option value="central">Centralizado</option>
                </select>
              </Field>
              <Field label="Consistência do colo" htmlFor="cervixConsistency">
                <select
                  id="cervixConsistency"
                  name="cervixConsistency"
                  className={selectClass}
                  value={cervixConsistency}
                  onChange={(e) => setCervixConsistency(e.target.value as CervixConsistency | "")}
                >
                  <option value="">—</option>
                  <option value="nasal">Nasal (firme)</option>
                  <option value="nasolabial">Nasolabial (médio)</option>
                  <option value="labial">Labial (amolecida)</option>
                </select>
              </Field>
              <Field label="Bolsa" htmlFor="membranes">
                <select id="membranes" name="membranes" className={selectClass} defaultValue="">
                  <option value="">—</option>
                  <option value="intact">Íntegra</option>
                  <option value="ruptured_clear">Rota, líquido claro</option>
                  <option value="ruptured_meconium">Rota, líquido meconial</option>
                </select>
              </Field>
            </div>

            {/* Índice de Bishop automático */}
            <div className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
              <Calculator className="h-4 w-4 text-primary" />
              <span>
                Índice de Bishop: <strong>{bishop.total}</strong>
                {!bishop.complete && " (parcial)"} · {bishopInterpretation(bishop.total)}
              </span>
            </div>

            <Field label="Colo sem dilatação (OEI, OEEA...)" htmlFor="cervixStatus">
              <Input id="cervixStatus" name="cervixStatus" placeholder="separado por vírgula" autoComplete="off" />
            </Field>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="bloodOnGlove" className="h-4 w-4 rounded border-input" />
              Sangue na luva (SDL)
            </label>

            <Field label="Observações do colo / toque" htmlFor="cervixObservation">
              <Input id="cervixObservation" name="cervixObservation" autoComplete="off" />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* Protocolo MgSO₄ */}
      {showMg && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
            <FlaskConical className="h-4 w-4" /> Monitorização de MgSO₄
          </CardTitle>
          </CardHeader>
          <CardContent>
            <input type="hidden" name="magnesiumEnabled" value="on" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Reflexo patelar" htmlFor="mgReflex">
                <select id="mgReflex" name="mgReflex" className={selectClass} defaultValue="present">
                  <option value="present">Presente</option>
                  <option value="decreased">Diminuído</option>
                  <option value="increased">Aumentado</option>
                  <option value="absent">Ausente</option>
                </select>
              </Field>
              <Field label="Diurese" htmlFor="mgDiuresis">
                <Input id="mgDiuresis" name="mgDiuresis" placeholder="ex.: 50 ml/h" />
              </Field>
              <Field label="FR" htmlFor="mgRespiratoryRate">
                <Input id="mgRespiratoryRate" name="mgRespiratoryRate" type="number" inputMode="numeric" placeholder="irpm" />
              </Field>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Critérios de suspensão: reflexo patelar ausente, FR &lt; 12 irpm ou diurese &lt; 25
              ml/h. Apoio à decisão — validar com a equipe.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Medicação */}
      {showMed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
            <Pill className="h-4 w-4" /> Medicação
          </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Field label="Misoprostol (mcg)" htmlFor="misoprostolDose">
                <Input id="misoprostolDose" name="misoprostolDose" type="number" inputMode="numeric" />
              </Field>
              <Field label="Nº do comp." htmlFor="misoprostolCount">
                <Input id="misoprostolCount" name="misoprostolCount" type="number" inputMode="numeric" />
              </Field>
              <Field label="Ocitocina (ml/h)" htmlFor="oxytocinDose">
                <Input id="oxytocinDose" name="oxytocinDose" type="number" step="0.1" inputMode="decimal" />
              </Field>
              <Field label="Antibiótico" htmlFor="antibiotic">
                <Input id="antibiotic" name="antibiotic" autoComplete="off" />
              </Field>
            </div>
            <Field label="Outro" htmlFor="medicationOther">
              <Input
                id="medicationOther"
                name="medicationOther"
                autoComplete="off"
                placeholder="outra medicação / dose / via"
              />
            </Field>
          </CardContent>
        </Card>
      )}

      {/* Conduta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <NotebookPen className="h-4 w-4" /> Conduta / observações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea aria-label="Conduta e observações" name="notes" rows={4} placeholder="Conduta, plano, intercorrências..." />
        </CardContent>
      </Card>

      {alerts.length > 0 && (
        <div className="space-y-1 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3" role="alert">
          {alerts.map((a) => (
            <p
              key={a.text}
              className={`flex items-center gap-2 text-sm ${a.level === "danger" ? "font-semibold text-rose-800" : "text-amber-800"}`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {a.text}
            </p>
          ))}
          <p className="text-[11px] text-muted-foreground">Apoio à decisão — validar com a equipe.</p>
        </div>
      )}

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex min-h-10 items-center px-2 self-center text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
        ) : (
          <Link
            href={`/pre-parto/${patient.id}`}
            className="inline-flex min-h-10 items-center px-2 self-center text-sm text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </Link>
        )}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar aferição
        </Button>
      </div>
    </form>
  );
}

function QuickChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-7 min-w-8 rounded-md border px-2 text-xs font-semibold transition-colors ${
        active ? "chip-on" : "bg-background hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
