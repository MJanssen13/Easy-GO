"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dischargePsgoPatient, reopenPsgoPatient, deletePsgoAdmission } from "../actions";

const RETENTION_HOURS = 24;

function formatDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("pt-BR");
}

export function PsgoLifecycle({
  patientId,
  discharged,
  dischargeTime,
}: {
  patientId: string;
  discharged: boolean;
  dischargeTime?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function runAction(
    action: () => Promise<{ error?: string }>,
    onOk: () => void,
  ) {
    setError(null);
    start(async () => {
      const res = await action();
      if (res?.error) {
        setError(res.error);
        return;
      }
      onOk();
    });
  }

  const purgeAt = dischargeTime
    ? new Date(new Date(dischargeTime).getTime() + RETENTION_HOURS * 60 * 60 * 1000)
    : null;

  return (
    <div className="space-y-3">
      {discharged ? (
        <div className="space-y-2">
          <p className="rounded-md bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
            Alta registrada{dischargeTime ? ` em ${formatDateTime(dischargeTime)}` : ""}. O
            prontuário fica salvo por {RETENTION_HOURS}h e é excluído automaticamente
            {purgeAt ? ` por volta de ${formatDateTime(purgeAt.toISOString())}` : " depois disso"}.
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => runAction(() => reopenPsgoPatient(patientId), () => router.refresh())}
            disabled={pending}
          >
            <RotateCcw className="h-4 w-4" /> Reabrir (desfazer alta)
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            A alta mantém o prontuário salvo por {RETENTION_HOURS}h antes da exclusão automática.
          </p>
          <Button
            type="button"
            onClick={() => runAction(() => dischargePsgoPatient(patientId), () => router.refresh())}
            disabled={pending}
          >
            <LogOut className="h-4 w-4" /> Dar alta
          </Button>
        </div>
      )}

      <div className="border-t pt-3">
        {!confirmDelete ? (
          <Button
            type="button"
            variant="outline"
            className="text-destructive"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
          >
            <Trash2 className="h-4 w-4" /> Excluir admissão
          </Button>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-destructive">
              Excluir a admissão e o prontuário desta paciente? Esta ação não pode ser desfeita.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                onClick={() =>
                  runAction(() => deletePsgoAdmission(patientId), () => router.push("/psgo"))
                }
                disabled={pending}
              >
                <Trash2 className="h-4 w-4" /> {pending ? "Excluindo…" : "Confirmar exclusão"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{error}</p>}
    </div>
  );
}
