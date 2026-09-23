"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyDelivery, emptyHistory, type DeliveryInfo, type WardHistory } from "@/core/puerperio/types";
import { admitPuerperio, type Basics } from "../actions";
import { DeliveryFields } from "./delivery-fields";
import { HistoryFields } from "./history-fields";

/** Admissão direta (sem passar pelo Pré-Parto do sistema). */
export function AdmissionForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [basics, setBasics] = useState<Basics>({
    name: "",
    medicalRecordNumber: "",
    bed: "",
    age: "",
    parity: "",
    bloodType: "",
  });
  const [history, setHistory] = useState<WardHistory>(emptyHistory());
  const [delivery, setDelivery] = useState<DeliveryInfo>(() => emptyDelivery());

  function submit() {
    setError(null);
    start(async () => {
      const res = await admitPuerperio({ ...basics, riskFactors: [], delivery, history });
      if (res.error || !res.id) {
        setError(res.error ?? "Erro ao admitir.");
        return;
      }
      router.push(`/puerperio/${res.id}`);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parto e RN</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryFields value={delivery} onChange={setDelivery} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Paciente e antecedentes</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryFields basics={basics} onBasics={setBasics} history={history} onHistory={setHistory} />
        </CardContent>
      </Card>
      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      <div className="flex justify-end">
        <Button type="button" onClick={submit} disabled={pending || !basics.name.trim()}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Admitir
        </Button>
      </div>
    </div>
  );
}
