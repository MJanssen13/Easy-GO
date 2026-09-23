"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import type { PatientModule } from "@/core/patients/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transferPsgoPatient, type PrePartoArrival } from "../actions";

const ARRIVAL_STATUS: { v: NonNullable<PrePartoArrival["status"]>; label: string }[] = [
  { v: "induction", label: "Indução" },
  { v: "conduction", label: "Condução" },
  { v: "active_labor", label: "Fase ativa" },
  { v: "scheduled_c_section", label: "Cesárea eletiva" },
];

const TARGETS: { module: PatientModule; label: string; path: string }[] = [
  { module: "pre_parto", label: "Pré-Parto", path: "/pre-parto" },
  { module: "puerperio", label: "Puerpério", path: "/puerperio" },
  { module: "oncogineco", label: "Onco-Ginecologia", path: "/oncogineco" },
];

export function PsgoTransfer({ patientId }: { patientId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<PatientModule | "">("");
  const [reason, setReason] = useState("");
  const [bed, setBed] = useState("");
  const [status, setStatus] = useState<NonNullable<PrePartoArrival["status"]>>("induction");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!target) return;
    setError(null);
    const dest = TARGETS.find((t) => t.module === target);
    start(async () => {
      const res = await transferPsgoPatient(
        patientId,
        target,
        reason || undefined,
        target === "pre_parto" ? { bed, status } : undefined,
      );
      if (res.error) {
        setError(res.error);
        return;
      }
      // No Pré-Parto, abre direto a paciente (rotina já criada).
      router.push(target === "pre_parto" ? `/pre-parto/${patientId}` : (dest?.path ?? "/psgo"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Módulo de destino</Label>
        <div className="flex flex-wrap gap-1.5">
          {TARGETS.map((t) => (
            <button
              key={t.module}
              type="button"
              onClick={() => setTarget(t.module)}
              aria-pressed={target === t.module}
              className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                target === t.module
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {target === "pre_parto" && (
        <div className="space-y-3 rounded-xl border bg-muted/30 p-3">
          <div className="space-y-1">
            <Label htmlFor="psgo-transfer-bed" className="text-xs">
              Leito no Pré-Parto
            </Label>
            <Input id="psgo-transfer-bed" value={bed} onChange={(e) => setBed(e.target.value)} placeholder="ex.: 3" className="w-28" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Situação ao chegar (define a rotina de aferições)</Label>
            <div className="flex flex-wrap gap-1.5">
              {ARRIVAL_STATUS.map((o) => (
                <button
                  key={o.v}
                  type="button"
                  onClick={() => setStatus(o.v)}
                  aria-pressed={status === o.v}
                  className={`min-h-9 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    status === o.v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="psgo-transfer-reason" className="text-xs">Motivo (opcional)</Label>
        <Input
          id="psgo-transfer-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="ex.: em trabalho de parto"
        />
      </div>

      {error && <p className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{error}</p>}

      <Button type="button" onClick={submit} disabled={!target || pending}>
        <ArrowRightLeft className="h-4 w-4" />
        {pending ? "Transferindo…" : "Transferir"}
      </Button>
    </div>
  );
}
