"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Baby, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emptyDelivery, type DeliveryInfo } from "@/core/puerperio/types";
import { transferToPuerperio } from "../../puerperio/actions";
import { DeliveryFields, Field } from "../../puerperio/_components/delivery-fields";

/**
 * Após o parto: registra via de parto/RN e transfere a paciente para o
 * Puerpério (mesmo registro de paciente; troca de módulo auditada).
 */
export function TransferToPuerperio({ patientId, bed }: { patientId: string; bed?: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [delivery, setDelivery] = useState<DeliveryInfo>(() => emptyDelivery());
  const [newBed, setNewBed] = useState("");

  if (!open) {
    return (
      <Button type="button" variant="outline" className="w-full" onClick={() => setOpen(true)}>
        <Baby className="h-4 w-4" /> Parto realizado — transferir para o Puerpério
      </Button>
    );
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await transferToPuerperio(patientId, delivery, newBed);
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(`/puerperio/${patientId}`);
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Baby className="h-4 w-4 text-primary" /> Parto e RN
      </p>
      <DeliveryFields value={delivery} onChange={setDelivery} />
      <Field label="Leito no alojamento conjunto (opcional)">
        <Input
          className="w-40"
          placeholder={bed ?? ""}
          value={newBed}
          onChange={(e) => setNewBed(e.target.value)}
        />
      </Field>
      {error && <p className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
          Transferir para o Puerpério
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        A paciente leva os dados comuns (RG, paridade, TS, antecedentes do PSGO). O Puerpério já abre
        com o contexto da internação e o RN preenchidos.
      </p>
    </div>
  );
}
