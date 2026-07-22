/**
 * Atestado/declaração em **PDF real** (jsPDF) para dispositivos móveis, onde a
 * impressão do navegador falha. A4 retrato, timbre do HC-UFTM, corpo justificado
 * e assinatura. Texto vetorial, 100% no dispositivo.
 */
import { jsPDF } from "jspdf";
import { RECEITA_LOGOS } from "@/core/psgo/receita-logos";
import {
  atestadoTitulo,
  atestadoCorpo,
  atestadoCid,
  dataExtenso,
  type AtestadoForm,
} from "./atestado";

// jsPDF (Helvetica padrão, WinAnsi) não tem — → usar hífen.
const UNIDADE = "Hospital de Clínicas da Universidade Federal do Triângulo Mineiro - HC-UFTM";
const ENDERECO = "CNES: 2206595, Av. Getúlio Guarita, 130, N.S. Abadia - Uberaba, MG";

const PAGE_W = 210;
const MARGIN_X = 20;
const CONTENT_W = PAGE_W - 2 * MARGIN_X;
const CX = PAGE_W / 2;

export function buildAtestadoPdf(form: AtestadoForm): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 18;

  // --- Logos (altura fixa, largura pela proporção real) ---
  const logos = RECEITA_LOGOS.filter((l) => l.src);
  const logoH = 13;
  const dims = logos.map((l) => {
    try {
      const p = doc.getImageProperties(l.src);
      return { src: l.src, w: (logoH * p.width) / p.height, fmt: p.fileType };
    } catch {
      return { src: l.src, w: logoH * 2, fmt: "PNG" };
    }
  });
  const totalW = dims.reduce((s, d) => s + d.w, 0);
  const gap = dims.length > 1 ? (CONTENT_W - totalW) / (dims.length + 1) : 0;
  let lx = MARGIN_X + Math.max(gap, 0);
  for (const d of dims) {
    try {
      doc.addImage(d.src, d.fmt, lx, y, d.w, logoH);
    } catch {
      /* ignora logo inválido */
    }
    lx += d.w + Math.max(gap, 6);
  }
  y += logoH + 4;

  doc.setFont("helvetica", "bold").setFontSize(10).setTextColor(20);
  doc.text(UNIDADE, CX, y, { align: "center", maxWidth: CONTENT_W });
  y += 4.5;
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(60);
  doc.text(ENDERECO, CX, y, { align: "center", maxWidth: CONTENT_W });
  y += 3;
  doc.setDrawColor(17).setLineWidth(0.5).line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
  y += 16;

  // --- Título ---
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(17);
  doc.text(atestadoTitulo(form), CX, y, { align: "center" });
  y += 14;

  // --- Corpo (justificado) ---
  doc.setFont("helvetica", "normal").setFontSize(12).setTextColor(17);
  const corpo = doc.splitTextToSize(atestadoCorpo(form), CONTENT_W) as string[];
  doc.text(corpo, MARGIN_X, y, { align: "justify", maxWidth: CONTENT_W, lineHeightFactor: 1.6 });
  y += corpo.length * 12 * 0.352778 * 1.6 + 4;

  const cid = atestadoCid(form);
  if (cid) {
    doc.setFont("helvetica", "bold").setFontSize(11);
    doc.text(cid, MARGIN_X, y);
    y += 8;
  }
  if (form.observacoes.trim()) {
    doc.setFont("helvetica", "normal").setFontSize(11);
    const obs = doc.splitTextToSize(form.observacoes.trim(), CONTENT_W) as string[];
    doc.text(obs, MARGIN_X, y);
    y += obs.length * 5 + 4;
  }

  // --- Local e data ---
  const local = [form.cidade.trim(), dataExtenso(form.data)].filter(Boolean).join(", ");
  y += 12;
  if (local) {
    doc.setFont("helvetica", "normal").setFontSize(12).setTextColor(17);
    doc.text(local, CX, y, { align: "center" });
  }

  // --- Assinatura ---
  y += 24;
  const lineW = CONTENT_W * 0.7;
  doc.setDrawColor(17).setLineWidth(0.3).line(CX - lineW / 2, y, CX + lineW / 2, y);
  doc.setFont("helvetica", "bold").setFontSize(12);
  doc.text("Médico Assistente", CX, y + 5, { align: "center" });

  return doc;
}

/** Gera e baixa/abre o PDF do atestado no dispositivo. */
export function downloadAtestadoPdf(form: AtestadoForm): void {
  const doc = buildAtestadoPdf(form);
  const nome = (form.paciente || "atestado").trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`atestado-${nome}.pdf`);
}
