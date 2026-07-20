/**
 * Geração da receita em **PDF real** (jsPDF), para dispositivos móveis onde a
 * impressão do navegador falha. Reproduz o layout do `receita-print` (A4
 * paisagem, 2 vias lado a lado, logos + unidade, PACIENTE / MEDICAMENTOS e
 * assinatura). Texto vetorial (nítido, arquivo leve), 100% no dispositivo.
 */
import { jsPDF } from "jspdf";
import {
  receitaGrupos,
  doseText,
  frequenciaText,
  duracaoText,
  viaText,
  turnoDoseText,
  type PrescricaoItem,
  type ReceitaHeader,
  type ReceitaGrupo,
} from "./prescricao";
import { RECEITA_LOGOS } from "./receita-logos";

// jsPDF (Helvetica padrão, WinAnsi) não tem —/–/• → usar hífen/·.
const UNIDADE = "Hospital de Clínicas da Universidade Federal do Triângulo Mineiro - HC-UFTM";
const ENDERECO = "CNES: 2206595, Av. Getúlio Guarita, 130, N.S. Abadia - Uberaba, MG";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
function dataExtenso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

// A4 paisagem (mm).
const PAGE_W = 297;
const PAGE_H = 210;
const MARGIN = 8;
const CENTER = PAGE_W / 2;
const GUTTER = 4; // meia-distância até a divisória central

interface Col {
  x: number;
  w: number;
}
const LEFT: Col = { x: MARGIN, w: CENTER - GUTTER - MARGIN };
const RIGHT: Col = { x: CENTER + GUTTER, w: PAGE_W - MARGIN - (CENTER + GUTTER) };

const PAD = 4; // padding interno da coluna

function detalheItem(it: PrescricaoItem): string[] {
  if (it.registroManual) {
    const out = [it.posologiaManual.trim()].filter(Boolean);
    if (it.recomendacoes.trim()) out.push(`Recomendações: ${it.recomendacoes.trim()}`);
    return out;
  }
  const turnoCombo = turnoDoseText(it);
  const linha1 = (
    turnoCombo ? [turnoCombo, viaText(it)] : [doseText(it), frequenciaText(it), viaText(it)]
  )
    .filter(Boolean)
    .join(" · ");
  const dur = it.usoContinuo ? "uso contínuo" : duracaoText(it);
  const out: string[] = [];
  if (linha1) out.push(linha1);
  if (dur) out.push(it.usoContinuo ? dur : `Durante ${dur}`);
  if (it.recomendacoes.trim()) out.push(`Recomendações: ${it.recomendacoes.trim()}`);
  return out;
}

