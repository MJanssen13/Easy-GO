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
import { buildCtgTraceHtml, type LaudoPatient } from "@/core/ctg/trace-print";
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

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function CardiotocografiaToolPage() {
  const [traces, setTraces] = useState<CtgTrace[]>([]);
  const [errors, setErrors] = useState<Failed[]>([]);
  const [busy, setBusy] = useState(false);
  const [patient, setPatient] = useState<LaudoPatient>({ nome: "", rg: "", data: "", hora: "" });
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [stimKind, setStimKind] = useState<StimulusKind>("mecanico");
  const [stimMode, setStimMode] = useState<StimMode>("tempo");
  const [stimValue, setStimValue] = useState("");
  const [stimError, setStimError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dateTimeEdited = useRef(false);

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
    if (!dateTimeEdited.current) {
      const first = ok[0];
      const now = new Date();
      const data =
        formatTraceDate(first?.date ?? null) ??
        `${pad2(now.getDate())}/${pad2(now.getMonth() + 1)}/${now.getFullYear()}`;
      const hora = first?.startTime ?? `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      setPatient((p) => ({ ...p, data, hora }));
    }
    setBusy(false);
  }, []);

  const openPicker = () => inputRef.current?.click();
  const clear = () => {
    setTraces([]);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = "";
  };
  const exportPdf = () => printHtml(buildCtgTraceHtml(traces, patient, stimuli));

  const setField = (k: keyof LaudoPatient, v: string) => {
    if (k === "data" || k === "hora") dateTimeEdited.current = true;
    setPatient((p) => ({ ...p, [k]: v }));
  };

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
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
    setStimuli((s) => [...s, { id, kind: stimKind, clockSec: clockSec as number }].sort((a, b) => a.clockSec - b.clockSec));
    setStimValue("");
  };

  const removeStimulus = (id: string) => setStimuli((s) => s.filter((x) => x.id !== id));

  const Seg = <T extends string>({
    value,
    options,
    onChange,
  }: {
    value: T;
    options: { v: T; label: string }[];
    onChange: (v: T) => void;
  }) => (
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <HeartPulse className="h-6 w-6 text-slate-600" />
          Cardiotocografia
        </h1>
        <p className="text-muted-foreground">
          Abra os arquivos <code className="rounded bg-muted px-1">.trc</code> do monitor fetal Edan
          (F2/F3) e gere o laudo em <strong>uma folha por gravação</strong>, em linha contínua e
          paisagem: <strong>1 cm/min</strong>, FHR a <strong>30 bpm/cm</strong> e TOCO a{" "}
          <strong>25 mmHg/cm</strong>, com movimentos fetais, autozeros e estímulos. Em preto e
          branco, pronto para imprimir ou salvar como PDF. Tudo é processado no seu dispositivo —
          nenhum arquivo é enviado.
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
              <>
                <Button type="button" variant="outline" onClick={exportPdf}>
                  <Printer className="h-4 w-4" /> Imprimir / Exportar PDF
                </Button>
                <Button type="button" variant="ghost" onClick={clear}>
                  <Trash2 className="h-4 w-4" /> Limpar
                </Button>
              </>
            )}
            {busy && <span className="text-sm text-muted-foreground">Lendo…</span>}
          </div>

          {/* Identificação do laudo — data/hora preenchidas automaticamente e editáveis. */}
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
              <Label htmlFor="ctg-rg">RG / Prontuário</Label>
              <Input
                id="ctg-rg"
                value={patient.rg}
                onChange={(e) => setField("rg", e.target.value)}
                placeholder="RG"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="ctg-data">Data</Label>
                <Input
                  id="ctg-data"
                  value={patient.data}
                  onChange={(e) => setField("data", e.target.value)}
                  placeholder="DD/MM/AAAA"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ctg-hora">Hora</Label>
                <Input
                  id="ctg-hora"
                  value={patient.hora}
                  onChange={(e) => setField("hora", e.target.value)}
                  placeholder="HH:MM"
                />
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
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs"
                  >
                    <span className="font-medium">{STIMULUS_LABEL[s.kind]}</span>
                    <span className="text-muted-foreground">
                      tempo {tempo} · hora {formatClock(s.clockSec)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStimulus(s.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remover"
                    >
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

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {errors.map((f) => (
            <div key={f.fileName}>
              <span className="font-medium">{f.fileName}</span>: {f.error}
            </div>
          ))}
        </div>
      )}

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
              dangerouslySetInnerHTML={{
                __html: renderCtgTraceSvg(t, { marks: buildMarks(t, stimuli, examStart) }),
              }}
            />
          </CardContent>
        </Card>
      ))}

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
