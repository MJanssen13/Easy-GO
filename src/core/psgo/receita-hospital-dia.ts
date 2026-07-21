/**
 * Prescrição do Hospital Dia no formato da FOLHA DE PRESCRIÇÃO (Diretoria de
 * Enfermagem — HC-UFTM), reproduzindo o modelo em papel. Usada para os itens
 * injetáveis aplicados no serviço (ex.: penicilina, ceftriaxona, ferro EV).
 *
 * Todos os itens selecionados vão em UMA folha (numerados 1-, 2-, …), e essa
 * folha é repetida **uma vez por dose** (ex.: penicilina 3 doses → 3 folhas;
 * noripurum 5 aplicações → 5 folhas). Puro (sem React). NÃO é motor de decisão —
 * a posologia é da equipe (CLAUDE.md).
 */
import { DEFAULT_LETTERHEAD, type LaudoLetterhead } from "@/core/ctg/laudo";

export interface HospitalDiaItem {
  /** Texto da prescrição (medicamento + posologia). */
  prescricao: string;
  via: string;
}

export interface HospitalDiaData {
  paciente: string;
  registro: string;
  leito?: string;
}

function esc(s: string): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

const HORAS = [10, 12, 14, 16, 18, 20, 22, 24, 2, 4, 6, 8];
const TOTAL_LINHAS = 13; // linhas da grade (itens + linhas em branco)

/** Cabeçalho da folha: logo + FOLHA DE PRESCRIÇÃO + TÉCNICO + etapas. */
function cabecalho(lh: LaudoLetterhead): string {
  return `<table class="cab"><tbody><tr>
    <td class="cab-l">${lh.uftm ? `<img src="${esc(lh.uftm)}" alt="UFTM" />` : ""}</td>
    <td class="cab-c">
      <div class="t1">FOLHA DE PRESCRIÇÃO</div>
      <div class="t2">HOSPITAL DE CLÍNICAS — DIRETORIA DE ENFERMAGEM</div>
    </td>
    <td class="cab-tec">T É C N I C O</td>
    <td class="cab-etapas">( ) Montagem<br />( ) Conferência<br />( ) Embalagem</td>
  </tr></tbody></table>`;
}

/** Uma folha (uma dose) com todos os itens numerados. */
function folha(items: HospitalDiaItem[], d: HospitalDiaData, lh: LaudoLetterhead): string {
  const horasHead = HORAS.map((h) => `<th>${h}</th>`).join("");
  const horasEmpty = HORAS.map(() => "<td></td>").join("");
  const linhas = items.map(
    (it, i) => `<tr>
      <td></td><td></td><td></td>
      <td></td>
      <td class="p-txt">${i + 1}- ${esc(it.prescricao)}</td>
      <td>${esc(it.via)}</td>
      ${horasEmpty}
      <td></td>
    </tr>`,
  );
  const faltam = Math.max(0, TOTAL_LINHAS - items.length);
  const vazias = `<tr>${"<td></td>".repeat(6 + HORAS.length + 1)}</tr>`.repeat(faltam);
  return `<div class="folha">
    ${cabecalho(lh)}
    <table class="ident"><tbody>
      <tr>
        <td class="w-nome" colspan="2">Nome do Paciente: <b>${esc(d.paciente.toUpperCase())}</b></td>
        <td>Registro Geral: ${esc(d.registro)}</td>
        <td>Leito: ${esc(d.leito ?? "")}</td>
        <td>Posto:</td>
        <td>Código do Posto:</td>
      </tr>
      <tr>
        <td>DATA:</td>
        <td colspan="4">&nbsp;</td>
        <td>Ass. Farmacêutico:</td>
      </tr>
    </tbody></table>
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
        ${linhas.join("")}
        ${vazias}
      </tbody>
    </table>
  </div>`;
}

const STYLE = `
  @page { size: A4 portrait; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; color: #000; font-size: 8pt; }
  .folha { page-break-after: always; }
  .folha:last-child { page-break-after: auto; }
  table.cab, table.ident, table.presc { width: 100%; border-collapse: collapse; }
  table.ident, table.presc { margin-top: -1px; }
  table.cab td { border: 1px solid #000; vertical-align: middle; padding: 3px 5px; }
  .cab-l { width: 34mm; text-align: center; }
  .cab-l img { max-height: 16mm; max-width: 32mm; width: auto; object-fit: contain; }
  .cab-c { text-align: center; }
  .cab-c .t1 { font-size: 13pt; font-weight: 700; letter-spacing: .06em; }
  .cab-c .t2 { font-size: 8pt; margin-top: 2px; }
  .cab-tec { width: 16mm; text-align: center; font-weight: 700; letter-spacing: .06em; }
  .cab-etapas { width: 30mm; font-size: 7.5pt; line-height: 1.5; }
  table.ident td { border: 1px solid #000; padding: 3px 5px; font-size: 8pt; }
  table.presc { table-layout: fixed; }
  table.presc th, table.presc td { border: 1px solid #000; font-size: 7pt; padding: 2px 3px; text-align: center; word-wrap: break-word; }
  table.presc td.p-txt { text-align: left; font-size: 7.5pt; }
  .c-cod { width: 6mm; } .c-quant { width: 12mm; } .c-presc { width: 58mm; }
  .c-via { width: 11mm; } .c-hora { width: 5mm; } .c-obs { width: 16mm; }
  table.presc tbody tr { height: 9mm; }
`;

/**
 * HTML autocontido: uma folha (com todos os itens numerados) repetida `nFolhas`
 * vezes — uma folha por dose/aplicação.
 */
export function buildHospitalDiaHtml(
  items: HospitalDiaItem[],
  nFolhas: number,
  d: HospitalDiaData,
  lh: LaudoLetterhead = DEFAULT_LETTERHEAD,
): string {
  const n = Math.max(1, nFolhas);
  const folhas = Array.from({ length: n }, () => folha(items, d, lh)).join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Prescrição — Hospital Dia</title>
<style>${STYLE}</style></head>
<body>${folhas}</body>
</html>`;
}