/** Desenha uma via (coluna) e devolve nada; posiciona a assinatura no rodapé. */
function drawColuna(doc: jsPDF, col: Col, header: ReceitaHeader, grupo: ReceitaGrupo): void {
  const innerX = col.x + PAD;
  const innerW = col.w - 2 * PAD;
  let y = MARGIN + 2;

  // --- Logos (altura fixa, largura pela proporção real) ---
  const logos = RECEITA_LOGOS.filter((l) => l.src);
  const logoH = 10;
  const dims = logos.map((l) => {
    try {
      const p = doc.getImageProperties(l.src);
      return { src: l.src, w: (logoH * p.width) / p.height, fmt: p.fileType };
    } catch {
      return { src: l.src, w: logoH * 2, fmt: "PNG" };
    }
  });
  const totalLogoW = dims.reduce((s, d) => s + d.w, 0);
  const gap = dims.length > 1 ? (innerW - totalLogoW) / (dims.length + 1) : 0;
  let lx = innerX + Math.max(gap, 0);
  for (const d of dims) {
    try {
      doc.addImage(d.src, d.fmt, lx, y, d.w, logoH);
    } catch {
      /* ignora logo inválido */
    }
    lx += d.w + Math.max(gap, 4);
  }
  y += logoH + 2.5;

  // --- Unidade + endereço (centralizados) + linha ---
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(20);
  doc.text(UNIDADE, col.x + col.w / 2, y, { align: "center", maxWidth: innerW });
  y += 3;
  doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(60);
  doc.text(ENDERECO, col.x + col.w / 2, y, { align: "center", maxWidth: innerW });
  y += 2.5;
  doc.setDrawColor(17).setLineWidth(0.4).line(col.x + PAD, y, col.x + col.w - PAD, y);
  y += 4;

  // --- Título + vias ---
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(17);
  doc.text(grupo.titulo, innerX, y);
  doc.setFont("helvetica", "normal").setFontSize(5.6).setTextColor(60);
  doc.text("1ª VIA - RETENÇÃO NA FARMÁCIA OU DROGARIA", col.x + col.w - PAD, y - 2, { align: "right" });
  doc.text("2ª VIA - ORIENTAÇÃO AO PACIENTE", col.x + col.w - PAD, y + 0.4, { align: "right" });
  y += 4;

  // --- PACIENTE ---
  y = section(doc, col, y, "PACIENTE");
  doc.setTextColor(17);
  doc.setFont("helvetica", "bold").setFontSize(9);
  doc.text((header.paciente || "").toUpperCase(), innerX, y);
  y += 4;
  const sub = [
    header.prontuario.trim() ? `Prontuário: ${header.prontuario.trim()}` : "",
    header.idade.trim() ? `Idade: ${header.idade.trim()}` : "",
  ]
    .filter(Boolean)
    .join("   •   ");
  if (sub) {
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(sub, innerX, y);
    y += 4;
  }
  y += 1;

  // --- MEDICAMENTOS ---
  y = section(doc, col, y, "MEDICAMENTOS");
  y += 1;
  grupo.items.forEach((it, i) => {
    const nome = [it.principioAtivo, it.concentracao].map((s) => s.trim()).filter(Boolean).join(" ");
    const detalhes = detalheItem(it);
    const qtd = [it.quantidadeReceitada.trim(), it.formaFarmaceutica.trim()].filter(Boolean).join(" · ");

    // Altura estimada do bloco.
    const detLines = detalhes.flatMap((d) => doc.splitTextToSize(d, innerW - 4) as string[]);
    const boxH = 5 + detLines.length * 3.2 + 1.5;

    doc.setDrawColor(150).setLineWidth(0.2);
    doc.roundedRect(innerX, y, innerW, boxH, 0.6, 0.6);

    doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(17);
    doc.text(`${i + 1}. ${nome || "___"}`, innerX + 1.5, y + 3.6, { maxWidth: innerW - 30 });
    if (qtd) {
      doc.setFont("helvetica", "normal").setFontSize(7.5).setTextColor(60);
      doc.text(qtd, innerX + innerW - 1.5, y + 3.6, { align: "right" });
    }
    doc.setFont("helvetica", "normal").setFontSize(7.6).setTextColor(34);
    let dy = y + 7;
    for (const ln of detLines) {
      doc.text(ln, innerX + 1.5, dy);
      dy += 3.2;
    }
    y += boxH + 1.5;
  });

  // --- Assinatura (rodapé da via) ---
  const signY = PAGE_H - MARGIN - 10;
  doc.setDrawColor(17).setLineWidth(0.3);
  const lineW = innerW * 0.6;
  const lineX = col.x + col.w / 2 - lineW / 2;
  doc.line(lineX, signY, lineX + lineW, signY);
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(17);
  doc.text("Médico Assistente", col.x + col.w / 2, signY + 4, { align: "center" });
  const localData = [header.cidade.trim(), dataExtenso(header.data)].filter(Boolean).join(", ");
  if (localData) {
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(localData, col.x + col.w / 2, signY + 8, { align: "center" });
  }
}

/** Cabeçalho de seção (rótulo + sublinhado). Devolve o novo y. */
function section(doc: jsPDF, col: Col, y: number, label: string): number {
  doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(17);
  doc.text(label, col.x + PAD, y);
  y += 1;
  doc.setDrawColor(17).setLineWidth(0.2).line(col.x + PAD, y, col.x + col.w - PAD, y);
  return y + 4;
}

/** Divisória tracejada central da folha. */
function drawDivider(doc: jsPDF): void {
  doc.setDrawColor(150).setLineWidth(0.2);
  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([1.2, 1.2], 0);
  doc.line(CENTER, MARGIN, CENTER, PAGE_H - MARGIN);
  if (typeof doc.setLineDashPattern === "function") doc.setLineDashPattern([], 0);
}

/** Monta o PDF da receita (uma folha por tipo, 2 vias). */
export function buildReceitaPdf(header: ReceitaHeader, items: PrescricaoItem[]): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const grupos = receitaGrupos(items);
  const pages = grupos.length ? grupos : [];
  pages.forEach((g, idx) => {
    if (idx > 0) doc.addPage("a4", "landscape");
    drawColuna(doc, LEFT, header, g);
    drawColuna(doc, RIGHT, header, g);
    drawDivider(doc);
  });
  return doc;
}

/** Gera e baixa/abre o PDF da receita no dispositivo. */
export function downloadReceitaPdf(header: ReceitaHeader, items: PrescricaoItem[]): void {
  const doc = buildReceitaPdf(header, items);
  const nome = (header.paciente || "receita").trim().replace(/\s+/g, "-").toLowerCase();
  doc.save(`receita-${nome}.pdf`);
}
