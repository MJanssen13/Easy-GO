/**
 * Folha de Prescrição do **Hospital Dia** (HC-UFTM) — reproduz o formulário
 * oficial da Diretoria de Enfermagem. Só são preenchidos NOME DO PACIENTE,
 * REGISTRO GERAL e, na tabela, as colunas **Prescrição** e **Via** (em sigla).
 * A DATA fica em branco. A altura das linhas de prescrição cresce quando o
 * texto quebra em mais de uma linha; o restante do modelo não muda.
 */
import { UFTM_BRASAO } from "@/core/letterhead/uftm-brasao";
import {
  prescricaoHospitalDia,
  viaSigla,
  type PrescricaoItem,
  type ReceitaHeader,
} from "./prescricao";

/** Horários pré-impressos no cabeçalho da tabela (Horário de Medicação). */
const HORARIOS = ["10", "12", "14", "16", "18", "20", "22", "24", "2", "4", "6", "8"];

// Geometria vertical do corpo (mm) do HTML — usada para preencher a folha sem
// ultrapassá-la: linhas em branco só entram no espaço que sobra; uma 2ª folha
// só é criada quando as linhas preenchidas excedem a capacidade da página.
const BODY_MM = 118.5; // altura útil do corpo (≈ 16 linhas simples)
const BASE_ROW_MM = 7.4; // altura da linha em branco / curta
const LINE_MM = 4.3; // altura por linha de texto quebrado
const ROW_PAD_MM = 1.2;
// Estimativa de caracteres por linha na coluna Prescrição (Times ~10,5pt numa
// coluna de ~92 mm). Conservador (largura de char maior) → superestima linhas →
// nunca transborda; no máximo sobra um pequeno espaço.
const PRESC_CHARS_LINHA = 46;

/** Altura (mm) de uma linha com `nLines` linhas de texto (mín. = linha base). */
export function hdRowHeightMM(nLines: number, baseRowMM: number, lineMM: number, padMM: number): number {
  return Math.max(baseRowMM, nLines * lineMM + padMM);
}

/** Uma página (folha) do Hospital Dia: itens preenchidos + nº de linhas em
 *  branco que cabem no espaço restante. `startNum` = nº do 1º item da página. */
export interface HdPagina {
  meds: PrescricaoItem[];
  startNum: number;
  blanks: number;
}

/**
 * Distribui os itens de um grupamento em páginas: empacota as linhas
 * preenchidas até a capacidade da folha (`bodyMM`) e completa cada página com
 * linhas em branco só até preencher o que resta (`baseRowMM` cada). Cria página
 * nova apenas quando as linhas preenchidas excedem a capacidade da anterior.
 * `rowHeight` mede a altura de cada item (o HTML estima; o PDF mede exato).
 */
export function planHospitalDiaPaginas(
  meds: PrescricaoItem[],
  rowHeight: (it: PrescricaoItem, num: number) => number,
  bodyMM: number,
  baseRowMM: number,
): HdPagina[] {
  const paginas: HdPagina[] = [];
  let cur: PrescricaoItem[] = [];
  let used = 0;
  let startNum = 1;
  let num = 1;
  const flush = () => {
    const blanks = Math.max(0, Math.floor((bodyMM - used) / baseRowMM));
    paginas.push({ meds: cur, startNum, blanks });
    startNum = num;
    cur = [];
    used = 0;
  };
  for (const it of meds) {
    const h = rowHeight(it, num);
    if (used + h > bodyMM && cur.length) flush();
    cur.push(it);
    used += h;
    num++;
  }
  flush(); // última página (mesmo sem itens → folha em branco)
  return paginas;
}

/** Altura estimada (mm) de um item na coluna Prescrição do HTML. */
function htmlRowHeight(it: PrescricaoItem, num: number): number {
  const txt = `${num}. ${prescricaoHospitalDia(it)}`;
  const nLines = Math.max(1, Math.ceil(txt.length / PRESC_CHARS_LINHA));
  return hdRowHeightMM(nLines, BASE_ROW_MM, LINE_MM, ROW_PAD_MM);
}

function esc(s: string): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

/** Itens marcados como Hospital Dia e com algum conteúdo. */
export function hospitalDiaItems(items: PrescricaoItem[]): PrescricaoItem[] {
  return items.filter((it) => it.hospitalDia && prescricaoHospitalDia(it).trim());
}

/** Grupo de impressão do Hospital Dia (H1, H2…). Cada grupo vira uma folha. */
export interface HospitalDiaGrupo {
  grupo: number; // nº do grupo (grupoImpressao)
  sigla: string; // rótulo (H1, H2…)
  items: PrescricaoItem[];
}

