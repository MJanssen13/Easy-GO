"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { FileUp, Printer, Trash2, HeartPulse, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { printHtml } from "@/lib/print";
import { parseTrc, traceSummary, formatTraceDate, TrcParseError, type CtgTrace } from "@/core/ctg/trc";
import { renderCtgTraceSvg } from "@/core/ctg/trace-svg";
import { buildCtgTraceHtml, buildCtgBatchHtml, type LaudoPatient } from "@/core/ctg/trace-print";
import {
  buildMarks,
  examStartSec,
  parseClock,
  parseElapsed,
  formatClock,
  formatElapsed,
  STIMULUS_LABEL,
  type Stimulus,
  type StimulusKind,
} from "@/core/ctg/stimuli";

type Failed = { fileName: string; error: string };
type StimMode = "tempo" | "hora";
type ViewMode = "exame" | "lote";
type BatchRow = { rg: string; nome: string; selected: boolean };

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { v: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-input p-0.5">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-md px-3 py-1 text-sm transition-colors",
            value === o.v ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function CardiotocografiaToolPage() {
  const [mode, setMode] = useState<ViewMode>("exame");
  const [traces, setTraces] = useState<CtgTrace[]>([]);
  const [errors, setErrors] = useState<Failed[]>([]);
  const [busy, setBusy] = useState(false);

  // Modo "exame": identificação compartilhada + estímulos.
  const [patient, setPatient] = useState<LaudoPatient>({ nome: "", rg: "", data: "", hora: "" });
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [stimKind, setStimKind] = useState<StimulusKind>("mecanico");
  const [stimMode, setStimMode] = useState<StimMode>("tempo");
  const [stimValue, setStimValue] = useState("");
  const [stimError, setStimError] = useState("");
  const dateTimeEdited = useRef(false);
  const rgEdited = useRef(false);

  // Modo "lote": uma linha por exame (RG vindo do ID, editável) + nome.
  const [batch, setBatch] = useState<BatchRow[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const examStart = useMemo(() => examStartSec(traces), [traces]);

  const handleFiles = useCallback(async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setBusy(true);
    const ok: CtgTrace[] = [];
    const bad: Failed[] = [];
    for (const file of Array.from(fileList)) {
      try {
        ok.push(parseTrc(await file.arrayBuffer(), file.name));
      } catch (e) {
        const msg =
          e instanceof TrcParseError ? e.message : (e as Error)?.message || "Falha ao ler o arquivo.";
        bad.push({ fileName: file.name, error: msg });
      }
    }
    ok.sort((a, b) => {
      const ta = a.startTime ?? "";
      const tb = b.startTime ?? "";
      return ta === tb ? a.fileName.localeCompare(b.fileName) : ta.localeCompare(tb);
    });
    setTraces(ok);
    setErrors(bad);
    setBatch(ok.map((t) => ({ rg: t.fileId, nome: "", selected: true })));

    const first = ok[0];
    const now = new Date();
    if (!dateTimeEdited.current) {
      const data =
        formatTraceDate(first?.date ?? null) ??
        `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
      const hora = first?.startTime ?? `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      setPatient((p) => ({ ...p, data, hora }));
    }
    if (!rgEdited.current && first) setPatient((p) => ({ ...p, rg: first.fileId }));
    setBusy(false);
  }, []);

  const openPicker = () => inputRef.current?.click();
  const clear = () => {
    setTraces([]);
    setErrors([]);
    setBatch([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const exportExame = () => printHtml(buildCtgTraceHtml(traces, patient, stimuli));
  const exportBatch = () => {
    const entries = traces
      .map((t, i) => ({ t, r: batch[i] }))
      .filter((x) => x.r?.selected)
      .map(({ t, r }) => ({
        trace: t,
        patient: {
          nome: r.nome,
          rg: r.rg,
          data: formatTraceDate(t.date) ?? "",
          hora: t.startTime ?? "",
        } as LaudoPatient,
      }));
    if (entries.length) printHtml(buildCtgBatchHtml(entries));
  };

  const setField = (k: keyof LaudoPatient, v: string) => {
    if (k === "data" || k === "hora") dateTimeEdited.current = true;
    if (k === "rg") rgEdited.current = true;
    setPatient((p) => ({ ...p, [k]: v }));
  };

  const setRow = (i: number, patch: Partial<BatchRow>) =>
    setBatch((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const selectedCount = batch.filter((r) => r.selected).length;
  const allSelected = batch.length > 0 && selectedCount === batch.length;

  const addStimulus = () => {
    setStimError("");
    let clockSec: number | null = null;
    if (stimMode === "hora") {
      clockSec = parseClock(stimValue);
      if (clockSec == null) return setStimError("Hora inválida. Use HH:MM (ex.: 13:42).");
    } else {
      const elapsed = parseElapsed(stimValue);
      if (elapsed == null) return setStimError("Tempo inválido. Use mm:ss (ex.: 05:30).");
      if (examStart == null)
        return setStimError("Carregue um arquivo (com horário) para usar o tempo decorrido, ou informe a hora.");
      clockSec = examStart + elapsed;
    }
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    setStimuli((s) => [...s, { id, kind: stimKind, clockSec: clockSec as number }].sort((a, b) => a.clockSec - b.clockSec));
    setStimValue("");
  };
  const removeStimulus = (id: string) => setStimuli((s) => s.filter((x) => x.id !== id));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <HeartPulse className="h-6 w-6 text-slate-600" />
          Cardiotocografia
        </h1>
        <p className="text-muted-foreground">
          Abra os arquivos <code className="rounded bg-muted px-1">.trc</code> do monitor fetal Edan
          (F2/F3) e gere o laudo em paisagem, em linha contínua: <strong>1 cm/min</strong>, FHR a{" "}
          <strong>30 bpm/cm</strong>, TOCO a <strong>25 mmHg/cm</strong>, com movimentos fetais,
          autozeros e estímulos. Preto e branco, pronto para imprimir ou salvar como PDF. Tudo é
          processado no seu dispositivo — nenhum arquivo é enviado.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".trc"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
            <Button type="button" onClick={openPicker}>
              <FileUp className="h-4 w-4" />
              {traces.length ? "Trocar arquivos" : "Abrir arquivos .trc"}
            </Button>
            {traces.length > 0 && (
              <Button type="button" variant="ghost" onClick={clear}>
                <Trash2 className="h-4 w-4" /> Limpar
              </Button>
            )}
            {busy && <span className="text-sm text-muted-foreground">Lendo…</span>}
            <div className="ml-auto">
              <Seg
                value={mode}
                onChange={setMode}
                options={[
                  { v: "exame", label: "Exame" },
                  { v: "lote", label: "Lote" },
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errors.map((f) => (
            <div key={f.fileName}>
              <span className="font-medium">{f.fileName}</span>: {f.error}
            </div>
          ))}
        </div>
      )}

      {mode === "exame" ? (
        <>
          <Card>
            <CardContent className="space-y-4 py-4">
              {traces.length > 0 && (
                <Button type="button" variant="outline" onClick={exportExame}>
                  <Printer className="h-4 w-4" /> Imprimir / Exportar PDF
                </Button>
              )}
              {/* Identificação — data/hora/RG preenchidas do arquivo e editáveis. */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1 lg:col-span-2">
                  <Label htmlFor="ctg-nome">Nome</Label>
                  <Input
                    id="ctg-nome"
                    value={patient.nome}
                    onChange={(e) => setField("nome", e.target.value)}
                    placeholder="Nome da paciente"
                    className="uppercase"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ctg-rg">RG / ID</Label>
                  <Input
                    id="ctg-rg"
                    value={patient.rg}
                    onChange={(e) => setField("rg", e.target.value)}
                    placeholder="ID do arquivo"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ctg-data">Data</Label>
                    <Input id="ctg-data" value={patient.data} onChange={(e) => setField("data", e.target.value)} placeholder="DD/MM/AAAA" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ctg-hora">Hora</Label>
                    <Input id="ctg-hora" value={patient.hora} onChange={(e) => setField("hora", e.target.value)} placeholder="HH:MM" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estímulos manuais (mecânico / sonoro), por tempo (mm:ss) ou hora (HH:MM). */}
          <Card>
            <CardContent className="space-y-3 py-4">
              <div className="text-sm font-medium">Estímulos</div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label>Tipo</Label>
                  <Seg
                    value={stimKind}
                    onChange={setStimKind}
                    options={[
                      { v: "mecanico", label: "Mecânico" },
                      { v: "sonoro", label: "Sonoro" },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Referência</Label>
                  <Seg
                    value={stimMode}
                    onChange={setStimMode}
                    options={[
                      { v: "tempo", label: "Tempo (mm:ss)" },
                      { v: "hora", label: "Hora (HH:MM)" },
                    ]}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ctg-stim">{stimMode === "tempo" ? "Tempo decorrido" : "Hora"}</Label>
                  <Input
                    id="ctg-stim"
                    value={stimValue}
                    onChange={(e) => setStimValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addStimulus()}
                    placeholder={stimMode === "tempo" ? "05:30" : "13:42"}
                    className="w-28"
                  />
                </div>
                <Button type="button" variant="outline" onClick={addStimulus}>
                  <Plus className="h-4 w-4" /> Adicionar
                </Button>
              </div>
              {stimError && <p className="text-xs text-destructive">{stimError}</p>}
              {stimuli.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {stimuli.map((s) => {
                    const tempo = examStart != null ? formatElapsed(s.clockSec - examStart) : "—";
                    return (
                      <li key={s.id} className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs">
                        <span className="font-medium">{STIMULUS_LABEL[s.kind]}</span>
                        <span className="text-muted-foreground">
                          tempo {tempo} · hora {formatClock(s.clockSec)}
                        </span>
                        <button type="button" onClick={() => removeStimulus(s.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="text-xs text-muted-foreground">
                Informe por <strong>tempo decorrido</strong> (mm:ss desde o início do exame) ou por{" "}
                <strong>hora de relógio</strong> (HH:MM); os dois são mostrados. Cada estímulo vira uma
                linha vertical no traçado (sólida = mecânico, tracejada = sonoro).
              </p>
            </CardContent>
          </Card>

          {traces.map((t, i) => (
            <Card key={`${t.fileName}-${i}`}>
              <CardContent className="py-4">
                <div className="mb-3 border-l-4 border-slate-400 pl-3 text-sm font-medium">
                  {traceSummary(t)}
                  {t.events.length > 0 && (
                    <span className="ml-2 font-normal text-muted-foreground">
                      · {t.events.filter((e) => e.kind === "movimento").length} mov. fetal ·{" "}
                      {t.events.filter((e) => e.kind === "autozero").length} autozero(s)
                    </span>
                  )}
                </div>
                <div
                  className="overflow-x-auto"
                  dangerouslySetInnerHTML={{ __html: renderCtgTraceSvg(t, { marks: buildMarks(t, stimuli, examStart) }) }}
                />
              </CardContent>
            </Card>
          ))}
        </>
      ) : (
        /* ---- Modo LOTE: lista de exames + exportação em arquivo único ---- */
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm font-medium">Exportação em lote</div>
              <Button
                type="button"
                variant="outline"
                className="ml-auto"
                disabled={selectedCount === 0}
                onClick={exportBatch}
              >
                <Printer className="h-4 w-4" /> Exportar selecionados ({selectedCount})
              </Button>
            </div>

            {traces.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Abra vários arquivos <code className="rounded bg-muted px-1">.trc</code> para montar a
                lista. Cada exame vira uma página no arquivo exportado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="w-8 px-2 py-2">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={(e) => setBatch((rows) => rows.map((r) => ({ ...r, selected: e.target.checked })))}
                          aria-label="Selecionar todos"
                        />
                      </th>
                      <th className="px-2 py-2">Data</th>
                      <th className="px-2 py-2">Hora</th>
                      <th className="px-2 py-2">RG / ID</th>
                      <th className="px-2 py-2">Nome do paciente</th>
                      <th className="px-2 py-2">Exame</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traces.map((t, i) => (
                      <tr key={`${t.fileName}-${i}`} className="border-b align-middle">
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={batch[i]?.selected ?? false}
                            onChange={(e) => setRow(i, { selected: e.target.checked })}
                            aria-label="Selecionar exame"
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5">{formatTraceDate(t.date) ?? "—"}</td>
                        <td className="whitespace-nowrap px-2 py-1.5">{t.startTime ?? "—"}</td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={batch[i]?.rg ?? ""}
                            onChange={(e) => setRow(i, { rg: e.target.value })}
                            className="h-8"
                            placeholder="ID"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <Input
                            value={batch[i]?.nome ?? ""}
                            onChange={(e) => setRow(i, { nome: e.target.value })}
                            className="h-8 uppercase"
                            placeholder="Nome"
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 text-xs text-muted-foreground">
                          {Math.round(t.stats.durationSec / 60)} min
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              O RG vem preenchido pelo ID do arquivo (editável). Marque os exames e exporte todos em um
              único arquivo, com um exame por página.
            </p>
          </CardContent>
        </Card>
      )}

      {traces.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          Reconstrução a partir dos dados brutos do aparelho (1 amostra/s; FHR 50–210 bpm a 30 bpm/cm,
          faixa cinza = 110–160 bpm; TOCO 0–100 mmHg a 25 mmHg/cm; papel a 1 cm/min). No diálogo de
          impressão, escolha a impressora ou &quot;Salvar como PDF&quot;. Ferramenta de apoio — a
          interpretação clínica deve ser feita pelo profissional sobre o traçado original do monitor.
        </p>
      )}
    </div>
  );
}
