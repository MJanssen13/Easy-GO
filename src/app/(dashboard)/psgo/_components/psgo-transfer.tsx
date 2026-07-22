"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft } from "lucide-react";
import type { PatientModule, PatientStatus } from "@/core/patients/types";
import { ADMISSION_STATUS_OPTIONS, PATIENT_STATUS_LABELS } from "@/core/patients/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transferPsgoPatient } from "../actions";

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
  const [status, setStatus] = useState<PatientStatus>("active_labor");
  const [error, setError] = useState<string | null>(null);

  function submit() {
    if (!target) return;
    setError(null);
    const dest = TARGETS.find((t) => t.module === target);
    const initialStatus = target === "pre_parto" ? status : undefined;
    start(async () => {
      const res = await transferPsgoPatient(patientId, target, reason || undefined, initialStatus);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(dest?.path ?? "/psgo");
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
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
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
        <div className="space-y-1">
          <Label className="text-xs">Situação no Pré-Parto</Label>
          <div className="flex flex-wrap gap-1.5">
            {ADMISSION_STATUS_OPTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                  status === s
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                {PATIENT_STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Motivo (opcional)</Label>
        <Input
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
