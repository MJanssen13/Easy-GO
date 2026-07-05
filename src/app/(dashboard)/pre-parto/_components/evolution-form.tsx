"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Target, Calculator } from "lucide-react";
import { recordObservation, type ObservationState } from "../actions";
import type { Patient } from "@/core/patients/types";
import { paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
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

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: ObservationState = {};

const VITAL_PARAMS = ["PA", "FC", "TAX", "Sat", "DXT"];
const MG_PARAMS = ["Reflexo", "Diurese", "FR"];

/** Local "YYYY-MM-DDTHH:mm" for a datetime-local default value. */
function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

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
  focus = [],
  defaultRecordedAt,
}: {
  patient: Patient;
  taskId?: string;
  focus?: string[];
  defaultRecordedAt?: string;
}) {
  const [state, formAction, pending] = useActionState(recordObservation, initialState);

  // Sem foco (evolução livre) → mostra tudo. Com foco → só o cronograma, com
  // opção de "coletar outros".
  const hasFocus = focus.length > 0;
  const [showAll, setShowAll] = useState(!hasFocus);
  const show = (p: string) => showAll || focus.includes(p);

  const [mgEnabled, setMgEnabled] = useState(
    patient.useMagnesiumSulfate || focus.some((f) => MG_PARAMS.includes(f)),
  );

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

  const showVitais = showAll || VITAL_PARAMS.some((p) => focus.includes(p));
  const showBcfDin = showAll || focus.includes("BCF") || focus.includes("Dinâmica");
  const showToque = showAll || focus.includes("Toque");
  const showMed = showAll || focus.includes("Medicação");
  const showMg = showAll || patient.useMagnesiumSulfate || focus.some((f) => MG_PARAMS.includes(f));

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="patientId" value={patient.id} />
      {taskId && <input type="hidden" name="taskId" value={taskId} />}

      {/* Aferições solicitadas pela rotina */}
      {hasFocus && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
              <Target className="h-4 w-4" /> Aferir nesta tarefa
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Coletar outros parâmetros
            </label>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {focus.map((f) => (
              <span
                key={f}
                className={`rounded border px-2 py-0.5 text-xs font-bold ${GROUP_ACCENT[paramGroup(f)]}`}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Cabeçalho do registro */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro</CardTitle>
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
              <Input id="examinerName" name="examinerName" autoComplete="off" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Sinais vitais */}
      {showVitais && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Sinais vitais</CardTitle>
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
            <CardTitle className="text-base">Dinâmica uterina e BCF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {show("Dinâmica") && (
                <Field label="Dinâmica uterina" htmlFor="dynamicsSummary">
                  <Input id="dynamicsSummary" name="dynamicsSummary" placeholder="ex.: 3x40''/10'" />
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
            <CardTitle className="text-base">Toque vaginal</CardTitle>
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
            <CardTitle className="text-base">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="magnesiumEnabled"
                  checked={mgEnabled}
                  onChange={(e) => setMgEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Monitorização de MgSO₄
              </label>
            </CardTitle>
          </CardHeader>
          {mgEnabled && (
            <CardContent>
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
          )}
        </Card>
      )}

      {/* Medicação */}
      {showMed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medicação</CardTitle>
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
          <CardTitle className="text-base">Conduta / observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={4} placeholder="Conduta, plano, intercorrências..." />
        </CardContent>
      </Card>

      {state.error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Link
          href={`/pre-parto/${patient.id}`}
          className="self-center text-sm text-muted-foreground hover:text-foreground"
        >
          Cancelar
        </Link>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar evolução
        </Button>
      </div>
    </form>
  );
}
