/**
 * Prescrição do Hospital Dia no formato da FOLHA DE PRESCRIÇÃO (Diretoria de
 * Enfermagem — HC-UFTM): usada para medicamentos injetáveis aplicados no serviço
 * (ex.: penicilina, ceftriaxona, ferro EV). Cada item gera **uma folha por dose**
 * (ex.: penicilina 3 doses → 3 folhas; noripurum 5 aplicações → 5 folhas).
 *
 * Puro (sem React). NÃO é motor de decisão — a posologia é da equipe (CLAUDE.md).
 */

export interface HospitalDiaItem {
  /** Texto da prescrição (medicamento + posologia). */
  prescricao: string;
  via: string;
  /** Nº de folhas a emitir (uma por dose/aplicação). */
  folhas: number;
}

export interface HospitalDiaData {
  paciente: string;
  registro: string;
  leito?: string;
  /** Data já formatada (ex.: "20/07/2026"). */
  dataBR: string;
  diagnostico?: string;
}

function esc(s: string): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

const HORAS = [10, 12, 14, 16, 18, 20, 22, 24, 2, 4, 6, 8];
/** Linhas extras em branco para a enfermagem completar. */
const LINHAS_EXTRA = 4;

/** Uma folha (uma dose) para um medicamento. */
function folha(item: HospitalDiaItem, d: HospitalDiaData, dose: number): string {
  const horasHead = HORAS.map((h) => `<th>${h}</th>`).join("");
  const horasEmpty = HORAS.map(() => "<td></td>").join("");
  const linhaItem = `<tr>
    <td></td><td>1.</td><td></td>
    <td></td>
    <td class="p-txt">${esc(item.prescricao)}</td>
    <td>${esc(item.via)}</td>
    ${horasEmpty}
    <td></td>
  </tr>`;
  const extras = `<tr>${'<td></td>'.repeat(6 + HORAS.length + 1)}</tr>`.repeat(LINHAS_EXTRA);
  return `<div class="folha">
    <div class="cab">
      <div class="cab-c">
        <div class="t1">FOLHA DE PRESCRIÇÃO</div>
        <div class="t2">HOSPITAL DE CLÍNICAS — UFTM · DIRETORIA DE ENFERMAGEM</div>
        <div class="t3">HOSPITAL DIA — ${esc(`dose ${dose} de ${item.folhas}`)}</div>
      </div>
      <div class="cab-r">
        <div class="tec">TÉCNICO</div>
        <div>( ) Montagem</div>
        <div>( ) Conferência</div>
        <div>( ) Embalagem</div>
      </div>
    </div>
    <table class="ident">
      <tbody>
        <tr>
          <td class="w-nome">Nome do Paciente: <b>${esc(d.paciente.toUpperCase())}</b></td>
          <td>Registro Geral: ${esc(d.registro)}</td>
          <td>Leito: ${esc(d.leito ?? "")}</td>
          <td>Posto:</td>
        </tr>
        <tr>
          <td>Data: ${esc(d.dataBR)}</td>
          <td colspan="2">Diagnóstico: ${esc(d.diagnostico ?? "")}</td>
          <td>Ass. Farmacêutico:</td>
        </tr>
      </tbody>
    </table>
    <table class="presc">
      <colgroup>
        <col class="c-cod" /><col class="c-cod" /><col class="c-cod" />
        <col class="c-quant" /><col class="c-presc" /><col class="c-via" />
        ${HORAS.map(() => '<col class="c-hora" />').join("")}
        <col class="c-obs" />
      </colgroup>
      <thead>
        <tr>
          <th colspan="3">Cód. Material</th>
          <th rowspan="2">Quant Atend</th>
          <th rowspan="2">Prescrição</th>
          <th rowspan="2">Via</th>
          <th colspan="${HORAS.length}">Horário de Medicação</th>
          <th rowspan="2">Observações da Farmácia</th>
        </tr>
        <tr>
          <th>Sub Grup</th><th>Item</th><th>DV</th>
          ${horasHead}
        </tr>
      </thead>
      <tbody>
        ${linhaItem}
        ${extras}
      </tbody>
    </table>
  </div>`;
}

const STYLE = `
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 8pt; }
  .folha { page-break-after: always; }
  .folha:last-child { page-break-after: auto; }
  .cab { display: flex; align-items: stretch; border: 1px solid #000; }
  .cab-c { flex: 1 1 auto; text-align: center; padding: 4px 6px; border-right: 1px solid #000; }
  .cab-c .t1 { font-size: 12pt; font-weight: 700; letter-spacing: .04em; }
  .cab-c .t2 { font-size: 8pt; margin-top: 2px; }
  .cab-c .t3 { font-size: 8pt; font-weight: 700; margin-top: 2px; }
  .cab-r { width: 40mm; padding: 3px 6px; font-size: 7.5pt; }
  .cab-r .tec { font-weight: 700; letter-spacing: .12em; }
  table.ident { width: 100%; border-collapse: collapse; margin-top: -1px; }
  table.ident td { border: 1px solid #000; padding: 3px 5px; font-size: 8pt; }
  table.presc { width: 100%; border-collapse: collapse; margin-top: -1px; table-layout: fixed; }
  table.presc th, table.presc td { border: 1px solid #000; font-size: 7pt; padding: 2px 3px; text-align: center; word-wrap: break-word; }
  table.presc td.p-txt { text-align: left; font-size: 7.5pt; }
  .c-cod { width: 6mm; } .c-quant { width: 12mm; } .c-presc { width: 52mm; }
  .c-via { width: 11mm; } .c-hora { width: 6mm; } .c-obs { width: 18mm; }
  table.presc tbody tr { height: 9mm; }
`;

/** HTML autocontido: para cada item, uma folha por dose. */
export function buildHospitalDiaHtml(items: HospitalDiaItem[], d: HospitalDiaData): string {
  const folhas = items
    .flatMap((it) =>
      Array.from({ length: Math.max(1, it.folhas) }, (_, i) => folha(it, d, i + 1)),
    )
    .join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Prescrição — Hospital Dia</title>
<style>${STYLE}</style></head>
<body>${folhas}</body>
</html>`;
}
