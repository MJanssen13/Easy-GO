"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Activity, Calculator, Info, Loader2, Save } from "lucide-react";
import { saveCtg, type CtgState } from "../actions";
import type { Patient } from "@/core/patients/types";
import {
  computeCtgScore,
  suggestConclusion,
  type CtgVariability,
  type CtgPresence,
  type CtgAtMfRatio,
} from "@/core/ctg/scoring";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: CtgState = {};

function nowLocal(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

const CONCLUSION_OPTIONS = [
  "Feto ativo",
  "Feto hipoativo",
  "Feto inativo",
  "Reativo",
  "Hiporreativo",
  "Não reativo",
  "Bifásico",
];

export function CtgForm({ patient }: { patient: Patient }) {
  const [state, formAction, pending] = useActionState(saveCtg, initialState);

  const [baseline, setBaseline] = useState("");
  const [variability, setVariability] = useState<CtgVariability | "">("6-25");
  const [atMfRatio, setAtMfRatio] = useState<CtgAtMfRatio | "">("gte60");
  const [decelerations, setDecelerations] = useState<CtgPresence | "">("absent");
  const [conclusion, setConclusion] = useState("");

  const bpm = baseline === "" ? null : Number(baseline);
  const score = computeCtgScore({
    baseline: bpm,
    variability: variability || null,
    atMfRatio: atMfRatio || null,
    decelerations: decelerations || null,
  });
  const effectiveConclusion = conclusion || suggestConclusion(score);

  const baselineInRange = bpm != null && bpm >= 110 && bpm <= 160;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="patientId" value={patient.id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1.5">
            <Label htmlFor="recordedAt">Data e hora</Label>
            <Input id="recordedAt" name="recordedAt" type="datetime-local" defaultValue={nowLocal()} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Parâmetros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Linha de base */}
          <div className="space-y-1.5">
            <Label htmlFor="baseline">Linha de base (bpm)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="baseline"
                name="baseline"
                type="number"
                inputMode="numeric"
                className="w-28"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value)}
                placeholder="ex.: 140"
              />
              <span className={`text-xs ${baselineInRange ? "font-bold text-emerald-600" : "text-muted-foreground"}`}>
                110-160 = 1 ponto
              </span>
            </div>
          </div>

          {/* Variabilidade */}
          <div className="space-y-1.5">
            <Label htmlFor="variability">Variabilidade</Label>
            <select
              id="variability"
              name="variability"
              className={selectClass}
              value={variability}
              onChange={(e) => setVariability(e.target.value as CtgVariability)}
            >
              <option value="absent">Ausente (0 pt)</option>
              <option value="lt5">&lt; 5 (0 pt)</option>
              <option value="6-25">6-25 (1 pt)</option>
              <option value="gt25">&gt; 25 (0 pt)</option>
              <option value="sinusoidal">Sinusoidal (0 pt)</option>
            </select>
          </div>

          {/* Acelerações + AT/MF */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="accelerations">Acelerações transitórias</Label>
              <select id="accelerations" name="accelerations" className={selectClass} defaultValue="present">
                <option value="present">Presentes</option>
                <option value="absent">Ausentes</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="atMfRatio">Relação AT / MF</Label>
              <select
                id="atMfRatio"
                name="atMfRatio"
                className={selectClass}
                value={atMfRatio}
                onChange={(e) => setAtMfRatio(e.target.value as CtgAtMfRatio)}
              >
                <option value="lt60">&lt; 60% (0 pt)</option>
                <option value="gte60">&gt; 60% ou 2 AT/20min (2 pt)</option>
              </select>
            </div>
          </div>

          {/* Movimentos + Desacelerações */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="movements">Movimentação fetal</Label>
              <select id="movements" name="movements" className={selectClass} defaultValue="present">
                <option value="present">Presentes</option>
                <option value="absent">Ausentes</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="decelerations">Desacelerações</Label>
              <select
                id="decelerations"
                name="decelerations"
                className={selectClass}
                value={decelerations}
                onChange={(e) => setDecelerations(e.target.value as CtgPresence)}
              >
                <option value="absent">Ausentes (1 pt)</option>
                <option value="present">Presentes (0 pt)</option>
              </select>
            </div>
          </div>

          {decelerations === "present" && (
            <div className="grid grid-cols-1 gap-4 rounded-md bg-muted/40 p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="decelerationType">Tipo</Label>
                <select id="decelerationType" name="decelerationType" className={selectClass} defaultValue="">
                  <option value="">—</option>
                  <option value="early">Precoce</option>
                  <option value="late">Tardia</option>
                  <option value="variable">Variável</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="decelerationCount">Número</Label>
                <Input id="decelerationCount" name="decelerationCount" placeholder="ex.: 3" />
              </div>
            </div>
          )}

          {/* Contrações + Estímulo */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contractions">Contrações</Label>
              <select id="contractions" name="contractions" className={selectClass} defaultValue="absent">
                <option value="absent">Ausentes</option>
                <option value="present">Presentes</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="soundStimulus">Estímulo sonoro</Label>
              <select id="soundStimulus" name="soundStimulus" className={selectClass} defaultValue="not_done">
                <option value="not_done">Não realizado</option>
                <option value="done">Realizado</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stimulusCount">Nº de estímulos (se realizado)</Label>
            <Input id="stimulusCount" name="stimulusCount" className="sm:w-40" />
          </div>
        </CardContent>
      </Card>

      {/* Escore + conclusão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4 text-primary" /> Pontuação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Total</span>
            <span className="text-3xl font-bold text-primary">
              {score} <span className="text-base font-normal text-muted-foreground">/ 5</span>
            </span>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conclusion">Conclusão sugerida</Label>
            <select
              id="conclusion"
              name="conclusion"
              className={`${selectClass} font-semibold`}
              value={effectiveConclusion}
              onChange={(e) => setConclusion(e.target.value)}
            >
              {CONCLUSION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <p className="flex items-start gap-1.5 rounded bg-muted/50 p-2 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            4-5 pts: ativo · 2-3 pts: hipoativo · 0-1 pt: inativo. Apoio à decisão — validar com a
            equipe.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea name="notes" rows={2} placeholder="Detalhes adicionais..." />
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
          Salvar CTG
        </Button>
      </div>
    </form>
  );
}
