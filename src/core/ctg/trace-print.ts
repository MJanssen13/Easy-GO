// Monta um documento HTML autocontido (A4 paisagem, preto e branco) com um ou
// mais traçados de cardiotocografia, para ser impresso/exportado em PDF via
// `printHtml`. Função pura; reutiliza o mesmo SVG da prévia na tela.

import type { CtgTrace } from "./trc";
import { traceSummary } from "./trc";
import { renderCtgTraceSvg } from "./trace-svg";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCtgTraceHtml(traces: CtgTrace[]): string {
  const sections = traces
    .map(
      (t) => `
      <section class="rec">
        <div class="hdr">${escapeHtml(traceSummary(t))}</div>
        ${renderCtgTraceSvg(t)}
      </section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>Cardiotocografia</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h1 { font-size: 15px; margin: 0 0 2px; }
  .sub { font-size: 10px; color: #444; margin-bottom: 10px; }
  .rec { margin-bottom: 14px; page-break-inside: avoid; }
  .hdr { font-size: 11px; font-weight: 600; border-left: 3px solid #000; padding: 3px 8px; margin-bottom: 4px; }
  svg { max-width: 100%; }
</style>
</head>
<body>
  <h1>Cardiotocografia — monitor fetal Edan</h1>
  <div class="sub">FHR (frequência cardíaca fetal) e TOCO (atividade uterina) · 1 amostra/s · grade vertical a cada 60 s · faixa cinza = 110–160 bpm</div>
  ${sections}
</body>
</html>`;
}
