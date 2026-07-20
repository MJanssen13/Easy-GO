/**
 * Layout de impressão da receita (A4), inspirado no receituário do e-SUS APS:
 * duas vias lado a lado (1ª retenção na farmácia / 2ª orientação ao paciente),
 * com faixa de logos, cabeçalho institucional, seções EMITENTE / CIDADÃO /
 * MEDICAMENTOS (medicamento em quadro), assinatura e rodapé "Impresso em…".
 *
 * No e-SUS o PDF é gerado no servidor (JasperReports); aqui montamos um HTML
 * autocontido para o diálogo de impressão do navegador (→ PDF).
 */
import {
  receitaGrupos,
  doseText,
  frequenciaText,
  duracaoText,
  viaText,
  type PrescricaoItem,
  type ReceitaHeader,
  type ReceitaGrupo,
} from "./prescricao";
import { RECEITA_LOGOS } from "./receita-logos";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const e = (s: string) => escapeHtml(s.trim());

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];
function dataExtenso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}
function agora(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} às ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// Linhas do bloco institucional (canto superior direito). Ajustável ao serviço.
const INSTITUICAO = [
  "MINISTÉRIO DA EDUCAÇÃO",
  "EBSERH — REDE HU-BRASIL",
  "UNIVERSIDADE FEDERAL DO TRIÂNGULO MINEIRO",
];

// Faixa de logos: usa imagens (data-URI) quando disponíveis; senão, um selo.
function logosHtml(): string {
  return RECEITA_LOGOS.map((l) =>
    l.src
      ? `<img class="logo" src="${l.src}" alt="${e(l.nome)}" />`
      : `<span class="logo-ph">${e(l.sigla)}</span>`,
  ).join("");
}

function itemDetalhe(it: PrescricaoItem): string {
  if (it.registroManual) {
    const rec = it.recomendacoes.trim() ? `<div>Recomendações: ${e(it.recomendacoes)}</div>` : "";
    return `<div>${e(it.posologiaManual)}</div>${rec}`;
  }
  const linha1 = [doseText(it), frequenciaText(it), viaText(it)].filter(Boolean).map(e).join(" • ");
  const dur = duracaoText(it);
  const rec = it.recomendacoes.trim();
  return `${linha1 ? `<div>${linha1}</div>` : ""}${
    dur ? `<div>Durante ${e(dur)}</div>` : ""
  }${rec ? `<div>Recomendações: ${e(rec)}</div>` : ""}`;
}

function medHtml(it: PrescricaoItem, index: number): string {
  const nome = [it.principioAtivo, it.concentracao].map((s) => s.trim()).filter(Boolean).join(" ");
  const qtd = it.quantidadeReceitada.trim();
  const forma = it.formaFarmaceutica.trim();
  return `<div class="med">
    <div class="med-h">
      <span class="med-n">${index}. ${e(nome) || "___"}</span>
      <span class="med-q">${qtd ? e(qtd) : "&nbsp;"}${forma ? `<br><span class="med-f">${e(forma)}</span>` : ""}</span>
    </div>
    <div class="med-d">${itemDetalhe(it)}</div>
  </div>`;
}

function identEspecial(): string {
  return `<div class="sec"><div class="sec-t">IDENTIFICAÇÃO DO COMPRADOR</div>
      <div class="ident"><div class="ln">Nome:</div><div class="ln">RG / Órgão emissor:</div>
      <div class="ln">Endereço:</div><div class="ln">Telefone:</div></div></div>
    <div class="sec"><div class="sec-t">IDENTIFICAÇÃO DO FORNECEDOR</div>
      <div class="ident"><div class="ln">Data: ___/___/______</div>
      <div class="ln">Assinatura do farmacêutico</div></div></div>`;
}

