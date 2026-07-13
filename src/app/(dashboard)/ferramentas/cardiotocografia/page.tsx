"use client";

import { useCallback, useRef, useState } from "react";
import { FileUp, Printer, Trash2, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { printHtml } from "@/lib/print";
import { parseTrc, traceSummary, TrcParseError, type CtgTrace } from "@/core/ctg/trc";
import { renderCtgTraceSvg } from "@/core/ctg/trace-svg";
import { buildCtgTraceHtml } from "@/core/ctg/trace-print";

type Failed = { fileName: string; error: string };

export default function CardiotocografiaToolPage() {
  const [traces, setTraces] = useState<CtgTrace[]>([]);
  const [errors, setErrors] = useState<Failed[]>([]);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setBusy(false);
  }, []);

  const openPicker = () => inputRef.current?.click();
  const clear = () => {
    setTraces([]);
    setErrors([]);
    if (inputRef.current) inputRef.current.value = "";
  };
  const exportPdf = () => printHtml(buildCtgTraceHtml(traces));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <HeartPulse className="h-6 w-6 text-slate-600" />
          Cardiotocografia
        </h1>
        <p className="text-muted-foreground">
          Abra os arquivos <code className="rounded bg-muted px-1">.trc</code> do monitor fetal Edan
          (F2/F3) e gere a cardiotocografia em PDF. FHR (frequência cardíaca fetal) em cima e TOCO
          (atividade uterina) embaixo, em preto e branco. Tudo é processado no seu dispositivo —
          nenhum arquivo é enviado.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-2 py-4">
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
                <Printer className="h-4 w-4" /> Exportar PDF
              </Button>
              <Button type="button" variant="ghost" onClick={clear}>
                <Trash2 className="h-4 w-4" /> Limpar
              </Button>
            </>
          )}
          {busy && <span className="text-sm text-muted-foreground">Lendo…</span>}
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
            </div>
            <div
              className="overflow-x-auto"
              dangerouslySetInnerHTML={{ __html: renderCtgTraceSvg(t) }}
            />
          </CardContent>
        </Card>
      ))}

      {traces.length > 0 && (
        <p className="px-1 text-xs text-muted-foreground">
          Reconstrução a partir dos dados brutos do aparelho (1 amostra/s; faixa de FHR 50–210 bpm,
          faixa cinza = 110–160 bpm). Ferramenta de apoio — a interpretação clínica deve ser feita
          pelo profissional sobre o traçado original do monitor.
        </p>
      )}
    </div>
  );
}
