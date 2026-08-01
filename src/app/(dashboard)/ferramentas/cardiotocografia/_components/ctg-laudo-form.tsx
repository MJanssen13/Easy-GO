"use client";

/**
 * Laudo da cardiotocografia dentro da ferramenta: os campos vêm PRÉ-PREENCHIDOS
 * pela análise automática do arquivo .trc (`@/core/ctg/analysis`) e todos são
 * editáveis. Imprime no modelo do HC-UFTM (`renderCtgLaudoHtml`).
 *
 * Apoio à decisão — os achados automáticos devem ser validados no traçado.
 */

import { useEffect, useRef, useState } from "react";
import { Calculator, Info, Printer, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { printHtml } from "@/lib/print";
import { letterheadFor, renderCtgLaudoHtml, type CtgLaudoData } from "@/core/ctg/laudo";
import {
  computeCtgScore,
  suggestConclusion,
  type CtgAtMfRatio,
  type CtgDecelType,
  type CtgPresence,
  type CtgSoundStimulus,
  type CtgVariability,
} from "@/core/ctg/scoring";
import type { CtgAnalysis } from "@/core/ctg/analysis";
import type { LaudoPatient } from "@/core/ctg/trace-print";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const CONCLUSION_OPTIONS = [
  "Feto ativo",
  "Feto hipoativo",
  "Feto inativo",
  "Reativo",
  "Hiporreativo",
  "Não reativo",
  "Bifásico",
];

/** Campos do laudo editáveis na ferramenta. */
export interface LaudoFields {
  hd: string;
  baseline: string;
  variability: CtgVariability | "";
  accelerations: CtgPresence | "";
  atMfRatio: CtgAtMfRatio | "";
  movements: CtgPresence | "";
  decelerations: CtgPresence | "";
  decelerationType: CtgDecelType | "";
  decelerationCount: string;
  contractions: CtgPresence | "";
  soundStimulus: CtgSoundStimulus | "";
  stimulusCount: string;
  mechanicalStimulus: CtgSoundStimulus | "";
  mechanicalStimulusCount: string;
  conclusion: string;
  notes: string;
  cd: string;
  equipe: string;
}

/** Campos que o usuário preenche à mão (não vêm do arquivo). */
const MANUAL_FIELDS = ["hd", "cd", "equipe"] as const;

export function CtgLaudoForm({
  suggested,
  suggestionKey,
  analysis,
  patient,
}: {
  /** Valores derivados do traçado (análise automática + estímulos + observações). */
  suggested: LaudoFields;
  /** Muda quando um novo arquivo é carregado → repõe os campos automáticos. */
  suggestionKey: string;
  analysis: CtgAnalysis | null;
  patient: LaudoPatient;
}) {
  const [f, setF] = useState<LaudoFields>(suggested);
  /** Campos que o profissional editou à mão — não são mais sobrescritos. */
  const editedRef = useRef<Set<keyof LaudoFields>>(new Set());
  const keyRef = useRef(suggestionKey);

  const isManual = (k: keyof LaudoFields) => (MANUAL_FIELDS as readonly string[]).includes(k);

  /** Aplica os valores do traçado aos campos ainda não editados. */
  const applySuggested = (resetEdits: boolean) => {
    if (resetEdits) editedRef.current = new Set();
    setF((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(suggested) as (keyof LaudoFields)[]) {
        if (isManual(k)) continue; // HD, conduta e equipe são sempre do usuário
        if (editedRef.current.has(k)) continue;
        next[k] = suggested[k] as never;
      }
      return next;
    });
  };

  // Mantém os campos automáticos em dia com o traçado, os estímulos e as
  // observações por período — sem desfazer o que já foi editado à mão. Ao trocar
  // de arquivo, as edições são descartadas e tudo é reposto.
  useEffect(() => {
    const newFile = keyRef.current !== suggestionKey;
    if (newFile) keyRef.current = suggestionKey;
    applySuggested(newFile);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggested, suggestionKey]);

  const set = <K extends keyof LaudoFields>(k: K, v: LaudoFields[K]) => {
    editedRef.current.add(k);
    setF((p) => ({ ...p, [k]: v }));
  };

  /** Descarta as edições e repõe tudo do traçado (mantém HD/conduta/equipe). */
  const refill = () => applySuggested(true);

  const bpm = f.baseline.trim() ? Number(f.baseline) : null;
  const score = computeCtgScore({
    baseline: Number.isNaN(bpm as number) ? null : bpm,
    variability: f.variability || null,
    atMfRatio: f.atMfRatio || null,
    decelerations: f.decelerations || null,
  });
  const effectiveConclusion = f.conclusion || suggestConclusion(score);

  const print = () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const data: CtgLaudoData = {
      name: patient.nome ?? "",
      rg: patient.rg ?? "",
      date: patient.data ?? "",
      time: patient.hora ?? "",
      hd: f.hd,
      baseline: f.baseline,
      variability: f.variability,
      accelerations: f.accelerations,
      atMfRatio: f.atMfRatio,
      movements: f.movements,
      decelerations: f.decelerations,
      decelerationType: f.decelerationType,
      decelerationCount: f.decelerationCount,
      contractions: f.contractions,
      soundStimulus: f.soundStimulus,
      stimulusCount: f.stimulusCount,
      mechanicalStimulus: f.mechanicalStimulus,
      mechanicalStimulusCount: f.mechanicalStimulusCount,
      conclusion: effectiveConclusion,
      notes: f.notes,
      cd: f.cd,
      equipe: f.equipe,
    };
    printHtml(renderCtgLaudoHtml(data, letterheadFor(origin)));
  };

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-sm font-medium">Laudo</div>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
            preenchido do traçado · editável
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button type="button" variant="ghost" onClick={refill}>
              <Wand2 className="h-4 w-4" /> Preencher do traçado
            </Button>
            <Button type="button" variant="outline" onClick={print}>
              <Printer className="h-4 w-4" /> Imprimir laudo
            </Button>
          </div>
        </div>

        {/* Achados automáticos e pendências */}
        {analysis && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>
                Linha de base:{" "}
                <strong>{analysis.baselineBpm != null ? `${analysis.baselineBpm} bpm` : "—"}</strong>
              </span>
              <span>
                Variabilidade:{" "}
                <strong>
                  {analysis.variabilityBpm != null ? `${analysis.variabilityBpm} bpm` : "—"}
                </strong>
              </span>
              <span>
                Acelerações: <strong>{analysis.accelerations.length}</strong>
                {analysis.prolongedAccelerations.length > 0 &&
                  ` (+${analysis.prolongedAccelerations.length} prolongada(s))`}
              </span>
              <span>
                Desacelerações: <strong>{analysis.decelerations.length}</strong>
              </span>
              <span>
                Mov. fetais: <strong>{analysis.movements}</strong>
              </span>
              <span>
                AT/MF:{" "}
                <strong>
                  {analysis.atMfPercent != null ? `${Math.round(analysis.atMfPercent)}%` : "—"}
                </strong>{" "}
                · {analysis.accelPer20min.toFixed(1)} AT/20min
              </span>
              <span>
                Contrações: <strong>{analysis.contractions.length}</strong>
              </span>
            </div>
            {analysis.warnings.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-muted-foreground">
                {analysis.warnings.map((w) => (
                  <li key={w} className="flex items-start gap-1.5">
                    <Info className="mt-0.5 h-3 w-3 shrink-0" />
                    {w}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="l-hd">HD (hipótese diagnóstica)</Label>
          <Input
            id="l-hd"
            value={f.hd}
            onChange={(e) => set("hd", e.target.value)}
            placeholder="ex.: GESTAÇÃO DE 36 SEMANAS E 4 DIAS"
            className="uppercase"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="l-base">Linha de base (bpm)</Label>
            <Input
              id="l-base"
              value={f.baseline}
              onChange={(e) => set("baseline", e.target.value)}
              inputMode="numeric"
              placeholder="ex.: 140"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-var">Variabilidade</Label>
            <select
              id="l-var"
              className={selectClass}
              value={f.variability}
              onChange={(e) => set("variability", e.target.value as CtgVariability)}
            >
              <option value="">—</option>
              <option value="absent">Ausente (0 pt)</option>
              <option value="lt5">&lt; 5 (0 pt)</option>
              <option value="6-25">6-25 (1 pt)</option>
              <option value="gt25">&gt; 25 (0 pt)</option>
              <option value="sinusoidal">Sinusoidal (0 pt)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-at">Acelerações transitórias</Label>
            <select
              id="l-at"
              className={selectClass}
              value={f.accelerations}
              onChange={(e) => set("accelerations", e.target.value as CtgPresence)}
            >
              <option value="">—</option>
              <option value="present">Presentes</option>
              <option value="absent">Ausentes</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-atmf">Relação AT / MF</Label>
            <select
              id="l-atmf"
              className={selectClass}
              value={f.atMfRatio}
              onChange={(e) => set("atMfRatio", e.target.value as CtgAtMfRatio)}
            >
              <option value="">—</option>
              <option value="lt60">&lt; 60% (0 pt)</option>
              <option value="gte60">&gt; 60% ou 2 AT/20min (2 pt)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-mf">Movimentação fetal</Label>
            <select
              id="l-mf"
              className={selectClass}
              value={f.movements}
              onChange={(e) => set("movements", e.target.value as CtgPresence)}
            >
              <option value="">—</option>
              <option value="present">Presentes</option>
              <option value="absent">Ausentes</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-contr">Contrações</Label>
            <select
              id="l-contr"
              className={selectClass}
              value={f.contractions}
              onChange={(e) => set("contractions", e.target.value as CtgPresence)}
            >
              <option value="">—</option>
              <option value="absent">Ausentes</option>
              <option value="present">Presentes</option>
            </select>
          </div>
        </div>

        {/* Desacelerações */}
        <div className="grid grid-cols-1 gap-3 rounded-md bg-muted/30 p-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="l-dec">Desacelerações</Label>
            <select
              id="l-dec"
              className={selectClass}
              value={f.decelerations}
              onChange={(e) => set("decelerations", e.target.value as CtgPresence)}
            >
              <option value="">—</option>
              <option value="absent">Ausentes (1 pt)</option>
              <option value="present">Presentes (0 pt)</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-dect">Tipo (avaliar no traçado)</Label>
            <select
              id="l-dect"
              className={selectClass}
              value={f.decelerationType}
              onChange={(e) => set("decelerationType", e.target.value as CtgDecelType)}
              disabled={f.decelerations !== "present"}
            >
              <option value="">—</option>
              <option value="early">Precoce</option>
              <option value="late">Tardia</option>
              <option value="variable">Variável</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-decn">Nº de desacelerações</Label>
            <Input
              id="l-decn"
              value={f.decelerationCount}
              onChange={(e) => set("decelerationCount", e.target.value)}
              disabled={f.decelerations !== "present"}
            />
          </div>
        </div>

        {/* Estímulos — vêm dos estímulos lançados na ferramenta */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="l-som">Estímulo sonoro</Label>
              <select
                id="l-som"
                className={selectClass}
                value={f.soundStimulus}
                onChange={(e) => set("soundStimulus", e.target.value as CtgSoundStimulus)}
              >
                <option value="">—</option>
                <option value="not_done">Não realizado</option>
                <option value="done">Realizado</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="l-somn">Nº</Label>
              <Input
                id="l-somn"
                value={f.stimulusCount}
                onChange={(e) => set("stimulusCount", e.target.value)}
                disabled={f.soundStimulus !== "done"}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="l-mec">Estímulo mecânico</Label>
              <select
                id="l-mec"
                className={selectClass}
                value={f.mechanicalStimulus}
                onChange={(e) => set("mechanicalStimulus", e.target.value as CtgSoundStimulus)}
              >
                <option value="">—</option>
                <option value="not_done">Não realizado</option>
                <option value="done">Realizado</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="l-mecn">Nº</Label>
              <Input
                id="l-mecn"
                value={f.mechanicalStimulusCount}
                onChange={(e) => set("mechanicalStimulusCount", e.target.value)}
                disabled={f.mechanicalStimulus !== "done"}
              />
            </div>
          </div>
        </div>

        {/* Pontuação + conclusão */}
        <div className="flex flex-wrap items-end gap-4 rounded-md border p-3">
          <div className="flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            <span className="text-sm text-muted-foreground">Pontuação</span>
            <span className="text-2xl font-bold text-primary">
              {score}
              <span className="text-sm font-normal text-muted-foreground"> / 5</span>
            </span>
          </div>
          <div className="min-w-52 flex-1 space-y-1">
            <Label htmlFor="l-concl">Conclusão</Label>
            <select
              id="l-concl"
              className={`${selectClass} font-semibold`}
              value={effectiveConclusion}
              onChange={(e) => set("conclusion", e.target.value)}
            >
              {CONCLUSION_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3 w-3 shrink-0" />
            4-5 pts: ativo · 2-3: hipoativo · 0-1: inativo. Apoio à decisão — validar com a equipe.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="l-obs">Observações</Label>
          <Textarea
            id="l-obs"
            rows={3}
            value={f.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="As observações por período do traçado entram aqui automaticamente."
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="l-cd">CD (conduta)</Label>
            <Input
              id="l-cd"
              value={f.cd}
              onChange={(e) => set("cd", e.target.value)}
              placeholder="orientação da equipe"
              className="uppercase"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="l-eq">Equipe de plantão</Label>
            <Input
              id="l-eq"
              value={f.equipe}
              onChange={(e) => set("equipe", e.target.value)}
              placeholder="ex.: CHEFIA: ... | R3: ..."
              className="uppercase"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
