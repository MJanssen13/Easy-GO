/**
 * Layout de impressão da receita (A4), inspirado no receituário do e-SUS APS:
 * duas vias lado a lado (1ª retenção na farmácia / 2ª orientação ao paciente),
 * com faixa de logos + identificação da unidade, seções PACIENTE / MEDICAMENTOS
 * (medicamento em quadro) e assinatura ("Médico Assistente" + carimbo). Cada via
 * ocupa a folha inteira.
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

const UNIDADE = "Hospital de Clínicas da Universidade Federal do Triângulo Mineiro — HC-UFTM";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const e = (s: string) => escapeHtml(s.trim());

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
      <span class="med-q">${qtd ? e(qtd) : "&nbsp;"}${forma ? `<span class="med-f"> · ${e(forma)}</span>` : ""}</span>
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

/** Uma coluna (via) da receita, ocupando a folha inteira. */
function coluna(header: ReceitaHeader, grupo: ReceitaGrupo, lado: "left" | "right"): string {
  const paciente = [
    e(header.paciente) || "&nbsp;",
    [header.prontuario.trim() ? `Prontuário: ${e(header.prontuario)}` : "", header.idade.trim() ? `Idade: ${e(header.idade)}` : ""]
      .filter(Boolean)
      .join(" • "),
  ]
    .filter((s) => s.trim())
    .join("<br>");
  const meds = grupo.items.map((it, i) => medHtml(it, i + 1)).join("");

  return `<div class="col ${lado}">
    <div class="top">
      <div class="logos">${logosHtml()}</div>
      <div class="unidade">${e(UNIDADE)}</div>
    </div>
    <div class="titrow">
      <div class="rec">${e(grupo.titulo)}</div>
      <div class="vias">1ª VIA – RETENÇÃO NA FARMÁCIA OU DROGARIA<br>2ª VIA – ORIENTAÇÃO AO PACIENTE</div>
    </div>
    <div class="sec"><div class="sec-t">PACIENTE</div><div class="sec-b">${paciente || "&nbsp;"}</div></div>
    <div class="sec"><div class="sec-t">MEDICAMENTOS</div><div class="meds">${meds}</div></div>
    ${grupo.tipo === "ESPECIAL" ? identEspecial() : ""}
    <div class="grow"></div>
    <div class="sign">
      <div class="line"></div>
      <div class="nm">Médico Assistente</div>
      <div class="carimbo">(Carimbo, local e data)</div>
    </div>
  </div>`;
}

// Folha em PAISAGEM (2 vias lado a lado). Altura útil ≈ 210 − 16 = 194 mm; cada
// via ocupa essa altura por inteiro (assinatura ancorada no rodapé da via).
const STYLE = `
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: "Segoe UI", -apple-system, Arial, sans-serif; font-size: 8.5pt; line-height: 1.3; }
  .sheet { display: flex; page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .col { flex: 1 1 0; min-width: 0; padding: 4mm 6mm; display: flex; flex-direction: column; min-height: 192mm; }
  .col.left { border-right: 1px dashed #999; }
  .top { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 2mm; margin-bottom: 2mm; }
  .logos { display: flex; align-items: center; justify-content: center; gap: 4mm; }
  .logo { height: 11mm; width: auto; }
  .logo-ph { display: inline-flex; align-items: center; justify-content: center; height: 9mm; min-width: 14mm; padding: 0 1.5mm; border: 1px solid #99a; border-radius: 2px; font-size: 7pt; font-weight: 700; color: #446; }
  .unidade { margin-top: 1.5mm; font-size: 7.5pt; font-weight: 600; }
  .titrow { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1mm; }
  .rec { font-size: 11pt; font-weight: 700; }
  .vias { font-size: 5.8pt; text-align: right; color: #333; }
  .sec { margin-top: 1.5mm; }
  .sec-t { font-size: 7pt; font-weight: 700; letter-spacing: .04em; border-bottom: 1px solid #111; padding-bottom: 0.5mm; }
  .sec-b { padding: 0.8mm 1mm 0; }
  .meds { padding-top: 1mm; }
  .med { border: 1px solid #999; border-radius: 2px; padding: 1mm 1.5mm; margin-bottom: 1mm; }
  .med-h { display: flex; justify-content: space-between; gap: 2mm; }
  .med-n { font-weight: 600; }
  .med-q { text-align: right; white-space: nowrap; }
  .med-f { color: #444; }
  .med-d { margin-top: 0.4mm; color: #222; }
  .ident { padding-top: 0.8mm; }
  .ident .ln { border-bottom: 1px solid #ccc; padding: 1.6mm 0 0.3mm; }
  .grow { flex: 1 1 auto; min-height: 6mm; }
  .sign { text-align: center; margin-bottom: 4mm; }
  .sign .line { width: 62%; border-top: 1px solid #111; margin: 0 auto 1mm; }
  .sign .nm { font-weight: 600; }
  .sign .carimbo { margin-top: 6mm; font-size: 7pt; color: #777; }
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
