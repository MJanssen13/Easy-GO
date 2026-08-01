/**
 * Layout de impressão da receita (A4 paisagem): duas vias lado a lado (1ª
 * retenção na farmácia / 2ª orientação ao paciente).
 *
 * A paginação é **manual** (`PAGINATE_SCRIPT`, embutido no HTML e executado na
 * janela/iframe de impressão): mede a altura real de cada medicamento e
 * distribui-os em folhas A4. Cada folha é uma coluna flex — cabeçalho no topo,
 * medicamentos ao centro, **rodapé empurrado ao fim** (`margin-top: auto` via
 * `flex: 1` nos medicamentos). Assim toda página tem cabeçalho e rodapé, o
 * rodapé fica sempre ancorado ao fim (não sobe com poucos itens) e nada é
 * cortado — sem depender da repetição de `thead`/`tfoot`, que o Chromium omite
 * quando o cabeçalho é alto (caso do controle especial).
 *
 * Dois modelos: comum (e-SUS) e Receituário de Controle Especial (Portaria
 * 344/98). HTML autocontido para o diálogo de impressão do navegador (→ PDF).
 */
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

const UNIDADE = "Hospital de Clínicas da Universidade Federal do Triângulo Mineiro — HC-UFTM";
const ENDERECO = "CNES: 2206595, Av. Getúlio Guarita, 130, N.S. Abadia - Uberaba, MG";

