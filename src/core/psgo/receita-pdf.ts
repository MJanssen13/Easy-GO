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
  momentoText,
  type PrescricaoItem,
  type ReceitaHeader,
  type ReceitaGrupo,
} from "./prescricao";
import { RECEITA_LOGOS } from "@/core/letterhead/logos";

// jsPDF (Helvetica padrão, WinAnsi) não tem —/–/• → usar hífen/·.
const UNIDADE = "Hospital de Clínicas da Universidade Federal do Triângulo Mineiro - HC-UFTM";
const ENDERECO = "CNES: 2206595, Av. Getúlio Guarita, 130, N.S. Abadia - Uberaba, MG";

// Quadro "Identificação do Emitente" do Receituário de Controle Especial.
const EMITENTE_LINHAS = [
  "Hospital de Clínicas da",
  "Universidade Federal do Triângulo Mineiro",
  "Av. Getúlio Guaritá, 130 - Bairro Abadia",
  "Tel.: 3318 5000",
  "Uberaba (MG)",
];

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
    turnoCombo
      ? [turnoCombo, viaText(it), momentoText(it)]
      : [doseText(it), frequenciaText(it), viaText(it), momentoText(it)]
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

// Rodapé (assinatura) fixo: os medicamentos precisam terminar acima disto.
const SIGN_Y = PAGE_H - MARGIN - 10;
const MEDS_LIMIT = SIGN_Y - 3;

/** Desenha a faixa de logos (altura fixa, largura pela proporção). Devolve o y após. */
function drawLogos(doc: jsPDF, col: Col, y: number, logoH: number): number {
  const innerX = col.x + PAD;
  const innerW = col.w - 2 * PAD;
  const logos = RECEITA_LOGOS.filter((l) => l.src);
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
  return y + logoH;
}

/**
 * Cabeçalho da via **simples** (logos → linha "MEDICAMENTOS"). Devolve o y onde
 * os medicamentos começam. Simples é via única (sem "1ª/2ª VIA").
 */
function drawHeader(doc: jsPDF, col: Col, header: ReceitaHeader, grupo: ReceitaGrupo): number {
  const innerX = col.x + PAD;
  const innerW = col.w - 2 * PAD;
  let y = drawLogos(doc, col, MARGIN + 2, 10) + 2.5;

  // --- Unidade + endereço (centralizados) + linha ---
  doc.setFont("helvetica", "bold").setFontSize(7.5).setTextColor(20);
  doc.text(UNIDADE, col.x + col.w / 2, y, { align: "center", maxWidth: innerW });
  y += 3;
  doc.setFont("helvetica", "normal").setFontSize(6.5).setTextColor(60);
  doc.text(ENDERECO, col.x + col.w / 2, y, { align: "center", maxWidth: innerW });
  y += 2.5;
  doc.setDrawColor(17).setLineWidth(0.4).line(col.x + PAD, y, col.x + col.w - PAD, y);
  y += 4;

  // --- Título ---
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(17);
  doc.text(grupo.titulo, innerX, y);
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
  return y + 1;
}

/** Altura de um bloco de medicamento (caixa + espaçamento). */
function medBlockHeight(doc: jsPDF, it: PrescricaoItem, innerW: number): number {
  const detLines = detalheItem(it).flatMap((d) => doc.splitTextToSize(d, innerW - 4) as string[]);
  return 5 + detLines.length * 3.2 + 1.5 + 1.5; // boxH + espaçamento
}

