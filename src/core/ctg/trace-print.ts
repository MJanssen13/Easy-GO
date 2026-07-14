// Monta um documento HTML autocontido (A4 paisagem, preto e branco) com os
// traçados de cardiotocografia — UMA folha por gravação, em linha contínua e
// escala real de 1 cm/min — para imprimir ou exportar em PDF via `printHtml`.
// Função pura; reutiliza o mesmo SVG (em mm) da prévia na tela.

import type { CtgTrace } from "./trc";
import { traceSummary } from "./trc";
import { renderCtgTrace } from "./trace-svg";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCtgTraceHtml(traces: CtgTrace[]): string {
  const sections = traces
    .map((t, i) => {
      const { svg } = renderCtgTrace(t);
      const last = i === traces.length - 1;
      return `
      <section class="rec"${last ? "" : ' style="page-break-after:always"'}>
        <div class="hdr">
          <span class="ttl">Cardiotocografia — monitor fetal Edan</span>
          <span class="meta">${escapeHtml(traceSummary(t))}</span>
        </div>
        ${svg}
      </section>`;
    })
    .join("");

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
  .meta { display: block; font-size: 10px; color: #333; }
  svg { display: block; }
</style>
</head>
<body>
  ${sections}
</body>
</html>`;
}
