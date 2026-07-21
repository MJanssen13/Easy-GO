/**
 * Prescrição do Hospital Dia no formato da FOLHA DE PRESCRIÇÃO (Diretoria de
 * Enfermagem — HC-UFTM), reproduzindo o modelo em papel **à risca**: grade de 27
 * colunas com as larguras exatas do documento (extraídas do .docx), mesclagens,
 * fonte Times New Roman (padrão do documento; nome/registro em Arial negrito),
 * tamanhos exatos (16/13/11/10,5/9/8/6 pt) e logo UFTM embutido.
 *
 * Todos os itens selecionados vão em UMA folha (numerados 1-, 2-, …), e a folha
 * é repetida **uma vez por dose** (penicilina 3 doses → 3 folhas; noripurum 5
 * aplicações → 5 folhas). Puro (sem React). NÃO é motor de decisão (CLAUDE.md).
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

// Larguras exatas das 27 colunas da grade (twips → mm), do .docx modelo.
const COLS_TW = [
  540, 420, 450, 315, 600, 555, 3555, 1710, 645, 195, 285, 331, 331, 331, 132, 200, 331, 331, 158,
  173, 332, 35, 296, 331, 331, 332, 2700,
];
const tw2mm = (t: number) => (t / 1440) * 25.4;
const COLGROUP = COLS_TW.map((t) => `<col style="width:${tw2mm(t).toFixed(2)}mm" />`).join("");
const TABLE_W = tw2mm(COLS_TW.reduce((a, b) => a + b, 0)).toFixed(2); // ≈ 281 mm

// Horários (12 rótulos ocupando 15 colunas da grade: 16, 22 e 2 mesclam 2 colunas).
const HORAS: [string, number][] = [
  ["10", 1], ["12", 1], ["14", 1], ["16", 2], ["18", 1], ["20", 1],
  ["22", 2], ["24", 1], ["2", 2], ["4", 1], ["6", 1], ["8", 1],
];
const TOTAL_LINHAS = 13; // linhas do corpo (itens + linhas em branco), como no modelo

/** Uma linha do corpo (item ou em branco) com a grade completa. */
function linhaCorpo(inner?: { n: number; prescricao: string; via: string }): string {
  const horas = HORAS.map(([, cs]) => `<td colspan="${cs}"></td>`).join("");
  const presc = inner
    ? `<td colspan="4" class="p-txt s11">${inner.n}- ${esc(inner.prescricao)}</td>`
    : `<td colspan="4"></td>`;
  const via = inner ? `<td colspan="2" class="s11">${esc(inner.via)}</td>` : `<td colspan="2"></td>`;
  return `<tr class="corpo">
    <td></td><td></td><td></td>
    <td colspan="2"></td>
    ${presc}
    ${via}
    ${horas}
    <td></td>
  </tr>`;
}

