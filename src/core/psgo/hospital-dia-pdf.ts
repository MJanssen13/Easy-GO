/**
 * Folha de Prescrição do Hospital Dia (HC-UFTM) em **PDF real** (jsPDF), para o
 * celular. Reproduz o mesmo formulário da impressão (A4 paisagem): timbre,
 * quadros do cabeçalho e a tabela de prescrição. Só NOME DO PACIENTE, REGISTRO
 * GERAL, Prescrição e Via (sigla) são preenchidos; a altura da linha cresce
 * quando a prescrição quebra em mais de uma linha.
 */
import { jsPDF } from "jspdf";
import { UFTM_BRASAO } from "@/core/letterhead/uftm-brasao";
import {
  prescricaoHospitalDia,
  viaSigla,
  type PrescricaoItem,
  type ReceitaHeader,
} from "./prescricao";
import {
  hospitalDiaGrupos,
  planHospitalDiaPaginas,
  hdRowHeightMM,
  type HdPagina,
  type CopiasPorGrupo,
} from "./hospital-dia";

const PAGE_W = 297;
const PAGE_H = 210;
const M = 6; // margem
const X0 = M;
const Y0 = M;
const X1 = PAGE_W - M;
const Y1 = PAGE_H - M;
const W = X1 - X0;

const HORARIOS = ["10", "12", "14", "16", "18", "20", "22", "24", "2", "4", "6", "8"];

/** Símbolos ausentes na fonte interna → equivalentes ASCII. */
function deglyph(s: string): string {
  return s.replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/×/g, "x").replace(/–/g, "-").replace(/—/g, "-");
}

/** Frações das 19 colunas do corpo (somam 1). */
function bodyCols(): number[] {
  const f = [
    0.038, 0.03, 0.024, // Cód. Material (Sub Grup / Item [mais largas] / DV)
    0.055, // Quant Atend
    0.33, // Prescrição
    0.034, // Via
    ...HORARIOS.map(() => 0.0225), // Horário (12)
    0.219, // Observações
  ];
  return f.map((v) => v * W);
}

/** x acumulado das bordas a partir das larguras. */
function edges(widths: number[], start: number): number[] {
  const out = [start];
  for (const w of widths) out.push(out[out.length - 1] + w);
  return out;
}

function line(doc: jsPDF, x1: number, y1: number, x2: number, y2: number) {
  doc.line(x1, y1, x2, y2);
}

/** Texto centrado (helper). */
function tc(doc: jsPDF, s: string, x: number, y: number, maxWidth?: number) {
  doc.text(deglyph(s), x, y, maxWidth ? { align: "center", maxWidth } : { align: "center" });
}

