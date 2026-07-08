"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Loader2, Save, Target } from "lucide-react";
import { recordObservation, type ObservationState } from "../actions";
import type { Patient } from "@/core/patients/types";
import { paramGroup, GROUP_ACCENT } from "@/core/schedule/params";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: ObservationState = {};

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
  const [mgEnabled, setMgEnabled] = useState(
    patient.useMagnesiumSulfate ||
      focus.some((f) => ["Reflexo", "Diurese", "FR"].includes(f)),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="patientId" value={patient.id} />
      {taskId && <input type="hidden" name="taskId" value={taskId} />}

      {/* Aferições solicitadas pela rotina */}
      {focus.length > 0 && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-primary">
            <Target className="h-4 w-4" /> Aferir nesta tarefa
          </p>
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
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sinais vitais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Field label="PA sistólica" htmlFor="paSystolic">
              <Input id="paSystolic" name="paSystolic" type="number" inputMode="numeric" placeholder="mmHg" />
            </Field>
            <Field label="PA diastólica" htmlFor="paDiastolic">
              <Input id="paDiastolic" name="paDiastolic" type="number" inputMode="numeric" placeholder="mmHg" />
            </Field>
            <Field label="FC" htmlFor="fc">
              <Input id="fc" name="fc" type="number" inputMode="numeric" placeholder="bpm" />
            </Field>
            <Field label="Temperatura" htmlFor="tax">
              <Input id="tax" name="tax" type="number" step="0.1" inputMode="decimal" placeholder="°C" />
            </Field>
            <Field label="SpO₂" htmlFor="spo2">
              <Input id="spo2" name="spo2" type="number" inputMode="numeric" placeholder="%" />
            </Field>
            <Field label="Dextro" htmlFor="dxt">
              <Input id="dxt" name="dxt" type="number" inputMode="numeric" placeholder="mg/dL" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Dinâmica uterina e BCF */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dinâmica uterina e BCF</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Dinâmica uterina" htmlFor="dynamicsSummary">
              <Input id="dynamicsSummary" name="dynamicsSummary" placeholder="ex.: 3x40''/10'" />
            </Field>
            <Field label="BCF" htmlFor="bcf">
              <Input id="bcf" name="bcf" type="number" inputMode="numeric" placeholder="bpm" />
            </Field>
          </div>
        </CardContent>
      </Card>

      {/* Toque vaginal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Toque vaginal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Field label="Dilatação (cm)" htmlFor="dilation">
              <Input id="dilation" name="dilation" type="number" step="0.5" min={0} max={10} inputMode="decimal" />
            </Field>
            <Field label="Esvaecimento (%)" htmlFor="effacement">
              <Input id="effacement" name="effacement" type="number" min={0} max={100} inputMode="numeric" />
            </Field>
            <Field label="De Lee" htmlFor="station">
              <Input id="station" name="station" type="number" min={-4} max={4} inputMode="numeric" placeholder="-4 a +4" />
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
              <select id="cervixPosition" name="cervixPosition" className={selectClass} defaultValue="">
                <option value="">—</option>
                <option value="posterior">Posterior</option>
                <option value="intermediate">Intermediário</option>
                <option value="central">Centralizado</option>
              </select>
            </Field>
            <Field label="Consistência do colo" htmlFor="cervixConsistency">
              <select id="cervixConsistency" name="cervixConsistency" className={selectClass} defaultValue="">
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

      {/* Protocolo MgSO₄ */}
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

      {/* Medicação */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Medicação</CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

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