// Quadro "Identificação do Emitente" do Receituário de Controle Especial (Portaria 344/98).
const EMITENTE_LINHAS = [
  "Hospital de Clínicas da",
  "Universidade Federal do Triângulo Mineiro",
  "Av. Getúlio Guaritá, 130 - Bairro Abadia",
  "Tel.: 3318 5000",
  "Uberaba (MG)",
];

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
const e = (s: string) => escapeHtml(s.trim());

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
/** "10 de Abril de 2026" a partir de uma data ISO. */
function dataExtenso(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "" : `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/** Cidade + data por extenso (respeita a opção de datar a receita). */
function localData(header: ReceitaHeader): string {
  if (!header.mostrarData) return "";
  return [e(header.cidade), dataExtenso(header.data)].filter(Boolean).join(", ");
}

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
  const turnoCombo = turnoDoseText(it);
  const linha1 = (
    turnoCombo
      ? [turnoCombo, viaText(it), momentoText(it)]
      : [doseText(it), frequenciaText(it), viaText(it), momentoText(it)]
  )
    .filter(Boolean)
    .map(e)
    .join(" • ");
  const dur = it.usoContinuo ? "uso contínuo" : duracaoText(it);
  const rec = it.recomendacoes.trim();
  return `${linha1 ? `<div>${linha1}</div>` : ""}${
    dur ? `<div>${it.usoContinuo ? e(dur) : `Durante ${e(dur)}`}</div>` : ""
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

const VIAS = `1ª VIA – RETENÇÃO NA FARMÁCIA OU DROGARIA<br>2ª VIA – ORIENTAÇÃO AO PACIENTE`;

// --- Modelo comum (e-SUS) ---

function headerComum(header: ReceitaHeader, grupo: ReceitaGrupo): string {
  const pron = [
    header.prontuario.trim() ? e(header.prontuario) : "",
    header.idade.trim() ? `Idade: ${e(header.idade)}` : "",
  ]
    .filter(Boolean)
    .join(" • ");
  return `<div class="top">
      <div class="logos">${logosHtml()}</div>
      <div class="unidade">${e(UNIDADE)}</div>
      <div class="endereco">${e(ENDERECO)}</div>
    </div>
    <div class="titrow"><div class="rec">${e(grupo.titulo)}</div></div>
    <div class="pac-fields">
      <div class="ef nl"><span class="ef-l">PACIENTE:</span><span class="ef-v">${e(header.paciente.toUpperCase()) || "&nbsp;"}</span></div>
      <div class="ef nl"><span class="ef-l">PRONTUÁRIO:</span><span class="ef-v">${pron || "&nbsp;"}</span></div>
    </div>
    <div class="sec-t sec-meds">MEDICAMENTOS</div>`;
}

function footerComum(header: ReceitaHeader): string {
  const ld = localData(header);
  return `<div class="sign"><div class="line"></div><div class="nm">Médico Assistente</div>${
    ld ? `<div class="dt">${ld}</div>` : ""
  }</div>`;
}

// --- Modelo Receituário de Controle Especial (Portaria 344/98) ---

function headerEspecial(header: ReceitaHeader, grupo: ReceitaGrupo): string {
  const emit = EMITENTE_LINHAS.map((l) => `<div>${e(l)}</div>`).join("");
  const pac = e(header.paciente.toUpperCase());
  const end = header.endereco.trim();
  const enderecoHtml = end
    ? `<div class="ef nl"><span class="ef-l">ENDEREÇO:</span><span class="ef-v">${e(end)}</span></div>`
    : `<div class="ef thin"><span class="ef-l">ENDEREÇO:</span><span class="ef-v"></span></div>`;
  return `<div class="logos esp-logos">${logosHtml()}</div>
    <div class="esp-title">${e(grupo.titulo)}</div>
    <div class="esp-emit">
      <div class="emit-box"><div class="emit-t">IDENTIFICAÇÃO DO EMITENTE</div><div class="emit-b">${emit}</div></div>
      <div class="esp-vias">${VIAS}</div>
    </div>
    <div class="ef nl"><span class="ef-l">PACIENTE:</span><span class="ef-v">${pac || "&nbsp;"}</span></div>
    ${enderecoHtml}
    <div class="sec-t sec-meds">PRESCRIÇÃO</div>`;
}

function footerEspecial(header: ReceitaHeader): string {
  const ld = localData(header);
  return `<div class="esp-sign"><span class="ef-l">Médico Assistente:</span><span class="esp-sign-line"></span>${
    ld ? `<span class="esp-sign-dt">${ld}</span>` : ""
  }</div>
    <div class="esp-boxes">
      <div class="esp-box">
        <div class="esp-box-t">IDENTIFICAÇÃO DO COMPRADOR</div>
        <div class="er"><span>Nome:</span><span class="er-l"></span></div>
        <div class="er"><span>Ident.:</span><span class="er-l"></span><span>órg. Emissor:</span><span class="er-l"></span></div>
        <div class="er"><span>Endereço:</span><span class="er-l"></span></div>
        <div class="er"><span>Cidade:</span><span class="er-l"></span><span>UF:</span><span class="er-l sm"></span></div>
        <div class="er"><span>Telefone:</span><span class="er-l"></span></div>
      </div>
      <div class="esp-box">
        <div class="esp-box-t">IDENTIFICAÇÃO DO FORNECEDOR</div>
        <div class="er-grow"></div>
        <div class="er-sign"><div class="er-sign-c">Assinatura do Farmacêutico</div></div>
        <div class="er-data">Data: ____ / ____ / ____</div>
      </div>
    </div>`;
}

/**
 * "Template" de um grupo: guarda (oculto) o HTML do cabeçalho, do rodapé e de
 * cada medicamento. A paginação (`PAGINATE_SCRIPT`) mede a altura real de cada
 * medicamento no navegador e distribui em páginas A4, montando cada folha como
 * uma coluna flex (cabeçalho no topo, medicamentos ao centro, rodapé empurrado
 * ao fim). Assim **toda página** tem cabeçalho e rodapé, o rodapé fica sempre
 * ancorado ao fim (não sobe com poucos itens) e nada é cortado — independente
 * da altura do cabeçalho (comum ou controle especial) ou do nº de páginas.
 */
function docTemplate(header: ReceitaHeader, grupo: ReceitaGrupo): string {
  const isEsp = grupo.tipo === "ESPECIAL";
  const hdr = isEsp ? headerEspecial(header, grupo) : headerComum(header, grupo);
  const ftr = isEsp ? footerEspecial(header) : footerComum(header);
  const meds = grupo.items.map((it, i) => medHtml(it, i + 1)).join("");
  // Especial = 2 vias espelhadas (mesma prescrição nas duas colunas). Simples =
  // uma via só; as colunas são preenchidas em sequência (transbordo → coluna ao
  // lado → nova folha), não espelhadas.
  return `<div class="rx-doc" data-esp="${isEsp ? "1" : "0"}" data-mirror="${isEsp ? "1" : "0"}">
    <div class="tpl head">${hdr}</div>
    <div class="tpl foot">${ftr}</div>
    <div class="tpl meds">${meds}</div>
  </div>`;
}

/**
 * Script de paginação embutido no HTML de impressão. Roda na janela/iframe de
 * impressão antes do `print()`: mede cada medicamento e distribui em folhas.
 */
const PAGINATE_SCRIPT = `<script>(function(){
  function ppm(){var d=document.createElement('div');d.style.cssText='width:100mm;position:absolute;visibility:hidden';document.body.appendChild(d);var v=d.getBoundingClientRect().width/100;d.remove();return v;}
  var PPM=ppm();
  var PAGE_H=193*PPM; // altura útil A4 paisagem (210 - 2*8mm), com folga p/ arredondamento
  var root=document.getElementById('rx-pages');
  var docs=Array.prototype.slice.call(document.querySelectorAll('.rx-doc'));
  docs.forEach(function(doc){
    var esp=doc.getAttribute('data-esp')==='1';
    var mirror=doc.getAttribute('data-mirror')==='1';
    var colCls='col'+(esp?' esp':'');
    var headHtml=doc.querySelector('.tpl.head').innerHTML;
    var footHtml=doc.querySelector('.tpl.foot').innerHTML;
    var medEls=Array.prototype.slice.call(doc.querySelector('.tpl.meds').children);
    // Coluna de medição com largura fixa = uma via (metade de 281mm). Explícita
    // porque a impressão ocorre em iframe 0x0 e/ou largura de tela diferente da
    // página — assim a quebra de linha bate com o print.
    var meas=document.createElement('div');meas.className='sheet';meas.style.cssText='position:absolute;visibility:hidden;left:-9999px;top:0;width:281mm';
    var mcol=document.createElement('div');mcol.className=colCls;meas.appendChild(mcol);document.body.appendChild(meas);
    var mh=document.createElement('div');mh.className='col-head';mh.innerHTML=headHtml;mcol.appendChild(mh);
    var mf=document.createElement('div');mf.className='col-foot';mf.innerHTML=footHtml;mcol.appendChild(mf);
    var headH=mh.getBoundingClientRect().height, footH=mf.getBoundingClientRect().height;
    var mmeds=document.createElement('div');mmeds.className='col-meds';mcol.appendChild(mmeds);
    var heights=medEls.map(function(el){var c=el.cloneNode(true);mmeds.appendChild(c);var r=c.getBoundingClientRect().height;var s=getComputedStyle(c);return r+parseFloat(s.marginTop||0)+parseFloat(s.marginBottom||0);});
    meas.parentNode.removeChild(meas);
    var avail=PAGE_H-headH-footH-4*PPM; // folga de 4mm
    // Distribui os medicamentos em "painéis" (o que cabe numa coluna/via).
    var panels=[],cur=[],used=0;
    for(var i=0;i<medEls.length;i++){var h=heights[i];if(cur.length&&used+h>avail){panels.push(cur);cur=[];used=0;}cur.push(i);used+=h;}
    if(cur.length||medEls.length===0)panels.push(cur);
    function mkCol(side,idxs){
      var col=document.createElement('div');col.className=colCls+' '+side;
      if(!idxs)return col; // coluna em branco (simples de uma via só)
      var h=document.createElement('div');h.className='col-head';h.innerHTML=headHtml;col.appendChild(h);
      var mds=document.createElement('div');mds.className='col-meds';
      idxs.forEach(function(ix){mds.appendChild(medEls[ix].cloneNode(true));});
      col.appendChild(mds);
      var f=document.createElement('div');f.className='col-foot';f.innerHTML=footHtml;col.appendChild(f);
      return col;
    }
    function mkSheet(){var s=document.createElement('div');s.className='sheet';return s;}
    if(mirror){
      // Especial: cada painel numa folha, com as 2 vias idênticas (1ª/2ª via).
      panels.forEach(function(idxs){
        var sheet=mkSheet();
        sheet.appendChild(mkCol('left',idxs));
        sheet.appendChild(mkCol('right',idxs));
        root.appendChild(sheet);
      });
    } else {
      // Simples: 1 via só; painéis preenchem coluna esquerda, depois a direita,
      // depois nova folha (esq., dir., …). A coluna sem conteúdo fica em branco.
      for(var p=0;p<panels.length;p+=2){
        var sheet=mkSheet();
        sheet.appendChild(mkCol('left',panels[p]));
        sheet.appendChild(mkCol('right',p+1<panels.length?panels[p+1]:null));
        root.appendChild(sheet);
      }
    }
    doc.parentNode.removeChild(doc);
  });
})();<\/script>`;

export const RECEITA_PRINT_STYLE = `
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #111; font-family: "Segoe UI", -apple-system, Arial, sans-serif; font-size: 8.5pt; line-height: 1.3; }
  .tpl { display: none; }
  /* Cada folha ocupa exatamente uma página; a coluna flex empurra o rodapé ao fim. */
  .sheet { height: 193mm; display: flex; overflow: hidden; }
  .sheet + .sheet { break-before: page; page-break-before: always; }
  .sheet .col { width: 50%; display: flex; flex-direction: column; padding: 0 6mm; }
  .sheet .col.esp { padding: 0 5mm; }
  .sheet .col.left { border-right: 1px dashed #999; }
  .col-head { flex: 0 0 auto; padding-top: 1mm; }
  .col-meds { flex: 1 1 auto; padding-top: 1.4mm; }
  .col-foot { flex: 0 0 auto; padding-bottom: 1mm; }
  .col-meds .med + .med { margin-top: 1.4mm; }
  .top { text-align: center; border-bottom: 1.5px solid #111; padding-bottom: 2mm; margin-bottom: 2mm; }
  .logos { display: flex; align-items: center; justify-content: space-evenly; gap: 10mm; padding: 0 4mm; }
  .logo { height: 11mm; width: auto; }
  .logo-ph { display: inline-flex; align-items: center; justify-content: center; height: 9mm; min-width: 14mm; padding: 0 1.5mm; border: 1px solid #99a; border-radius: 2px; font-size: 7pt; font-weight: 700; color: #446; }
  .unidade { margin-top: 1.5mm; font-size: 7.5pt; font-weight: 600; }
  .endereco { margin-top: 0.5mm; font-size: 6.5pt; color: #333; }
  .titrow { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 1mm; }
  .rec { font-size: 11pt; font-weight: 700; }
  .vias { font-size: 5.8pt; text-align: right; color: #333; }
  /* Mesma fonte dos rótulos Paciente/Prontuário/Endereço (.ef-l = 8pt). */
  .sec-t { font-size: 8pt; font-weight: 700; letter-spacing: .04em; border-bottom: 1px solid #111; padding-bottom: 0.5mm; }
  .sec-meds { margin-top: 1.5mm; }
  .med { border: 1px solid #999; border-radius: 2px; padding: 1mm 1.5mm; }
  .med-h { display: flex; justify-content: space-between; gap: 2mm; }
  .med-n { font-weight: 600; }
  .med-q { text-align: right; white-space: nowrap; }
  .med-f { color: #444; }
  .med-d { margin-top: 0.4mm; color: #222; }
  .sign { text-align: center; }
  .sign .line { width: 62%; border-top: 1px solid #111; margin: 0 auto 1mm; }
  .sign .nm { font-weight: 600; }
  .sign .dt { margin-top: 1mm; }
  /* --- Campos de identificação (rótulo + valor) --- */
  .ef { display: flex; align-items: baseline; gap: 1mm; margin-top: 1.5mm; }
  .ef-l { font-weight: 700; white-space: nowrap; font-size: 8pt; }
  .ef-v { flex: 1 1 0; min-width: 0; border-bottom: 1px solid #111; min-height: 3.6mm; font-size: 8pt; }
  .ef.nl .ef-v { border-bottom: none; }
  .ef.thin .ef-v { border-bottom: 0.4pt solid #555; min-height: 3.2mm; }
  .pac-fields { margin-top: 1mm; }
  /* --- Receituário de Controle Especial (Portaria 344/98) --- */
  .esp-logos { margin-bottom: 1.5mm; }
  .esp-title { text-align: center; font-size: 12pt; font-weight: 700; letter-spacing: .02em; border-bottom: 2px solid #111; padding-bottom: 1mm; margin-bottom: 2mm; }
  .esp-emit { display: flex; gap: 3mm; align-items: flex-start; margin-bottom: 1mm; }
  .emit-box { flex: 1.2 1 0; min-width: 0; border: 1px solid #111; padding: 1mm 1.5mm; }
  .emit-t { font-size: 6.5pt; font-weight: 700; text-align: center; }
  .emit-b { text-align: center; font-size: 7pt; margin-top: 0.5mm; line-height: 1.25; }
  .esp-vias { flex: 1 1 0; min-width: 0; font-size: 5.8pt; text-align: right; color: #333; }
  .esp-sign { display: flex; align-items: baseline; gap: 1mm; margin-bottom: 2mm; font-size: 8pt; }
  .esp-sign-line { flex: 1 1 0; min-width: 0; border-bottom: 1px solid #111; }
  .esp-sign-dt { white-space: nowrap; }
  .esp-boxes { display: flex; gap: 3mm; }
  .esp-box { flex: 1 1 0; min-width: 0; border: 1px solid #111; padding: 1.5mm; min-height: 32mm; display: flex; flex-direction: column; }
  .esp-box-t { font-size: 6.3pt; font-weight: 700; text-align: center; border-bottom: 1px solid #111; padding-bottom: 0.5mm; margin-bottom: 1mm; }
  .er { font-size: 6.6pt; margin: 1.4mm 0; display: flex; align-items: baseline; gap: 1mm; white-space: nowrap; }
  .er-l { flex: 1 1 0; min-width: 4mm; border-bottom: 1px solid #111; min-height: 2.6mm; }
  .er-l.sm { flex: 0 0 8mm; }
  .er-grow { flex: 1 1 auto; min-height: 8mm; }
  .er-sign { text-align: center; }
  .er-sign-c { border-top: 1px solid #111; padding-top: 0.5mm; font-size: 6.3pt; }
  .er-data { margin-top: 1.5mm; font-size: 6.6pt; text-align: right; }
`;

/** Templates dos grupos + contêiner onde a paginação injeta as folhas. */
export function receitaSheetsHtml(header: ReceitaHeader, items: PrescricaoItem[]): string {
  const tpls = receitaGrupos(items)
    .map((g) => docTemplate(header, g))
    .join("");
  return `${tpls}<div id="rx-pages"></div>`;
}

/** HTML autocontido da receita para impressão (pagina sozinho no navegador). */
export function buildReceitaPrintHtml(header: ReceitaHeader, items: PrescricaoItem[]): string {
  // O <title> vira o nome sugerido ao salvar como PDF no diálogo de impressão.
  const nome = header.paciente.trim();
  const titulo = nome ? `receita ${e(nome)}` : "receita";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${titulo}</title>
<style>${RECEITA_PRINT_STYLE}</style></head><body>${receitaSheetsHtml(header, items)}${PAGINATE_SCRIPT}</body></html>`;
}
