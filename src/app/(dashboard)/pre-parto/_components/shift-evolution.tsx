"use client";

import { useMemo, useState } from "react";
import { FileText } from "lucide-react";
import type { Patient, Observation } from "@/core/patients/types";
import {
  defaultShiftInput,
  renderShiftEvolution,
  type ShiftNoteInput,
  type InductionInput,
} from "@/core/prontuario/preparto-evolution";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

export function ShiftEvolution({
  patient,
  observations,
}: {
  patient: Patient;
  observations: Observation[];
}) {
  const [input, setInput] = useState<ShiftNoteInput>(() => defaultShiftInput(patient));

  const set = (patch: Partial<ShiftNoteInput>) => setInput((i) => ({ ...i, ...patch }));
  const setInd = (patch: Partial<InductionInput>) =>
    setInput((i) => ({ ...i, induction: { ...i.induction, ...patch } }));

  const text = useMemo(
    () => renderShiftEvolution(patient, observations, input),
    [patient, observations, input],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Evolução de plantão
          </span>
          <CopyButton text={text} label="Copiar evolução" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Turno">
            <select
              className={selectClass}
              value={input.shift}
              onChange={(e) => set({ shift: e.target.value as ShiftNoteInput["shift"] })}
            >
              <option value="diurno">Diurno (7h)</option>
              <option value="noturno">Noturno (19h)</option>
            </select>
          </Field>
          <Field label="Data da nota">
            <Input type="date" value={input.noteDate} onChange={(e) => set({ noteDate: e.target.value })} />
          </Field>
          <Field label="Internação">
            <Input
              type="date"
              value={input.admissionDate}
              onChange={(e) => set({ admissionDate: e.target.value })}
            />
          </Field>
          <Field label="Parâmetros">
            <select
              className={selectClass}
              value={input.window}
              onChange={(e) => set({ window: e.target.value as ShiftNoteInput["window"] })}
            >
              <option value="12H">Em 12H</option>
              <option value="24H">Em 24H</option>
            </select>
          </Field>
        </div>

        <Field label="Motivo da admissão">
          <Input value={input.reason} onChange={(e) => set({ reason: e.target.value })} />
        </Field>

        {/* Indução */}
        <div className="rounded-md border p-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Indução">
              <select
                className={selectClass}
                value={input.induction.mode}
                onChange={(e) => setInd({ mode: e.target.value as InductionInput["mode"] })}
              >
                <option value="none">Sem indução</option>
                <option value="iniciada">Iniciada</option>
                <option value="mantida">Mantida</option>
              </select>
            </Field>
            {input.induction.mode !== "none" && (
              <>
                <Field label="Medicação">
                  <Input value={input.induction.drug} onChange={(e) => setInd({ drug: e.target.value })} />
                </Field>
                <Field label="Nº comprimidos">
                  <Input
                    value={input.induction.count ?? ""}
                    onChange={(e) => setInd({ count: e.target.value })}
                    inputMode="numeric"
                  />
                </Field>
                {input.induction.mode === "iniciada" && (
                  <>
                    <Field label="Início (data)">
                      <Input
                        type="date"
                        value={input.induction.startDate ?? ""}
                        onChange={(e) => setInd({ startDate: e.target.value })}
                      />
                    </Field>
                    <Field label="Início (hora)">
                      <Input
                        placeholder="7H"
                        value={input.induction.startTime ?? ""}
                        onChange={(e) => setInd({ startTime: e.target.value })}
                      />
                    </Field>
                  </>
                )}
              </>
            )}
          </div>
          {input.induction.mode !== "none" && (
            <label className="mt-2 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={input.induction.pressureCurve}
                onChange={(e) => setInd({ pressureCurve: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Curva pressórica
            </label>
          )}
        </div>

        <Field label="Quadro clínico">
          <Textarea rows={2} value={input.clinicalText} onChange={(e) => set({ clinicalText: e.target.value })} />
        </Field>
        <Field label="Revisão de sistemas">
          <Textarea
            rows={2}
            value={input.reviewOfSystems}
            onChange={(e) => set({ reviewOfSystems: e.target.value })}
          />
        </Field>
        <Field label="Equipe de plantão">
          <Input
            placeholder="DRA ... | R3 ... | R2 ... | R1 ..."
            value={input.team}
            onChange={(e) => set({ team: e.target.value })}
          />
        </Field>

        <div>
          <Label className="text-xs">Prévia</Label>
          <pre className="prontuario-text mt-1 max-h-[50vh] overflow-y-auto text-xs">{text}</pre>
        </div>
      </CardContent>
    </Card>
  );
}
