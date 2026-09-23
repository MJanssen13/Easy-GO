"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Microscope, User, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { emptyOncoHistory, type OncoHistory } from "@/core/oncogineco/types";
import { admitOnco, type Basics } from "../actions";
import { BasicsFields, OncoDiagnosisFields, OncoHistoryFields } from "./onco-fields";

export function OncoAdmissionForm() {
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
  const [history, setHistory] = useState<OncoHistory>(emptyOncoHistory());

  function submit() {
    setError(null);
    start(async () => {
      const res = await admitOnco(basics, history);
      if (res.error || !res.id) {
        setError(res.error ?? "Erro ao admitir.");
        return;
      }
      router.push(`/oncogineco/${res.id}`);
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> Paciente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BasicsFields basics={basics} onChange={setBasics} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Microscope className="h-4 w-4" /> Diagnóstico e internação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OncoDiagnosisFields value={history} onChange={setHistory} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" /> Antecedentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OncoHistoryFields value={history} onChange={setHistory} />
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
