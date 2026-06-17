"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, UserPlus } from "lucide-react";
import { admitPatient, type AdmissionState } from "../actions";
import { resolveDating, formatDateBR } from "@/core/obstetric/gestational-age";
import { ADMISSION_STATUS_OPTIONS } from "@/core/patients/status";
import { PATIENT_STATUS_LABELS } from "@/core/patients/status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: AdmissionState = {};

export default function AdmissionPage() {
  const [state, formAction, pending] = useActionState(admitPatient, initialState);
  const [lmp, setLmp] = useState("");

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
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/pre-parto"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Admissão no Pré-Parto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="name">Nome *</Label>
                <Input id="name" name="name" required autoComplete="off" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bed">Leito</Label>
                <Input id="bed" name="bed" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="medicalRecordNumber">Prontuário</Label>
                <Input id="medicalRecordNumber" name="medicalRecordNumber" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="age">Idade</Label>
                <Input id="age" name="age" type="number" min={0} max={120} inputMode="numeric" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="parity">Paridade (ex.: G2P1A0)</Label>
                <Input id="parity" name="parity" placeholder="G_P_A_" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bloodType">Tipo sanguíneo</Label>
                <select id="bloodType" name="bloodType" className={selectClass} defaultValue="">
                  <option value="">—</option>
                  {BLOOD_TYPES.map((bt) => (
                    <option key={bt} value={bt}>
                      {bt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Situação inicial</Label>
                <select id="status" name="status" className={selectClass} defaultValue="admission">
                  {ADMISSION_STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {PATIENT_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lmp">DUM</Label>
                <Input
                  id="lmp"
                  name="lmp"
                  type="date"
                  value={lmp}
                  onChange={(e) => setLmp(e.target.value)}
                />
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
                    placeholder="se sem DUM"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="gaDays">IG (dias)</Label>
                  <Input id="gaDays" name="gaDays" type="number" min={0} max={6} />
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="riskFactors">Fatores de risco (separados por vírgula)</Label>
                <Input id="riskFactors" name="riskFactors" placeholder="DHEG, DMG, ..." />
              </div>
            </div>

            {dating && (
              <div className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
                IG estimada hoje: <strong>{dating.ga.label}</strong> · DPP{" "}
                <strong>{formatDateBR(dating.edd)}</strong>
              </div>
            )}

            {state.error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Link href="/pre-parto" className="text-sm text-muted-foreground hover:text-foreground self-center">
                Cancelar
              </Link>
              <Button type="submit" disabled={pending}>
                {pending && <Loader2 className="h-4 w-4 animate-spin" />}
                Admitir paciente
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
