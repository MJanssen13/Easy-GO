/**
 * Impressão do atestado/declaração (A4 retrato) com o timbre do HC-UFTM
 * (logos SUS/UFTM/HU-Brasil + unidade + CNES), corpo justificado e assinatura
 * "Médico Assistente" com local e data por extenso. HTML autocontido.
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

const STYLE = `
  @page { size: A4 portrait; margin: 18mm 20mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: "Segoe UI", -apple-system, Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
  .top { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 3mm; margin-bottom: 10mm; }
  .logos { display: flex; align-items: center; justify-content: space-evenly; gap: 12mm; padding: 0 6mm; }
  .logo { height: 14mm; width: auto; }
  .logo-ph { display: inline-flex; align-items: center; justify-content: center; height: 12mm; min-width: 18mm; padding: 0 2mm; border: 1px solid #99a; border-radius: 2px; font-size: 9pt; font-weight: 700; color: #446; }
  .unidade { margin-top: 3mm; font-size: 10pt; font-weight: 600; }
  .endereco { margin-top: 1mm; font-size: 8.5pt; color: #333; }
  h1 { text-align: center; font-size: 15pt; letter-spacing: .06em; margin: 0 0 12mm; }
  .corpo { text-align: justify; text-indent: 12mm; }
  .cid { margin-top: 6mm; font-weight: 600; }
  .obs { margin-top: 4mm; }
  .local { margin-top: 16mm; text-align: center; }
  .sign { margin-top: 22mm; text-align: center; }
  .sign .line { width: 70%; border-top: 1px solid #111; margin: 0 auto 2mm; }
  .sign .nm { font-weight: 600; }
`;

/** HTML autocontido do atestado para impressão (→ PDF no navegador). */
export function buildAtestadoPrintHtml(form: AtestadoForm): string {
  const cid = atestadoCid(form);
  const local = [e(form.cidade), dataExtenso(form.data)].filter(Boolean).join(", ");
  const body = `
    <div class="top">
      <div class="logos">${logosHtml()}</div>
      <div class="unidade">${e(UNIDADE)}</div>
      <div class="endereco">${e(ENDERECO)}</div>
    </div>
    <h1>${e(atestadoTitulo(form))}</h1>
    <div class="corpo">${e(atestadoCorpo(form))}</div>
    ${cid ? `<div class="cid">${e(cid)}</div>` : ""}
    ${form.observacoes.trim() ? `<div class="obs">${e(form.observacoes)}</div>` : ""}
    ${local ? `<div class="local">${local}</div>` : ""}
    <div class="sign">
      <div class="line"></div>
      <div class="nm">Médico Assistente</div>
    </div>`;
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Atestado</title>
<style>${STYLE}</style></head><body>${body}</body></html>`;
}