function drawCabecalho(doc: jsPDF, header: ReceitaHeader): number {
  const B1 = 27,
    B2 = 13,
    B3 = 13;
  const yB1 = Y0,
    yB2 = Y0 + B1,
    yB3 = Y0 + B1 + B2,
    yBody = Y0 + B1 + B2 + B3;

  doc.setDrawColor(0).setLineWidth(0.15);

  // --- Banda 1: logo | FOLHA | HOSPITAL | TÉCNICO | Montagem/Conf/Embalagem ---
  const x = {
    logo: X0,
    folha: X0 + 0.13 * W,
    hosp: X0 + 0.5 * W,
    tec: X0 + 0.7 * W,
    box: X0 + 0.726 * W,
    end: X1,
  };
  // molduras da banda 1
  doc.rect(X0, yB1, W, B1);
  [x.folha, x.hosp, x.tec, x.box].forEach((xx) => line(doc, xx, yB1, xx, yB2));
  // 3 quadros à direita (Montagem/Conferência/Embalagem)
  const t3 = B1 / 3;
  line(doc, x.box, yB1 + t3, x.end, yB1 + t3);
  line(doc, x.box, yB1 + 2 * t3, x.end, yB1 + 2 * t3);

  // logo (brasão UFTM)
  try {
    const p = doc.getImageProperties(UFTM_BRASAO);
    const hImg = 20;
    const wImg = (hImg * p.width) / p.height;
    doc.addImage(UFTM_BRASAO, "PNG", x.logo + (x.folha - x.logo - wImg) / 2, yB1 + (B1 - hImg) / 2, wImg, hImg);
  } catch {
    /* sem logo → deixa em branco */
  }

  doc.setTextColor(0).setFont("times", "normal");
  doc.setFontSize(15);
  const cf = (x.folha + x.hosp) / 2;
  tc(doc, "FOLHA", cf, yB1 + B1 / 2 - 2);
  tc(doc, "FOLHA DE PRESCRIÇÃO", cf, yB1 + B1 / 2 + 5);
  const ch = (x.hosp + x.tec) / 2;
  doc.setFontSize(13);
  tc(doc, "HOSPITAL DE CLÍNICAS", ch, yB1 + B1 / 2 - 1, x.tec - x.hosp - 2);
  doc.setFontSize(10);
  tc(doc, "DIRETORIA DE ENFERMAGEM", ch, yB1 + B1 / 2 + 4, x.tec - x.hosp - 2);
  // TÉCNICO vertical (letras empilhadas, na vertical)
  doc.setFontSize(8);
  const tecC = (x.tec + x.box) / 2;
  const letras = "TÉCNICO".split("");
  const lh = 3;
  let ty = yB1 + B1 / 2 - ((letras.length - 1) * lh) / 2;
  for (const ch2 of letras) {
    tc(doc, ch2, tecC, ty + 1);
    ty += lh;
  }
  // rótulos dos 3 quadros
  doc.setFontSize(9.5);
  doc.text("Montagem", x.box + 2, yB1 + 4);
  doc.text("Conferência", x.box + 2, yB1 + t3 + 4);
  doc.text("Embalagem", x.box + 2, yB1 + 2 * t3 + 4);

  // --- Banda 2: NOME | REGISTRO GERAL | Leito | Posto | Código do Posto ---
  const w2 = [0.4, 0.15, 0.085, 0.085, 0.28].map((v) => v * W);
  const e2 = edges(w2, X0);
  doc.rect(X0, yB2, W, B2);
  e2.slice(1, -1).forEach((xx) => line(doc, xx, yB2, xx, yB3));
  doc.setFontSize(12);
  const lblNome = "NOME DO PACIENTE:";
  doc.text(lblNome, e2[0] + 2, yB2 + 5.5);
  const lblNomeW = doc.getTextWidth(lblNome); // medido com times 12pt
  doc.setFont("helvetica", "normal").setFontSize(11);
  doc.text(deglyph(header.paciente.trim().toUpperCase()), e2[0] + 4 + lblNomeW, yB2 + 5.5);
  doc.setFont("times", "normal").setFontSize(12);
  doc.text("REGISTRO GERAL", e2[1] + 2, yB2 + 5.5);
  doc.setFont("helvetica", "normal").setFontSize(11);
  doc.text(deglyph(header.prontuario.trim()), e2[1] + 2, yB2 + 11);
  doc.setFont("times", "normal").setFontSize(12);
  doc.text("Leito", e2[2] + 2, yB2 + 5.5);
  doc.text("Posto", e2[3] + 2, yB2 + 5.5);
  doc.text("Código do Posto", e2[4] + 2, yB2 + 5.5);

  // --- Banda 3: DATA | (vazio) | Ass. Farmacêutico ---
  const w3 = [0.15, 0.57, 0.28].map((v) => v * W);
  const e3 = edges(w3, X0);
  doc.rect(X0, yB3, W, B3);
  e3.slice(1, -1).forEach((xx) => line(doc, xx, yB3, xx, yBody));
  doc.text("DATA:", e3[0] + 2, yB3 + 5.5);
  doc.text("Ass. Farmacêutico", e3[2] + 2, yB3 + 5.5);

  return yBody;
}

// Geometria vertical do corpo do PDF (deve casar com o empacotamento).
const PDF_BASE_ROW = 7.4;
const PDF_LINE = 3.5;
const PDF_PAD = 2.2;
const PDF_BODY_MM = Y1 - (Y0 + 27 + 13 + 13 + 6.5 + 8.3); // corpo útil ≈ 130 mm
const PR_PAD = 3;