/** Uma coluna (via) da receita. */
function coluna(header: ReceitaHeader, grupo: ReceitaGrupo, lado: "left" | "right"): string {
  const emitente = [
    e(header.prescritor) + (header.crm.trim() ? ` — CRM ${e(header.crm)}` : ""),
    e(header.estabelecimento),
  ]
    .filter((s) => s.trim())
    .join("<br>");
  const cidadao = [
    e(header.paciente) || "&nbsp;",
    [header.prontuario.trim() ? `Prontuário: ${e(header.prontuario)}` : "", header.idade.trim() ? `Idade: ${e(header.idade)}` : ""]
      .filter(Boolean)
      .join(" • "),
  ]
    .filter((s) => s.trim())
    .join("<br>");
  const meds = grupo.items.map((it, i) => medHtml(it, i + 1)).join("");
  const local = [e(header.cidade), dataExtenso(header.data)].filter(Boolean).join(", ");

  return `<div class="col ${lado}">
    <div class="hdr">
      <div class="logos">${logosHtml()}</div>
      <div class="inst">${INSTITUICAO.map(e).join("<br>")}${
        header.estabelecimento.trim() ? `<br>${e(header.estabelecimento)}` : ""
      }</div>
    </div>
    <div class="titrow">
      <div class="rec">${e(grupo.titulo)}</div>
      <div class="vias">1ª VIA – RETENÇÃO NA FARMÁCIA OU DROGARIA<br>2ª VIA – ORIENTAÇÃO AO PACIENTE</div>
    </div>
    <div class="sec"><div class="sec-t">EMITENTE</div><div class="sec-b">${emitente || "&nbsp;"}</div></div>
    <div class="sec"><div class="sec-t">CIDADÃO</div><div class="sec-b">${cidadao || "&nbsp;"}</div></div>
    <div class="sec"><div class="sec-t">MEDICAMENTOS</div><div class="meds">${meds}</div></div>
    ${grupo.tipo === "ESPECIAL" ? identEspecial() : ""}
    <div class="sign">
      <div class="line"></div>
      <div class="nm">${e(header.prescritor) || "&nbsp;"}</div>
      ${local ? `<div class="dt">${local}</div>` : ""}
    </div>
    <div class="foot">
      <span>Impresso em ${agora()}${header.prescritor.trim() ? ` por ${e(header.prescritor)}` : ""}.</span>
      <span>1 / 1</span>
    </div>
  </div>`;
}

const STYLE = `
  @page { size: A4; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: "Segoe UI", -apple-system, Arial, sans-serif; font-size: 8pt; line-height: 1.35; }
  .sheet { display: flex; page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .col { flex: 1 1 0; min-width: 0; padding: 3mm 4mm; }
  .col.left { border-right: 1px dashed #999; }
  .hdr { display: flex; justify-content: space-between; align-items: flex-start; gap: 3mm; }
  .logos { display: flex; align-items: center; gap: 2mm; }
  .logo { height: 9mm; width: auto; }
  .logo-ph { display: inline-flex; align-items: center; justify-content: center; height: 8mm; min-width: 12mm; padding: 0 1.5mm; border: 1px solid #99a; border-radius: 2px; font-size: 6.5pt; font-weight: 700; color: #446; }
  .inst { font-size: 5.8pt; text-align: right; color: #222; line-height: 1.25; }
  .titrow { display: flex; justify-content: space-between; align-items: flex-end; margin: 2mm 0 1mm; }
  .rec { font-size: 11pt; font-weight: 700; }
  .vias { font-size: 5.8pt; text-align: right; color: #333; }
  .sec { margin-top: 2mm; }
  .sec-t { font-size: 7pt; font-weight: 700; letter-spacing: .04em; border-bottom: 1px solid #111; padding-bottom: 0.6mm; }
  .sec-b { padding: 1mm 1mm 0; }
  .meds { padding-top: 1mm; }
  .med { border: 1px solid #999; border-radius: 2px; padding: 1.5mm 2mm; margin-bottom: 1.5mm; }
  .med-h { display: flex; justify-content: space-between; gap: 2mm; }
  .med-n { font-weight: 600; }
  .med-q { text-align: right; white-space: nowrap; }
  .med-f { color: #444; }
  .med-d { margin-top: 1mm; color: #222; }
  .ident { padding-top: 1mm; }
  .ident .ln { border-bottom: 1px solid #ccc; padding: 1.8mm 0 0.4mm; }
  .sign { text-align: center; margin-top: 8mm; }
  .sign .line { width: 60%; border-top: 1px solid #111; margin: 0 auto 1mm; }
  .sign .nm { font-weight: 600; }
  .sign .dt { margin-top: 0.5mm; }
  .foot { display: flex; justify-content: space-between; font-size: 5.8pt; color: #666; border-top: 1px solid #ddd; margin-top: 6mm; padding-top: 1mm; }
`;

/** HTML autocontido da receita para impressão (uma folha por tipo, 2 vias). */
export function buildReceitaPrintHtml(header: ReceitaHeader, items: PrescricaoItem[]): string {
  const grupos = receitaGrupos(items);
  const sheets = grupos
    .map(
      (g) => `<div class="sheet">${coluna(header, g, "left")}${coluna(header, g, "right")}</div>`,
    )
    .join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Receita</title>
<style>${STYLE}</style></head><body>${sheets}</body></html>`;
}
