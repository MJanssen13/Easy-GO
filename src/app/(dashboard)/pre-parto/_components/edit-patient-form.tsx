"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2, Save, ShieldPlus } from "lucide-react";
import { editPatient, type EditPatientState } from "../actions";
import type { Patient } from "@/core/patients/types";
import { resolveDating, formatDateBR } from "@/core/obstetric/gestational-age";
import { EDITABLE_STATUS_OPTIONS, PATIENT_STATUS_LABELS } from "@/core/patients/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: EditPatientState = {};

/** Slice a stored datetime/text to the value a datetime-local input accepts. */
function dtLocal(v?: string | null): string {
  return v ? v.slice(0, 16) : "";
}

export function EditPatientForm({ patient }: { patient: Patient }) {
  const [state, formAction, pending] = useActionState(editPatient, initialState);
  const [lmp, setLmp] = useState(patient.lmp ?? "");
  const [methyldopa, setMethyldopa] = useState(patient.useMethyldopa);
  const [mgso4, setMgso4] = useState(patient.useMagnesiumSulfate);

  const dating = useMemo(() => {
    if (!lmp) return null;
    const d = new Date(`${lmp}T00:00:00`);
    if (Number.isNaN(d.getTime())) return null;
    try {
      return resolveDating({ lmp: d });
    } catch {
      return null;
    }
  }, [lmp]);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="id" value={patient.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados da paciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="name">Nome *</Label>
              <Input id="name" name="name" required defaultValue={patient.name} autoComplete="off" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bed">Leito</Label>
              <Input id="bed" name="bed" defaultValue={patient.bed ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="medicalRecordNumber">Prontuário</Label>
              <Input
                id="medicalRecordNumber"
                name="medicalRecordNumber"
                defaultValue={patient.medicalRecordNumber ?? ""}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="age">Idade</Label>
              <Input id="age" name="age" type="number" min={0} max={120} defaultValue={patient.age ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="parity">Paridade</Label>
              <Input id="parity" name="parity" defaultValue={patient.parity ?? ""} placeholder="G_P_A_" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bloodType">Tipo sanguíneo</Label>
              <select id="bloodType" name="bloodType" className={selectClass} defaultValue={patient.bloodType ?? ""}>
                <option value="">—</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="status">Situação</Label>
              <select id="status" name="status" className={selectClass} defaultValue={patient.status}>
                {EDITABLE_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {PATIENT_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="babyName">Nome do bebê</Label>
              <Input id="babyName" name="babyName" defaultValue={patient.babyName ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lmp">DUM</Label>
              <Input id="lmp" name="lmp" type="date" value={lmp} onChange={(e) => setLmp(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="gaWeeks">IG (sem)</Label>
                <Input
                  id="gaWeeks"
                  name="gaWeeks"
                  type="number"
                  min={0}
                  max={45}
                  defaultValue={patient.gaWeeks ?? ""}
                  placeholder="se sem DUM"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="gaDays">IG (dias)</Label>
                <Input id="gaDays" name="gaDays" type="number" min={0} max={6} defaultValue={patient.gaDays ?? ""} />
              </div>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="riskFactors">Fatores de risco (separados por vírgula)</Label>
              <Input
                id="riskFactors"
                name="riskFactors"
                defaultValue={patient.riskFactors.join(", ")}
                placeholder="DHEG, DMG, ..."
              />
            </div>
          </div>

          {dating && (
            <div className="mt-4 rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
              IG estimada hoje: <strong>{dating.ga.label}</strong> · DPP <strong>{formatDateBR(dating.edd)}</strong>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Protocolos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldPlus className="h-4 w-4 text-primary" /> Protocolos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Metildopa */}
          <div className="rounded-md border p-3">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                name="useMethyldopa"
                checked={methyldopa}
                onChange={(e) => setMethyldopa(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Metildopa (curva pressórica)
            </label>
            {methyldopa && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="methyldopaStartTime">Início</Label>
                  <Input
                    id="methyldopaStartTime"
                    name="methyldopaStartTime"
                    type="datetime-local"
                    defaultValue={dtLocal(patient.methyldopaStartTime)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="methyldopaEndTime">Término</Label>
                  <Input
                    id="methyldopaEndTime"
                    name="methyldopaEndTime"
                    type="datetime-local"
                    defaultValue={dtLocal(patient.methyldopaEndTime)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* MgSO4 */}
          <div className="rounded-md border p-3">
            <label className="flex items-center gap-2 font-medium">
              <input
                type="checkbox"
                name="useMagnesiumSulfate"
                checked={mgso4}
                onChange={(e) => setMgso4(e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Sulfato de magnésio (MgSO₄)
            </label>
            {mgso4 && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="magnesiumSulfateStartTime">Início</Label>
                  <Input
                    id="magnesiumSulfateStartTime"
                    name="magnesiumSulfateStartTime"
                    type="datetime-local"
                    defaultValue={dtLocal(patient.magnesiumSulfateStartTime)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="magnesiumSulfateEndTime">Término</Label>
                  <Input
                    id="magnesiumSulfateEndTime"
                    name="magnesiumSulfateEndTime"
                    type="datetime-local"
                    defaultValue={dtLocal(patient.magnesiumSulfateEndTime)}
                  />
                </div>
              </div>
            )}
            <p className="mt-2 text-xs text-muted-foreground">
              Ao ativar o MgSO₄, a seção de monitorização aparece automaticamente na evolução.
            </p>
          </div>
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
          Salvar
        </Button>
      </div>
    </form>
  );
}