/** Largura de texto (mm) da coluna Prescrição. */
function prescWidth(): number {
  return bodyCols()[4] - PR_PAD * 2; // iPr = 4
}

function drawTabela(doc: jsPDF, pagina: HdPagina, yTop: number): void {
  const widths = bodyCols();
  const ex = edges(widths, X0);
  const H1 = 6.5,
    H2 = 8.3;
  const headBot = yTop + H1 + H2;

  doc.setDrawColor(0).setLineWidth(0.15);

  // Índices de coluna
  const iQt = 3,
    iPr = 4,
    iVi = 5,
    iH0 = 6,
    iOb = 18;

  // molduras do cabeçalho
  // linha 1: Cód.Material (0-2), Quant(3), Prescrição(4), Via(5), Horário(6-17), Obs(18)
  // verticais de topo (linha 1)
  line(doc, X0, yTop, X1, yTop);
  [ex[3], ex[iQt + 1], ex[iPr + 1], ex[iVi + 1], ex[iOb], X1].forEach((xx) =>
    line(doc, xx, yTop, xx, yTop + H1),
  );
  // divisória entre header 1 e 2 SÓ sob "Cód. Material" e "Horário de Medicação"
  // (Quant, Prescrição, Via e Observações são células únicas que atravessam os 2).
  line(doc, X0, yTop + H1, ex[3], yTop + H1);
  line(doc, ex[iH0], yTop + H1, ex[iOb], yTop + H1);
  // verticais linha 2: subdivide Cód.Material (0-2) e Horário (6-17); mantém Quant/Presc/Via/Obs
  const l2verts = [ex[1], ex[2], ex[iQt], ex[iQt + 1], ex[iPr + 1], ex[iVi + 1]];
  for (let i = iH0; i <= iOb; i++) l2verts.push(ex[i]);
  l2verts.forEach((xx) => line(doc, xx, yTop + H1, xx, headBot));
  line(doc, X0, headBot, X1, headBot);
  // bordas externas verticais do cabeçalho inteiro
  line(doc, X0, yTop, X0, headBot);
  line(doc, X1, yTop, X1, headBot);

  // textos do cabeçalho
  doc.setFont("times", "bold").setTextColor(0);
  doc.setFontSize(9.5);
  tc(doc, "Cód. Material", (ex[0] + ex[3]) / 2, yTop + 4.5);
  tc(doc, "Quant", (ex[iQt] + ex[iQt + 1]) / 2, yTop + H1 / 2 + 3);
  tc(doc, "Atend", (ex[iQt] + ex[iQt + 1]) / 2, yTop + H1 / 2 + 6.5);
  doc.setFontSize(12);
  tc(doc, "Prescrição", (ex[iPr] + ex[iPr + 1]) / 2, yTop + H1 / 2 + 4.5);
  doc.setFontSize(9.5);
  tc(doc, "Via", (ex[iVi] + ex[iVi + 1]) / 2, yTop + H1 / 2 + 4.5);
  tc(doc, "Horário de Medicação", (ex[iH0] + ex[iOb]) / 2, yTop + 4.5);
  tc(doc, "Observações da", (ex[iOb] + X1) / 2, yTop + H1 / 2 + 3);
  tc(doc, "Farmácia", (ex[iOb] + X1) / 2, yTop + H1 / 2 + 6.5);
  // linha 2: Sub Grup / Item / DV
  doc.setFontSize(9);
  tc(doc, "Sub", (ex[0] + ex[1]) / 2, yTop + H1 + 3.5);
  tc(doc, "Grup", (ex[0] + ex[1]) / 2, yTop + H1 + 6.8);
  tc(doc, "Item", (ex[1] + ex[2]) / 2, yTop + H1 + 5);
  tc(doc, "DV", (ex[2] + ex[3]) / 2, yTop + H1 + 5);
  HORARIOS.forEach((h, i) => tc(doc, h, (ex[iH0 + i] + ex[iH0 + i + 1]) / 2, yTop + H1 + 5.5));

  // --- Corpo ---
  const prW = widths[iPr] - PR_PAD * 2;

  // Alturas das linhas com medicamento (crescem com a quebra); numeradas a
  // partir de pagina.startNum, dentro da própria célula de prescrição.
  doc.setFont("times", "normal").setFontSize(10);
  const medRows = pagina.meds.map((it, i) => {
    const txt = deglyph(`${pagina.startNum + i}. ${prescricaoHospitalDia(it)}`);
    const lines = doc.splitTextToSize(txt, prW) as string[];
    const h = hdRowHeightMM(lines.length, PDF_BASE_ROW, PDF_LINE, PDF_PAD);
    return { it, lines, h };
  });
  const medTotalH = medRows.reduce((s, r) => s + r.h, 0);
  // Linhas em branco: só as planejadas, distribuídas para preencher o restante
  // da folha (sem transbordar — o empacotamento já garantiu que os itens cabem).
  const remaining = Y1 - (headBot + medTotalH);
  const nEmpty = pagina.blanks;
  const emptyH = nEmpty > 0 ? remaining / nEmpty : 0;

  const drawRow = (y: number, h: number, lines: string[] | null, via: string) => {
    // verticais internas (todas as bordas de coluna) + bordas externas
    for (let k = 1; k < ex.length - 1; k++) line(doc, ex[k], y, ex[k], y + h);
    line(doc, X0, y, X0, y + h);
    line(doc, X1, y, X1, y + h);
    line(doc, X0, y + h, X1, y + h);
    if (lines) {
      doc.setFont("times", "normal").setFontSize(10).setTextColor(0);
      let ty = y + 3.2;
      for (const ln of lines) {
        doc.text(ln, ex[iPr] + PR_PAD, ty);
        ty += PDF_LINE;
      }
      if (via) tc(doc, via, (ex[iVi] + ex[iVi + 1]) / 2, y + h / 2 + 1.2);
    }
  };

  let y = headBot;
  for (const r of medRows) {
    drawRow(y, r.h, r.lines, deglyph(viaSigla(r.it.via)));
    y += r.h;
  }
  for (let i = 0; i < nEmpty; i++) {
    drawRow(y, emptyH, null, "");
    y += emptyH;
  }
}

