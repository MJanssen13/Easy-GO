/**
 * Atestados/declarações em **PDF real** (jsPDF), no mesmo modelo da receita:
 * A4 **paisagem**, cada documento em **um dos lados** (coluna) da folha, com o
 * timbre do HC-UFTM e assinatura. Vários documentos → 2 por folha. Para o mobile,
 * onde a impressão do navegador falha. Texto vetorial, 100% no dispositivo.
 */
import { jsPDF } from "jspdf";
import { RECEITA_LOGOS } from "@/core/psgo/receita-logos";
import { atestadoTitulo, atestadoCorpo, atestadoCid, dataExtenso, type AtestadoForm } from "./atestado";

// jsPDF (Helvetica padrão, WinAnsi) não tem — → usar hífen.
const UNIDADE = "Hospital de Clínicas da Universidade Federal do Triângulo Mineiro - HC-UFTM";
const ENDERECO = "CNES: 2206595, Av. Getúlio Guarita, 130, N.S. Abadia - Uberaba, MG";

const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 8;
const CENTER = PAGE_W / 2;
const GUTTER = 4;
const PAD = 5;

interface Col {
  x: number;
  w: number;
}
const LEFT: Col = { x: MARGIN, w: CENTER - GUTTER - MARGIN };
const RIGHT: Col = { x: CENTER + GUTTER, w: PAGE_W - MARGIN - (CENTER + GUTTER) };

const PT_TO_MM = 0.352778;

function drawColuna(doc: jsPDF, col: Col, form: AtestadoForm): void {
  const innerX = col.x + PAD;
  const innerW = col.w - 2 * PAD;
  let y = MARGIN + 2;

  // Logos
  const logos = RECEITA_LOGOS.filter((l) => l.src);
  const logoH = 11;
  const dims = logos.map((l) => {
    try {
      const p = doc.getImageProperties(l.src);
      return { src: l.src, w: (logoH * p.width) / p.height, fmt: p.fileType };
    } catch {
      return { src: l.src, w: logoH * 2, fmt: "PNG" };
    }
  });
  const totalW = dims.reduce((s, d) => s + d.w, 0);
  const gap = dims.length > 1 ? (innerW - totalW) / (dims.length + 1) : 0;
  let lx = innerX + Math.max(gap, 0);
  for (const d of dims) {
    try {
      doc.addImage(d.src, d.fmt, lx, y, d.w, logoH);
    } catch {
      /* ignora */
    }
    lx += d.w + Math.max(gap, 4);
  }
  y += logoH + 3;

  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(20);
  doc.text(UNIDADE, col.x + col.w / 2, y, { align: "center", maxWidth: innerW });
  y += 3.2;
  doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(60);
  doc.text(ENDERECO, col.x + col.w / 2, y, { align: "center", maxWidth: innerW });
  y += 2.5;
  doc.setDrawColor(17).setLineWidth(0.4).line(innerX, y, col.x + col.w - PAD, y);
  y += 10;

  // Título
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(17);
  doc.text(atestadoTitulo(form), col.x + col.w / 2, y, { align: "center" });
  y += 10;

  // Corpo (justificado)
  doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(17);
  const corpo = doc.splitTextToSize(atestadoCorpo(form), innerW) as string[];
  doc.text(corpo, innerX, y, { align: "justify", maxWidth: innerW, lineHeightFactor: 1.5 });
  y += corpo.length * 11 * PT_TO_MM * 1.5 + 3;

  const cid = atestadoCid(form);
  if (cid) {
    doc.setFont("helvetica", "bold").setFontSize(10);
    const cl = doc.splitTextToSize(cid, innerW) as string[];
    doc.text(cl, innerX, y);
    y += cl.length * 4.5 + 2;
  }
  if (form.observacoes.trim()) {
    doc.setFont("helvetica", "normal").setFontSize(10);
    const ol = doc.splitTextToSize(form.observacoes.trim(), innerW) as string[];
    doc.text(ol, innerX, y);
  }

  // Local + assinatura ancorados no rodapé da coluna.
  const local = [form.cidade.trim(), dataExtenso(form.data)].filter(Boolean).join(", ");
  const signY = PAGE_H - MARGIN - 10;
  if (local) {
    doc.setFont("helvetica", "normal").setFontSize(11).setTextColor(17);
    doc.text(local, col.x + col.w / 2, signY - 8, { align: "center" });
  }
  const lineW = innerW * 0.7;
  doc.setDrawColor(17).setLineWidth(0.3);
  doc.line(col.x + col.w / 2 - lineW / 2, signY, col.x + col.w / 2 + lineW / 2, signY);
  doc.setFont("helvetica", "bold").setFontSize(11);
  doc.text("Médico Assistente", col.x + col.w / 2, signY + 4.5, { align: "center" });
}

function drawDivider(doc: jsPDF): void {
  doc.setDrawColor(150).setLineWidth(0.2);
  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(CENTER, MARGIN, CENTER, PAGE_H - MARGIN);
  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([], 0);
}

/** Monta o PDF dos atestados (A4 paisagem, 2 documentos por folha). */
export function buildAtestadoPdf(docs: AtestadoForm[]): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const list = docs.length ? docs : [];
  let page = 0;
  for (let i = 0; i < list.length; i += 2) {
    if (page > 0) doc.addPage("a4", "landscape");
    page++;
    drawColuna(doc, LEFT, list[i]);
    if (list[i + 1]) drawColuna(doc, RIGHT, list[i + 1]);
    drawDivider(doc);
  }
  return doc;
}

/** Gera e baixa/abre o PDF dos atestados no dispositivo. */
export function downloadAtestadoPdf(docs: AtestadoForm[]): void {
  const doc = buildAtestadoPdf(docs);
  const nome = (docs[0]?.paciente || "atestado").trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`atestado-${nome}.pdf`);
}
