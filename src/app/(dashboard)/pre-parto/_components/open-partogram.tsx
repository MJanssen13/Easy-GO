"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileChartLine, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PartogramModel } from "@/core/partogram/types";
import { openPartogram } from "../partogram-actions";
import { cn } from "@/lib/utils";

function nowLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/**
 * Abertura do partograma: hora de abertura (coluna 0) e modelo preferido. A
 * partir daí as aferições preenchem o partograma sozinhas.
 */
export function OpenPartogram({ patientId, compact }: { patientId: string; compact?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(!compact);
  const [at, setAt] = useState(nowLocal);
  const [model, setModel] = useState<PartogramModel>("oms");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open)
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <FileChartLine className="h-4 w-4" /> Abrir partograma
      </Button>
    );

  function submit() {
    setError(null);
    start(async () => {
      const res = await openPartogram(patientId, new Date(at).toISOString(), model);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/pre-parto/${patientId}/partograma`);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <FileChartLine className="h-4 w-4 text-primary" /> Abrir partograma
      </p>
      <label className="block space-y-1 text-xs font-medium">
        Hora de abertura
        <input
          type="datetime-local"
          value={at}
          onChange={(e) => setAt(e.target.value)}
          className="block h-9 rounded-md border bg-background px-2 text-sm"
        />
      </label>
      <div className="space-y-1">
        <p className="text-xs font-medium">Modelo preferido</p>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ["oms", "OMS — Labour Care Guide (2020)"],
              ["uftm", "Ficha HC-UFTM (antigo)"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setModel(m)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                model === m ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">
          Os dois ficam disponíveis; as aferições a partir da abertura (e o último toque da hora anterior) entram sozinhas.
        </p>
      </div>
      {error && <p className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        {compact && (
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        )}
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileChartLine className="h-4 w-4" />}
          Abrir partograma
        </Button>
      </div>
    </div>
  );
}