/** Itens do Hospital Dia agrupados por grupo de impressão (na ordem dos nºs). */
export function hospitalDiaGrupos(items: PrescricaoItem[]): HospitalDiaGrupo[] {
  const meds = hospitalDiaItems(items);
  const nums = [...new Set(meds.map((it) => it.grupoImpressao || 1))].sort((a, b) => a - b);
  return nums.map((n) => ({
    grupo: n,
    sigla: `H${n}`,
    items: meds.filter((it) => (it.grupoImpressao || 1) === n),
  }));
}

/** Uma linha da tabela: prescrição numerada + via (sigla); demais em branco.
 *  `num` = nº do item na folha (0 → linha em branco, sem número). */
function linha(it: PrescricaoItem | null, num: number): string {
  const presc = it ? `${num}. ${esc(prescricaoHospitalDia(it))}` : "";
  const via = it ? esc(viaSigla(it.via)) : "";
  const horas = HORARIOS.map(() => `<td class="h"></td>`).join("");
  return `<tr>
    <td class="cm"></td><td class="cm"></td><td class="cm"></td>
    <td class="qt"></td>
    <td class="pr">${presc}</td>
    <td class="vi">${via}</td>
    ${horas}
    <td class="ob"></td>
  </tr>`;
}

export const HOSPITAL_DIA_STYLE = `
  @page { size: A4 landscape; margin: 6mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; }
  body { color: #000; font-family: "Times New Roman", Georgia, serif; font-size: 11pt; }
  .hd-sheet { width: 100%; page-break-after: always; }
  .hd-sheet:last-child { page-break-after: auto; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .cab td { border: 0.4px solid #000; padding: 1mm 2mm; vertical-align: top; }
  /* Emenda entre tabelas: sobrepõe a linha compartilhada (sem borda dupla). */
  .b2, .b3, .presc { margin-top: -1px; }

  .b1 .logo { width: 13%; text-align: center; vertical-align: middle; padding: 1.5mm; }
  .b1 .logo img { max-width: 100%; max-height: 22mm; }
  .b1 .folha { width: 37%; text-align: center; vertical-align: middle; font-size: 15pt; letter-spacing: .02em; }
  .b1 .hosp { width: 20%; text-align: center; vertical-align: middle; }
  .b1 .hosp .h1 { font-size: 13pt; }
  .b1 .hosp .h2 { font-size: 10pt; }
  .b1 .tec { width: 2.6%; text-align: center; vertical-align: middle; padding: 0; }
  .b1 .tec span { writing-mode: vertical-lr; text-orientation: upright; letter-spacing: -1px; font-size: 8.5pt; line-height: 1; }
  .b1 .mini { height: 8mm; font-size: 9.5pt; vertical-align: top; }

  .b2 .nome { width: 40%; }
  .b2 .rg { width: 15%; }
  .b2 .leito { width: 8.5%; }
  .b2 .posto { width: 8.5%; }
  .b2 .cod { width: 28%; }
  .b2 td { height: 13mm; }

  .b3 .data { width: 15%; }
  .b3 .mid { width: 57%; }
  .b3 .ass { width: 28%; }
  .b3 td { height: 13mm; }

  .presc th, .presc td { border: 0.4px solid #000; text-align: center; }
  .presc thead th { font-size: 9.5pt; padding: 0.6mm 0.5mm; vertical-align: middle; }
  .presc thead .th-presc { font-size: 12pt; }
  .presc td { height: 7.4mm; }
  .presc td.pr { text-align: left; padding: 0.6mm 1.6mm; font-size: 10.5pt; line-height: 1.15; word-wrap: break-word; overflow-wrap: anywhere; }
  .presc td.vi { font-size: 10.5pt; }
  /* Larguras das colunas do corpo (somam 100%). Sub Grup e Item um pouco mais
     largas para caber os títulos. */
  .presc col.c-cm1 { width: 3.8%; }
  .presc col.c-cm-item { width: 3%; }
  .presc col.c-cm-dv { width: 2.4%; }
  .presc col.c-qt { width: 5.5%; }
  .presc col.c-pr { width: 33%; }
  .presc col.c-vi { width: 3.4%; }
  .presc col.c-h { width: 2.25%; }
  .presc col.c-ob { width: 21.9%; }
`;

