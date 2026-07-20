/**
 * Layout de impressão da receita (A4), gerado no cliente. Uma folha por via
 * (controle especial = 2 vias) com cabeçalho do estabelecimento, quadro do
 * paciente, itens numerados (medicamento em destaque + posologia + quantidade),
 * identificação do comprador/fornecedor (controle especial) e assinatura.
 *
 * No e-SUS a impressão é um PDF gerado no servidor; aqui montamos um HTML
 * autocontido para o diálogo de impressão do navegador (→ PDF).
 */
import {
  receitaGrupos,
  medicamentoLabel,
  buildPosologia,
  type PrescricaoItem,
  type ReceitaHeader,
  type ReceitaGrupo,
} from "./prescricao";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const up = (s: string) => escapeHtml(s.trim().toUpperCase());

function dateBR(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

function pacienteBox(header: ReceitaHeader): string {
  return `<div class="pac">
      <div><span class="lbl">Paciente:</span> ${up(header.paciente) || "&nbsp;"}</div>
      <div class="pacrow">
        <span><span class="lbl">Prontuário:</span> ${up(header.prontuario) || "&nbsp;"}</span>
        <span><span class="lbl">Idade:</span> ${up(header.idade) || "&nbsp;"}</span>
      </div>
    </div>`;
}

function itemsHtml(grupo: ReceitaGrupo): string {
  return grupo.items
    .map((it) => {
      const med = up(medicamentoLabel(it)) || "___";
      const pos = up(buildPosologia(it));
      const qt = it.quantidadeReceitada.trim() ? `QUANTIDADE: ${up(it.quantidadeReceitada)}` : "";
      const posQt = [pos, qt].filter(Boolean).join(" &nbsp;•&nbsp; ");
      const obs = it.recomendacoes.trim() ? `<div class="obs">OBS: ${up(it.recomendacoes)}</div>` : "";
      return `<li class="item"><div class="med">${med}</div>${
        posQt ? `<div class="pos">${posQt}</div>` : ""
      }${obs}</li>`;
    })
    .join("");
}

const IDENT_ESPECIAL = `<div class="ident">
    <div class="identbox">
      <div class="identtitle">IDENTIFICAÇÃO DO COMPRADOR</div>
      <div class="ln">Nome:</div><div class="ln">RG / Órgão emissor:</div>
      <div class="ln">Endereço:</div><div class="ln">Telefone:</div>
    </div>
    <div class="identbox">
      <div class="identtitle">IDENTIFICAÇÃO DO FORNECEDOR</div>
      <div class="ln">&nbsp;</div><div class="ln">&nbsp;</div>
      <div class="ln">Data: ___/___/______</div><div class="ln">Assinatura do farmacêutico</div>
    </div>
  </div>`;

function printPage(header: ReceitaHeader, grupo: ReceitaGrupo, viaLabel: string): string {
  const local = [header.cidade.trim(), dateBR(header.data)].filter(Boolean).join(", ");
  return `<section class="page">
    <header class="hd">
      <div class="estab">${up(header.estabelecimento) || "&nbsp;"}</div>
      <div class="titulo">${escapeHtml(grupo.titulo)}</div>
      ${viaLabel ? `<div class="via">${escapeHtml(viaLabel)}</div>` : ""}
    </header>
    ${pacienteBox(header)}
    <ol class="items">${itemsHtml(grupo)}</ol>
    ${grupo.tipo === "ESPECIAL" ? IDENT_ESPECIAL : ""}
    <footer class="ft">
      <div class="local">${up(local)}</div>
      <div class="assin">
        <div class="line"></div>
        <div>${up(header.prescritor) || "&nbsp;"}${
          header.crm.trim() ? ` — CRM ${up(header.crm)}` : ""
        }</div>
      </div>
    </footer>
  </section>`;
}

const STYLE = `
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: "Segoe UI", -apple-system, Arial, sans-serif; font-size: 11.5pt; line-height: 1.4; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .hd { text-align: center; border-bottom: 2px solid #111; padding-bottom: 4mm; margin-bottom: 5mm; }
  .estab { font-size: 13pt; font-weight: 700; letter-spacing: .02em; }
  .titulo { font-size: 10pt; font-weight: 700; color: #333; margin-top: 1mm; }
  .via { font-size: 8.5pt; font-weight: 700; letter-spacing: .08em; color: #555; margin-top: 1mm; }
  .pac { border: 1px solid #999; border-radius: 3px; padding: 3mm 4mm; margin-bottom: 6mm; font-size: 11pt; }
  .pac .pacrow { display: flex; gap: 12mm; margin-top: 1.5mm; }
  .lbl { font-weight: 700; }
  .items { list-style: none; margin: 0; padding: 0; counter-reset: item; }
  .item { padding: 2.5mm 0 2.5mm 8mm; border-bottom: 1px dotted #bbb; position: relative; counter-increment: item; }
  .item:last-child { border-bottom: none; }
  .item::before { content: counter(item) ")"; position: absolute; left: 0; font-weight: 700; }
  .med { font-weight: 700; font-size: 11.5pt; }
  .pos { margin-top: 0.5mm; }
  .obs { margin-top: 0.5mm; font-size: 10pt; color: #333; }
  .ident { display: flex; gap: 6mm; margin-top: 8mm; }
  .identbox { flex: 1; border: 1px solid #999; border-radius: 3px; padding: 3mm; font-size: 9.5pt; }
  .identtitle { font-weight: 700; font-size: 8.5pt; letter-spacing: .05em; margin-bottom: 2mm; }
  .ln { border-bottom: 1px solid #ccc; padding: 2mm 0 0.5mm; }
  .ft { margin-top: 14mm; text-align: center; }
  .local { font-size: 10.5pt; margin-bottom: 12mm; }
  .assin { font-size: 11pt; }
  .assin .line { width: 70mm; border-top: 1px solid #111; margin: 0 auto 1mm; }
`;

/** HTML autocontido da receita para impressão (uma folha por via). */
export function buildReceitaPrintHtml(header: ReceitaHeader, items: PrescricaoItem[]): string {
  const grupos = receitaGrupos(items);
  const pages: string[] = [];
  for (const g of grupos) {
    for (let via = 1; via <= g.vias; via++) {
      const viaLabel = g.vias > 1 ? `${via}ª VIA — ${via === 1 ? "FARMÁCIA" : "PACIENTE"}` : "";
      pages.push(printPage(header, g, viaLabel));
    }
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Receita</title>
<style>${STYLE}</style></head><body>${pages.join("")}</body></html>`;
}
