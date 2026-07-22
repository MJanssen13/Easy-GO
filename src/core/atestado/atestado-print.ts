/**
 * Impressão dos atestados/declarações no **mesmo modelo da receita**: A4
 * **paisagem**, cada documento ocupando **um dos lados** (coluna) da folha, com
 * o timbre do HC-UFTM (logos + unidade + CNES), corpo justificado e assinatura
 * "Médico Assistente". Vários documentos → 2 por folha (lado a lado).
 */
import { RECEITA_LOGOS } from "@/core/psgo/receita-logos";
import {
  atestadoTitulo,
  atestadoCorpo,
  atestadoCid,
  dataExtenso,
  type AtestadoForm,
} from "./atestado";

const UNIDADE = "Hospital de Clínicas da Universidade Federal do Triângulo Mineiro — HC-UFTM";
const ENDERECO = "CNES: 2206595, Av. Getúlio Guarita, 130, N.S. Abadia - Uberaba, MG";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const e = (s: string) => escapeHtml(s.trim());

function logosHtml(): string {
  return RECEITA_LOGOS.map((l) =>
    l.src
      ? `<img class="logo" src="${l.src}" alt="${e(l.nome)}" />`
      : `<span class="logo-ph">${e(l.sigla)}</span>`,
  ).join("");
}

/** Uma coluna (um documento) ocupando a folha inteira. */
function coluna(form: AtestadoForm, lado: "left" | "right"): string {
  const cid = atestadoCid(form);
  const local = [e(form.cidade), dataExtenso(form.data)].filter(Boolean).join(", ");
  return `<div class="col ${lado}">
    <div class="top">
      <div class="logos">${logosHtml()}</div>
      <div class="unidade">${e(UNIDADE)}</div>
      <div class="endereco">${e(ENDERECO)}</div>
    </div>
    <h1>${e(atestadoTitulo(form))}</h1>
    <div class="corpo">${e(atestadoCorpo(form))}</div>
    ${cid ? `<div class="cid">${e(cid)}</div>` : ""}
    ${form.observacoes.trim() ? `<div class="obs">${e(form.observacoes)}</div>` : ""}
    <div class="grow"></div>
    ${local ? `<div class="local">${local}</div>` : ""}
    <div class="sign">
      <div class="line"></div>
      <div class="nm">Médico Assistente</div>
    </div>
  </div>`;
}

const EMPTY_COL = `<div class="col right empty"></div>`;

const STYLE = `
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: "Segoe UI", -apple-system, Arial, sans-serif; font-size: 11pt; line-height: 1.5; }
  .sheet { display: flex; page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .col { flex: 1 1 0; min-width: 0; padding: 6mm 8mm; display: flex; flex-direction: column; min-height: 192mm; }
  .col.left { border-right: 1px dashed #999; }
  .col.empty { }
  .top { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 2.5mm; margin-bottom: 8mm; }
  .logos { display: flex; align-items: center; justify-content: space-evenly; gap: 8mm; padding: 0 4mm; }
  .logo { height: 12mm; width: auto; }
  .logo-ph { display: inline-flex; align-items: center; justify-content: center; height: 10mm; min-width: 16mm; padding: 0 1.5mm; border: 1px solid #99a; border-radius: 2px; font-size: 8pt; font-weight: 700; color: #446; }
  .unidade { margin-top: 2mm; font-size: 8.5pt; font-weight: 600; }
  .endereco { margin-top: 0.5mm; font-size: 7pt; color: #333; }
  h1 { text-align: center; font-size: 13pt; letter-spacing: .05em; margin: 0 0 8mm; }
  .corpo { text-align: justify; text-indent: 10mm; }
  .cid { margin-top: 5mm; font-weight: 600; }
  .obs { margin-top: 3mm; }
  .grow { flex: 1 1 auto; min-height: 6mm; }
  .local { margin-top: 6mm; text-align: center; }
  .sign { margin-top: 10mm; margin-bottom: 4mm; text-align: center; }
  .sign .line { width: 70%; border-top: 1px solid #111; margin: 0 auto 1.5mm; }
  .sign .nm { font-weight: 600; }
`;

/** HTML autocontido dos atestados (A4 paisagem, 2 documentos por folha). */
export function buildAtestadoPrintHtml(docs: AtestadoForm[]): string {
  const list = docs.length ? docs : [];
  const sheets: string[] = [];
  for (let i = 0; i < list.length; i += 2) {
    const left = coluna(list[i], "left");
    const right = list[i + 1] ? coluna(list[i + 1], "right") : EMPTY_COL;
    sheets.push(`<div class="sheet">${left}${right}</div>`);
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Atestado</title>
<style>${STYLE}</style></head><body>${sheets.join("")}</body></html>`;
}
