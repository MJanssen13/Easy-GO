// Monta um documento HTML autocontido (A4 paisagem, preto e branco) com os
// traçados de cardiotocografia — UMA folha por gravação, em linha contínua e
// escala real (1 cm/min; FHR 30 bpm/cm; TOCO 25 mmHg/cm) — para imprimir ou
// exportar em PDF via `printHtml`. Cada folha traz a identificação (Nome, RG,
// Data, Hora). Função pura; reutiliza o mesmo SVG (em mm) da prévia.

import type { CtgTrace } from "./trc";
import { traceSummary } from "./trc";
import { renderCtgTrace } from "./trace-svg";
import { buildMarks, examStartSec, type Stimulus, type TraceMark } from "./stimuli";
import { annotationRange, annotationsFor, type TraceAnnotation } from "./annotations";

export interface LaudoPatient {
  nome?: string;
  rg?: string;
  data?: string;
  hora?: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function field(label: string, value: string | undefined): string {
  const v = value && value.trim() ? escapeHtml(value.trim()) : "&nbsp;";
  return `<span class="fld"><b>${label}:</b> <span class="val">${v}</span></span>`;
}

function identBlock(patient: LaudoPatient): string {
  return (
    `<div class="ident">` +
    // Nome sempre em MAIÚSCULO no laudo.
    field("Nome", patient.nome?.toUpperCase()) +
    field("RG", patient.rg) +
    field("Data", patient.data) +
    field("Hora", patient.hora) +
    `</div>`
  );
}

function section(
  trace: CtgTrace,
  patient: LaudoPatient,
  marks: TraceMark[],
  last: boolean,
  annotations: TraceAnnotation[] = [],
): string {
  const { svg } = renderCtgTrace(trace, { marks, annotations });
  // As observações por período entram numeradas abaixo do traçado, na mesma
  // ordem dos números desenhados sobre os painéis.
  const notes = annotationsFor(annotations, trace.samples);
  const notesHtml = notes.length
    ? `<ol class="notes">` +
      notes
        .map((a) => `<li><b>${escapeHtml(annotationRange(a))}</b> — ${escapeHtml(a.text)}</li>`)
        .join("") +
      `</ol>`
    : "";
  return `
      <section class="rec"${last ? "" : ' style="page-break-after:always"'}>
        <div class="hdr">
          <span class="ttl">Cardiotocografia — monitor fetal Edan</span>
          ${identBlock(patient)}
          <span class="meta">${escapeHtml(traceSummary(trace))}</span>
        </div>
        ${svg}
        ${notesHtml}
      </section>`;
}

function document_(sections: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Cardiotocografia</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .rec { page-break-inside: avoid; }
  .hdr { margin-bottom: 3mm; }
  .ttl { display: block; font-size: 12px; font-weight: 700; }
  .ident { display: flex; flex-wrap: wrap; gap: 2mm 8mm; margin: 1mm 0; font-size: 11px; }
  .ident .val { display: inline-block; min-width: 30mm; border-bottom: 0.2mm solid #999; }
  .meta { display: block; font-size: 10px; color: #333; }
  svg { display: block; }
  .notes { margin: 2mm 0 0; padding-left: 6mm; font-size: 10px; }
  .notes li { margin: 0.6mm 0; }
</style>
</head>
<body>
  ${sections}
</body>
</html>`;
}

/** Exame único (ou várias gravações da mesma paciente), com estímulos. */
export function buildCtgTraceHtml(
  traces: CtgTrace[],
  patient: LaudoPatient = {},
  stimuli: Stimulus[] = [],
  annotationsByTrace: TraceAnnotation[][] = [],
): string {
  const examStart = examStartSec(traces);
  const sections = traces
    .map((t, i) =>
      section(
        t,
        patient,
        buildMarks(t, stimuli, examStart),
        i === traces.length - 1,
        annotationsByTrace[i] ?? [],
      ),
    )
    .join("");
  return document_(sections);
}

/** Uma entrada da exportação em lote: um exame com sua própria identificação. */
export interface BatchEntry {
  trace: CtgTrace;
  patient: LaudoPatient;
}

/**
 * Exportação em lote: um exame por página, cada um com a sua identificação
 * (Nome/RG/Data/Hora). Sem estímulos manuais — desenha os eventos do arquivo
 * (movimentos fetais e autozeros).
 */
export function buildCtgBatchHtml(entries: BatchEntry[]): string {
  const sections = entries
    .map((e, i) =>
      section(e.trace, e.patient, buildMarks(e.trace, [], null), i === entries.length - 1),
    )
    .join("");
  return document_(sections);
}