/** Uma folha (uma dose) com todos os itens numerados. */
function folha(items: HospitalDiaItem[], d: HospitalDiaData): string {
  const tecnico = "TÉCNIC0".split("").map((l) => esc(l)).join("<br />");
  const horasHead = HORAS.map(([h, cs]) => `<td colspan="${cs}" class="s8">${h}</td>`).join("");
  const linhasItens = items.map((it, i) =>
    linhaCorpo({ n: i + 1, prescricao: it.prescricao, via: it.via }),
  );
  const faltam = Math.max(0, TOTAL_LINHAS - items.length);
  const vazias = Array.from({ length: faltam }, () => linhaCorpo()).join("");
  return `<div class="folha"><table class="folha-t"><colgroup>${COLGROUP}</colgroup><tbody>
    <tr>
      <td colspan="4" rowspan="3" class="c-logo"><img src="${FOLHA_LOGO}" alt="UFTM" /></td>
      <td colspan="4" rowspan="3" class="c-folha"><div class="s-folha">FOLHA</div><div class="s16">FOLHA DE PRESCRIÇÃO</div></td>
      <td colspan="11" rowspan="3" class="c-hosp"><div class="s13">HOSPITAL DE CLÍNICAS</div><div class="s105">DIRETORIA DE ENFERMAGEM</div></td>
      <td colspan="3" rowspan="3" class="c-tec s9">${tecnico}</td>
      <td colspan="5" class="c-etapa s6">Montagem</td>
    </tr>
    <tr><td colspan="5" class="c-etapa s8">Conferência</td></tr>
    <tr><td colspan="5" class="c-etapa s8">Embalagem</td></tr>
    <tr>
      <td colspan="7" class="lbl">Nome do Paciente: <span class="val">${esc(d.paciente.toUpperCase())}</span></td>
      <td colspan="3" class="lbl">Registro Geral <span class="val">${esc(d.registro)}</span></td>
      <td colspan="5" class="s8">Leito</td>
      <td colspan="7" class="s8">Posto</td>
      <td colspan="5" class="s8">Código do Posto</td>
    </tr>
    <tr class="linha-data">
      <td colspan="4" class="s11">DATA:</td>
      <td colspan="18"></td>
      <td colspan="5" class="s8">Ass. Farmacêutico</td>
    </tr>
    <tr>
      <td colspan="3" class="s8">Cód. Material</td>
      <td colspan="2" rowspan="2" class="s8">Quant Atend</td>
      <td colspan="4" rowspan="2" class="s13">Prescrição</td>
      <td colspan="2" rowspan="2" class="s8">Via</td>
      <td colspan="15" class="s8">Horário de Medicação</td>
      <td colspan="1" rowspan="2" class="s8">Observações da Farmácia</td>
    </tr>
    <tr>
      <td class="s8">Sub Grup</td><td class="s8">Item</td><td class="s8">DV</td>
      ${horasHead}
    </tr>
    ${linhasItens.join("")}
    ${vazias}
  </tbody></table></div>`;
}

export const HOSPITAL_DIA_STYLE = `
  @page { size: A4 landscape; margin: 6mm 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: "Times New Roman", Times, serif; color: #000; font-size: 8pt; }
  .folha { page-break-after: always; font-family: "Times New Roman", Times, serif; color: #000; }
  .folha:last-child { page-break-after: auto; }
  table.folha-t { width: ${TABLE_W}mm; border-collapse: collapse; table-layout: fixed; }
  table.folha-t td { border: 1px solid #000; padding: 1px 3px; text-align: center; vertical-align: middle; word-wrap: break-word; overflow: hidden; }
  .s-folha { font-size: 11pt; } .s16 { font-size: 16pt; } .s13 { font-size: 13pt; }
  .s105 { font-size: 10.5pt; } .s11 { font-size: 11pt; } .s9 { font-size: 9pt; }
  .s8 { font-size: 8pt; } .s6 { font-size: 6pt; }
  .c-logo { padding: 2px; }
  .c-logo img { max-height: 14mm; max-width: 28mm; width: auto; object-fit: contain; }
  .c-tec { line-height: 1.05; letter-spacing: .02em; }
  .c-etapa { text-align: left; }
  .lbl { text-align: left; font-size: 9pt; }
  .val { font-family: Arial, Helvetica, sans-serif; font-weight: 700; font-size: 9pt; }
  td.p-txt { text-align: left; }
  tr.corpo td { height: 10mm; }
  tr.linha-data td { height: 12mm; vertical-align: top; text-align: left; }
`;

/** Só as folhas (sem wrapper HTML) — uma folha por dose. Para impressão combinada. */
export function hospitalDiaSheetsHtml(
  items: HospitalDiaItem[],
  nFolhas: number,
  d: HospitalDiaData,
): string {
  const n = Math.max(1, nFolhas);
  return Array.from({ length: n }, () => folha(items, d)).join("");
}

/** HTML autocontido: uma folha (itens numerados) repetida `nFolhas` vezes. */
export function buildHospitalDiaHtml(
  items: HospitalDiaItem[],
  nFolhas: number,
  d: HospitalDiaData,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Prescrição — Hospital Dia</title>
<style>${HOSPITAL_DIA_STYLE}</style></head>
<body>${hospitalDiaSheetsHtml(items, nFolhas, d)}</body>
</html>`;
}