/** Desenha um bloco de medicamento em `y`; devolve o novo y. */
function drawMedBlock(
  doc: jsPDF,
  col: Col,
  y: number,
  it: PrescricaoItem,
  index: number,
): number {
  const innerX = col.x + PAD;
  const innerW = col.w - 2 * PAD;
  const nome = [it.principioAtivo, it.concentracao].map((s) => s.trim()).filter(Boolean).join(" ");
  const detalhes = detalheItem(it);
  const qtd = [it.quantidadeReceitada.trim(), it.formaFarmaceutica.trim()].filter(Boolean).join(" · ");
  const detLines = detalhes.flatMap((d) => doc.splitTextToSize(d, innerW - 4) as string[]);
  const boxH = 5 + detLines.length * 3.2 + 1.5;

  doc.setDrawColor(150).setLineWidth(0.2);
  doc.roundedRect(innerX, y, innerW, boxH, 0.6, 0.6);

  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(17);
  doc.text(`${index + 1}. ${nome || "___"}`, innerX + 1.5, y + 3.6, { maxWidth: innerW - 30 });
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
  return y + boxH + 1.5;
}

/** Assinatura (rodapé de uma via), fixa no fim da coluna. */
function drawSignature(doc: jsPDF, col: Col, header: ReceitaHeader): void {
  const innerW = col.w - 2 * PAD;
  doc.setDrawColor(17).setLineWidth(0.3);
  const lineW = innerW * 0.6;
  const lineX = col.x + col.w / 2 - lineW / 2;
  doc.line(lineX, SIGN_Y, lineX + lineW, SIGN_Y);
  doc.setFont("helvetica", "bold").setFontSize(8.5).setTextColor(17);
  doc.text("Médico Assistente", col.x + col.w / 2, SIGN_Y + 4, { align: "center" });
  const localData = header.mostrarData
    ? [header.cidade.trim(), dataExtenso(header.data)].filter(Boolean).join(", ")
    : "";
  if (localData) {
    doc.setFont("helvetica", "normal").setFontSize(8);
    doc.text(localData, col.x + col.w / 2, SIGN_Y + 8, { align: "center" });
  }
}

/** Campo em linha "RÓTULO: valor" (sem sublinhado). Devolve o novo y. */
function drawInlineField(doc: jsPDF, col: Col, y: number, label: string, value: string): number {
  const innerX = col.x + PAD;
  doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(17);
  doc.text(label, innerX, y);
  const lw = doc.getTextWidth(label);
  if (value) {
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(30);
    doc.text(value, innerX + lw + 1.5, y, { maxWidth: col.w - 2 * PAD - lw - 2 });
  }
  return y + 4.5;
}

/** Rótulo seguido de linha de preenchimento até `xEnd`. */
function labelFill(doc: jsPDF, x: number, y: number, label: string, xEnd: number): void {
  doc.setFont("helvetica", "normal").setFontSize(5.8).setTextColor(30);
  doc.text(label, x, y);
  const lw = doc.getTextWidth(label);
  doc.setDrawColor(17).setLineWidth(0.2);
  doc.line(x + lw + 1, y + 0.4, xEnd, y + 0.4);
}