/** Constrói o PDF (jsPDF) da Folha de Prescrição do Hospital Dia — uma página
 *  por folha planejada de cada grupo (H1, H2…), com o nº de vias por grupo. */
export function buildHospitalDiaPdf(
  header: ReceitaHeader,
  items: PrescricaoItem[],
  copiasPorGrupo: CopiasPorGrupo = {},
): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const prW = prescWidth();
  // Mede as linhas exatamente (fonte da célula de prescrição) para empacotar.
  doc.setFont("times", "normal").setFontSize(10);
  const rowHeight = (it: PrescricaoItem, num: number): number => {
    const lines = doc.splitTextToSize(
      deglyph(`${num}. ${prescricaoHospitalDia(it)}`),
      prW,
    ) as string[];
    return hdRowHeightMM(lines.length, PDF_BASE_ROW, PDF_LINE, PDF_PAD);
  };
  const grupos = hospitalDiaGrupos(items);
  const bases = grupos.length ? grupos : [{ grupo: 1, sigla: "H1", items: [] as PrescricaoItem[] }];
  const paginas: HdPagina[] = bases.flatMap((g) => {
    const n = Math.max(1, Math.floor(copiasPorGrupo[g.grupo] ?? 1) || 1);
    const pgs = planHospitalDiaPaginas(g.items, rowHeight, PDF_BODY_MM, PDF_BASE_ROW);
    return Array.from({ length: n }, () => pgs).flat();
  });
  paginas.forEach((pg, i) => {
    if (i > 0) doc.addPage();
    const yBody = drawCabecalho(doc, header);
    drawTabela(doc, pg, yBody);
  });
  return doc;
}

/** Gera e baixa o PDF no dispositivo. */
export function downloadHospitalDiaPdf(
  header: ReceitaHeader,
  items: PrescricaoItem[],
  copiasPorGrupo: CopiasPorGrupo = {},
): void {
  const doc = buildHospitalDiaPdf(header, items, copiasPorGrupo);
  const nome = header.paciente.trim();
  doc.save(nome ? `H dia ${nome}.pdf` : "H dia.pdf");
}
