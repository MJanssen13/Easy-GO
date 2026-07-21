/**
 * Prescrição do Hospital Dia no formato da FOLHA DE PRESCRIÇÃO (Diretoria de
 * Enfermagem — HC-UFTM), reproduzindo fielmente o modelo em papel (fonte Times
 * New Roman, logo UFTM embutido). Usada para os itens injetáveis aplicados no
 * serviço (ex.: penicilina, ceftriaxona, ferro EV).
 *
 * Todos os itens selecionados vão em UMA folha (numerados 1-, 2-, …), e essa
 * folha é repetida **uma vez por dose** (ex.: penicilina 3 doses → 3 folhas;
 * noripurum 5 aplicações → 5 folhas). Puro (sem React). NÃO é motor de decisão —
 * a posologia é da equipe (CLAUDE.md).
 */
import { FOLHA_LOGO } from "./receita-folha-logo";

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
const TOTAL_LINHAS = 14; // linhas da grade (itens + linhas em branco)

/** Cabeçalho: logo | FOLHA DE PRESCRIÇÃO | HOSPITAL DE CLÍNICAS | TÉCNICO | etapas. */
function cabecalho(): string {
  const tecnico = "TÉCNICO".split("").map((l) => `<span>${l}</span>`).join("");
  return `<table class="cab"><tbody>
    <tr>
      <td class="cab-logo" rowspan="3"><img src="${FOLHA_LOGO}" alt="UFTM" /></td>
      <td class="cab-titulo" rowspan="3">
        <div class="t-folha">FOLHA</div>
        <div class="t-main">FOLHA DE PRESCRIÇÃO</div>
      </td>
      <td class="cab-hosp" rowspan="3">
        <div class="t-hosp">HOSPITAL DE CLÍNICAS</div>
        <div class="t-diret">DIRETORIA DE ENFERMAGEM</div>
      </td>
      <td class="cab-tec" rowspan="3">${tecnico}</td>
      <td class="cab-etapa">Montagem</td>
    </tr>
    <tr><td class="cab-etapa">Conferência</td></tr>
    <tr><td class="cab-etapa">Embalagem</td></tr>
  </tbody></table>`;
}

/** Uma folha (uma dose) com todos os itens numerados. */
function folha(items: HospitalDiaItem[], d: HospitalDiaData): string {
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
  const vazias = `<tr class="vazia">${"<td></td>".repeat(6 + HORAS.length + 1)}</tr>`.repeat(faltam);
  return `<div class="folha">
    ${cabecalho()}
    <table class="ident"><tbody>
      <tr>
        <td class="i-nome">Nome do Paciente: <span class="val">${esc(d.paciente.toUpperCase())}</span></td>
        <td class="i-reg">Registro Geral<br /><span class="val">${esc(d.registro)}</span></td>
        <td class="i-leito">Leito</td>
        <td class="i-posto">Posto</td>
        <td class="i-cod">Código do Posto</td>
      </tr>
      <tr class="linha-data">
        <td>DATA:</td>
        <td colspan="3">&nbsp;</td>
        <td>Ass. Farmacêutico</td>
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
  body { font-family: "Times New Roman", Times, serif; color: #000; font-size: 9pt; }
  .folha { page-break-after: always; }
  .folha:last-child { page-break-after: auto; }
  table.cab, table.ident, table.presc { width: 100%; border-collapse: collapse; }
  table.ident, table.presc { margin-top: -1px; }
  table.cab td { border: 1px solid #000; vertical-align: middle; padding: 2px 6px; }
  .cab-logo { width: 30mm; text-align: center; padding: 3px; }
  .cab-logo img { max-height: 15mm; max-width: 28mm; width: auto; object-fit: contain; }
  .cab-titulo { text-align: center; }
  .cab-titulo .t-folha { font-size: 12pt; }
  .cab-titulo .t-main { font-size: 15pt; }
  .cab-hosp { width: 52mm; text-align: center; }
  .cab-hosp .t-hosp { font-size: 12pt; }
  .cab-hosp .t-diret { font-size: 9pt; }
  .cab-tec { width: 8mm; text-align: center; padding: 2px 0; }
  .cab-tec span { display: block; font-size: 8pt; line-height: 1.15; }
  .cab-etapa { width: 30mm; font-size: 9pt; height: 6mm; }
  table.ident td { border: 1px solid #000; padding: 3px 6px; font-size: 9pt; vertical-align: top; }
  table.ident .val { font-family: Arial, sans-serif; font-weight: 700; font-size: 8.5pt; }
  table.ident .i-nome { width: 46%; }
  table.ident .linha-data td { height: 12mm; vertical-align: top; }
  table.presc { table-layout: fixed; }
  table.presc th, table.presc td { border: 1px solid #000; font-size: 8pt; padding: 2px 3px; text-align: center; word-wrap: break-word; }
  table.presc th { font-weight: normal; }
  table.presc td.p-txt { text-align: left; }
  .c-cod { width: 7mm; } .c-quant { width: 13mm; } .c-presc { width: 56mm; }
  .c-via { width: 11mm; } .c-hora { width: 5mm; } .c-obs { width: 18mm; }
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
): string {
  const n = Math.max(1, nFolhas);
  const folhas = Array.from({ length: n }, () => folha(items, d)).join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Prescrição — Hospital Dia</title>
<style>${STYLE}</style></head>
<body>${folhas}</body>
</html>`;
}