/** Rodapé do controle especial: assinatura do médico + quadros comprador/fornecedor. */
function drawEspFooter(doc: jsPDF, col: Col, header: ReceitaHeader): void {
  const innerX = col.x + PAD;
  const innerW = col.w - 2 * PAD;
  const boxesH = 30;
  const boxesBottom = PAGE_H - MARGIN;
  const boxesTop = boxesBottom - boxesH;

  // --- Médico Assistente: ____ (data à direita) ---
  const signY = boxesTop - 4;
  doc.setFont("helvetica", "bold").setFontSize(7).setTextColor(17);
  doc.text("Médico Assistente:", innerX, signY);
  const lw = doc.getTextWidth("Médico Assistente:");
  const ld = header.mostrarData
    ? [header.cidade.trim(), dataExtenso(header.data)].filter(Boolean).join(", ")
    : "";
  let dateW = 0;
  if (ld) {
    doc.setFont("helvetica", "normal").setFontSize(7).setTextColor(30);
    dateW = doc.getTextWidth(ld);
    doc.text(ld, col.x + col.w - PAD, signY, { align: "right" });
  }
  doc.setDrawColor(17).setLineWidth(0.3);
  doc.line(innerX + lw + 2, signY + 0.5, col.x + col.w - PAD - (ld ? dateW + 3 : 0), signY + 0.5);

  // --- Quadros comprador / fornecedor ---
  const gap = 3;
  const bw = (innerW - gap) / 2;
  const bx1 = innerX;
  const bx2 = innerX + bw + gap;
  doc.setDrawColor(17).setLineWidth(0.3);
  doc.rect(bx1, boxesTop, bw, boxesH);
  doc.rect(bx2, boxesTop, bw, boxesH);
  doc.setFont("helvetica", "bold").setFontSize(6).setTextColor(17);
  doc.text("IDENTIFICAÇÃO DO COMPRADOR", bx1 + bw / 2, boxesTop + 3, { align: "center" });
  doc.text("IDENTIFICAÇÃO DO FORNECEDOR", bx2 + bw / 2, boxesTop + 3, { align: "center" });
  doc.setDrawColor(17).setLineWidth(0.2);
  doc.line(bx1 + 1, boxesTop + 4, bx1 + bw - 1, boxesTop + 4);
  doc.line(bx2 + 1, boxesTop + 4, bx2 + bw - 1, boxesTop + 4);

  // Campos do comprador (rótulo + linha).
  const cx = bx1 + 1.5;
  const cEnd = bx1 + bw - 1.5;
  const cMid = bx1 + bw * 0.52;
  labelFill(doc, cx, boxesTop + 9, "Nome:", cEnd);
  labelFill(doc, cx, boxesTop + 14, "Ident.:", cMid - 1);
  labelFill(doc, cMid, boxesTop + 14, "órg. Emissor:", cEnd);
  labelFill(doc, cx, boxesTop + 19, "Endereço:", cEnd);
  labelFill(doc, cx, boxesTop + 24, "Cidade:", cMid - 1);
  labelFill(doc, cMid, boxesTop + 24, "UF:", cEnd);
  labelFill(doc, cx, boxesTop + 29, "Telefone:", cEnd);

  // Fornecedor: assinatura do farmacêutico + data.
  doc.setDrawColor(17).setLineWidth(0.2);
  doc.line(bx2 + 5, boxesTop + boxesH - 7.5, bx2 + bw - 5, boxesTop + boxesH - 7.5);
  doc.setFont("helvetica", "normal").setFontSize(5.8).setTextColor(30);
  doc.text("Assinatura do Farmacêutico", bx2 + bw / 2, boxesTop + boxesH - 5, { align: "center" });
  doc.text("Data: ____ / ____ / ____", bx2 + bw - 2, boxesTop + boxesH - 1.5, { align: "right" });
}

/**
 * Uma via completa do **Receituário de Controle Especial** (Portaria 344/98):
 * logos, título, quadro do emitente + vias, Paciente, Endereço, Prescrição,
 * medicamentos e o rodapé (assinatura do médico + comprador/fornecedor).
 */