function cabecalho(header: ReceitaHeader): string {
  const nome = esc(header.paciente.trim().toUpperCase());
  const rg = esc(header.prontuario.trim());
  return `<table class="cab b1">
    <tr>
      <td class="logo" rowspan="3"><img src="${UFTM_BRASAO}" alt="UFTM" /></td>
      <td class="folha" rowspan="3">FOLHA<br>FOLHA DE PRESCRIÇÃO</td>
      <td class="hosp" rowspan="3"><div class="h1">HOSPITAL DE CLÍNICAS</div><div class="h2">DIRETORIA DE ENFERMAGEM</div></td>
      <td class="tec" rowspan="3"><span>TÉCNICO</span></td>
      <td class="mini">Montagem</td>
    </tr>
    <tr><td class="mini">Conferência</td></tr>
    <tr><td class="mini">Embalagem</td></tr>
  </table>
  <table class="cab b2">
    <tr>
      <td class="nome">NOME DO PACIENTE: <span class="val">${nome}</span></td>
      <td class="rg">REGISTRO GERAL<br><span class="val">${rg}</span></td>
      <td class="leito">Leito</td>
      <td class="posto">Posto</td>
      <td class="cod">Código do Posto</td>
    </tr>
  </table>
  <table class="cab b3">
    <tr>
      <td class="data">DATA:</td>
      <td class="mid"></td>
      <td class="ass">Ass. Farmacêutico</td>
    </tr>
  </table>`;
}

function corpo(pagina: HdPagina): string {
  const linhas: string[] = [];
  pagina.meds.forEach((it, i) => linhas.push(linha(it, pagina.startNum + i)));
  for (let i = 0; i < pagina.blanks; i++) linhas.push(linha(null, 0));
  return `<table class="presc">
    <colgroup>
      <col class="c-cm1"><col class="c-cm-item"><col class="c-cm-dv">
      <col class="c-qt"><col class="c-pr"><col class="c-vi">
      ${HORARIOS.map(() => `<col class="c-h">`).join("")}
      <col class="c-ob">
    </colgroup>
    <thead>
      <tr>
        <th colspan="3">Cód. Material</th>
        <th rowspan="2">Quant<br>Atend</th>
        <th rowspan="2" class="th-presc">Prescrição</th>
        <th rowspan="2">Via</th>
        <th colspan="${HORARIOS.length}">Horário de Medicação</th>
        <th rowspan="2">Observações da<br>Farmácia</th>
      </tr>
      <tr>
        <th>Sub<br>Grup</th><th>Item</th><th>DV</th>
        ${HORARIOS.map((h) => `<th>${h}</th>`).join("")}
      </tr>
    </thead>
    <tbody>${linhas.join("")}</tbody>
  </table>`;
}

/** Nº de folhas (vias) de cada grupamento, por nº do grupo (H1=1, H2=2…). */
export type CopiasPorGrupo = Record<number, number>;

const copiasDoGrupo = (m: CopiasPorGrupo | undefined, grupo: number): number =>
  Math.max(1, Math.floor(m?.[grupo] ?? 1) || 1);

/**
 * Páginas de todos os grupamentos, já empacotadas e repetidas conforme o nº de
 * folhas de cada grupo. Sem itens marcados, gera uma folha em branco.
 */
export function hospitalDiaPaginas(
  items: PrescricaoItem[],
  copiasPorGrupo: CopiasPorGrupo = {},
): HdPagina[] {
  const grupos = hospitalDiaGrupos(items);
  const bases = grupos.length ? grupos : [{ grupo: 1, sigla: "H1", items: [] as PrescricaoItem[] }];
  return bases.flatMap((g) => {
    const n = copiasDoGrupo(copiasPorGrupo, g.grupo);
    const pgs = planHospitalDiaPaginas(g.items, htmlRowHeight, BODY_MM, BASE_ROW_MM);
    return Array.from({ length: n }, () => pgs).flat();
  });
}

/** HTML autocontido da Folha de Prescrição do Hospital Dia — uma folha por
 *  página de cada grupo (H1, H2…), com o nº de vias por grupo. */
export function buildHospitalDiaPrintHtml(
  header: ReceitaHeader,
  items: PrescricaoItem[],
  copiasPorGrupo: CopiasPorGrupo = {},
): string {
  const nome = header.paciente.trim();
  const titulo = nome ? `H dia ${esc(nome)}` : "H dia";
  const folhas = hospitalDiaPaginas(items, copiasPorGrupo)
    .map((pg) => `<div class="hd-sheet">${cabecalho(header)}${corpo(pg)}</div>`)
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title>
<style>${HOSPITAL_DIA_STYLE}</style></head><body>${folhas}</body></html>`;
}