function drawColunaEspecial(doc: jsPDF, col: Col, header: ReceitaHeader, grupo: ReceitaGrupo): void {
  const innerX = col.x + PAD;
  const innerW = col.w - 2 * PAD;
  let y = drawLogos(doc, col, MARGIN + 2, 9) + 5;

  // --- Título (ajusta a fonte para caber na largura da via) + linha ---
  doc.setFont("helvetica", "bold").setTextColor(17);
  let ts = 9;
  doc.setFontSize(ts);
  while (ts > 6 && doc.getTextWidth(grupo.titulo) > innerW) {
    ts -= 0.5;
    doc.setFontSize(ts);
  }
  doc.text(grupo.titulo, col.x + col.w / 2, y, { align: "center" });
  y += 1.5;
  doc.setDrawColor(17).setLineWidth(0.4).line(innerX, y, col.x + col.w - PAD, y);
  y += 3.5;

  // --- Quadro "Identificação do Emitente" + vias ---
  const boxW = innerW * 0.62;
  const boxTop = y;
  const emitTitleH = 3;
  const lineH = 2.7;
  const boxH = 2.4 + emitTitleH + EMITENTE_LINHAS.length * lineH;
  doc.setDrawColor(17).setLineWidth(0.3).rect(innerX, boxTop, boxW, boxH);
  doc.setFont("helvetica", "bold").setFontSize(6).setTextColor(17);
  doc.text("IDENTIFICAÇÃO DO EMITENTE", innerX + boxW / 2, boxTop + 2.6, { align: "center" });
  doc.setFont("helvetica", "normal").setFontSize(6.3).setTextColor(40);
  let ey = boxTop + emitTitleH + 2.4;
  for (const ln of EMITENTE_LINHAS) {
    doc.text(ln, innerX + boxW / 2, ey, { align: "center", maxWidth: boxW - 2 });
    ey += lineH;
  }
  doc.setFont("helvetica", "normal").setFontSize(5.6).setTextColor(60);
  const viasX = col.x + col.w - PAD;
  doc.text("1ª VIA - RETENÇÃO NA FARMÁCIA OU DROGARIA", viasX, boxTop + 3, { align: "right" });
  doc.text("2ª VIA - ORIENTAÇÃO AO PACIENTE", viasX, boxTop + 5.4, { align: "right" });
  y = boxTop + boxH + 3;

  // --- Paciente / Endereço / Prescrição (rótulos do mesmo tamanho) ---
  y = drawInlineField(doc, col, y, "PACIENTE:", (header.paciente || "").toUpperCase());
  y = drawInlineField(doc, col, y, "ENDEREÇO:", header.endereco.trim());
  y = section(doc, col, y, "PRESCRIÇÃO") + 1;

  // --- Medicamentos ---
  grupo.items.forEach((it, i) => {
    y = drawMedBlock(doc, col, y, it, i);
  });

  drawEspFooter(doc, col, header);
}

/**
 * Receita simples: **via única**, sem espelhar. Os medicamentos preenchem a
 * coluna esquerda; ao exceder, seguem na coluna da direita e, então, em nova
 * folha. Cada coluna preenchida recebe cabeçalho e assinatura.
 */
function drawSimples(doc: jsPDF, header: ReceitaHeader, grupo: ReceitaGrupo): void {
  const cols = [LEFT, RIGHT];
  const innerW = LEFT.w - 2 * PAD;
  let ci = 0;
  let col = cols[ci];
  let y = drawHeader(doc, col, header, grupo);
  let colHasMed = false;
  grupo.items.forEach((it, i) => {
    const h = medBlockHeight(doc, it, innerW);
    if (colHasMed && y + h > MEDS_LIMIT) {
      drawSignature(doc, col, header);
      ci += 1;
      if (ci > 1) {
        doc.addPage("a4", "landscape");
        drawDivider(doc);
        ci = 0;
      }
      col = cols[ci];
      y = drawHeader(doc, col, header, grupo);
      colHasMed = false;
    }
    y = drawMedBlock(doc, col, y, it, i);
    colHasMed = true;
  });
  drawSignature(doc, col, header);
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

/**
 * Monta o PDF da receita. Cada grupo (S1, S2… / E1, E2…) começa numa nova folha.
 * Especial = 2 vias espelhadas (1ª/2ª via). Simples = via única, transbordando
 * para a coluna ao lado e depois nova folha.
 */
export function buildReceitaPdf(header: ReceitaHeader, items: PrescricaoItem[]): jsPDF {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  receitaGrupos(items).forEach((g, idx) => {
    if (idx > 0) doc.addPage("a4", "landscape");
    drawDivider(doc);
    if (g.tipo === "ESPECIAL") {
      drawColunaEspecial(doc, LEFT, header, g);
      drawColunaEspecial(doc, RIGHT, header, g);
    } else {
      drawSimples(doc, header, g);
    }
  });
  return doc;
}

/** Gera e baixa/abre o PDF da receita no dispositivo. */
export function downloadReceitaPdf(header: ReceitaHeader, items: PrescricaoItem[]): void {
  const doc = buildReceitaPdf(header, items);
  const nome = header.paciente.trim();
  doc.save(nome ? `receita ${nome}.pdf` : "receita.pdf");
}
