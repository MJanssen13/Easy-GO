/**
 * Documentos opcionais que acompanham um modelo de receita do PSGO: relatórios,
 * cartas de solicitação/encaminhamento e folhas de acompanhamento (curvas). São
 * rascunhos a partir dos modelos em papel do HC-UFTM — o cabeçalho é preenchido
 * com os dados da paciente e o restante fica em branco para preenchimento/edição
 * manual. Puro (sem React); a impressão usa `@/lib/print` e o mesmo papel
 * timbrado do laudo/termos (`@/core/ctg/laudo`).
 *
 * NÃO é motor de decisão: doses/condutas são as da equipe (ver CLAUDE.md).
 */
import { DEFAULT_LETTERHEAD, type LaudoLetterhead } from "@/core/ctg/laudo";

export type ReceitaDocId =
  | "curva-termica"
  | "curva-pressorica"
  | "curva-glicemica"
  | "relatorio-toxo"
  | "carta-penicilina"
  | "acompanhamento-penicilina"
  | "relatorio-dmg"
  | "carta-insumos-dmg"
  | "carta-noripurum"
  | "carta-aplicacao-im";

export const RECEITA_DOC_LABEL: Record<ReceitaDocId, string> = {
  "curva-termica": "Curva térmica",
  "curva-pressorica": "Curva pressórica",
  "curva-glicemica": "Curva glicêmica",
  "relatorio-toxo": "Relatório médico (toxoplasmose)",
  "carta-penicilina": "Carta de solicitação de aplicação (penicilina)",
  "acompanhamento-penicilina": "Carta de acompanhamento de dose (penicilina)",
  "relatorio-dmg": "Relatório de alto risco (DMG · CID O24)",
  "carta-insumos-dmg": "Solicitação de insumos à Farmácia (DMG)",
  "carta-noripurum": "Carta de encaminhamento ao Hospital Dia (ferro EV)",
  "carta-aplicacao-im": "Carta de solicitação de aplicação (IM)",
};

export interface RelatorioData {
  paciente: string;
  prontuario: string;
  idade: string;
  cidade: string;
  /** Data já formatada (ex.: "20/07/2026"). */
  dataBR: string;
}

function esc(s: string): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

const ln = (min = 130) => `<span class="ln" style="min-width:${min}px"></span>`;

function letterhead(lh: LaudoLetterhead): string {
  return `<div class="letterhead">
    <img class="lh-sus" src="${esc(lh.sus)}" alt="SUS" />
    <img class="lh-uftm" src="${esc(lh.uftm)}" alt="UFTM" />
    <img class="lh-hubrasil" src="${esc(lh.hubrasil)}" alt="HUBRASIL" />
  </div>`;
}

/** Uma folha (timbre repetido a cada quebra de página) com o conteúdo do doc. */
function frame(lh: LaudoLetterhead, content: string): string {
  return `<table class="doc"><thead><tr><td>${letterhead(lh)}</td></tr></thead><tbody><tr><td><div class="page-body">${content}</div></td></tr></tbody></table>`;
}

/** Cabeçalho de identificação (Nome / Prontuário / Idade) do documento. */
function ident(d: RelatorioData): string {
  const linha2 = [
    d.prontuario.trim() ? `<b>Prontuário/RG:</b> ${esc(d.prontuario)}` : "",
    d.idade.trim() ? `<b>Idade:</b> ${esc(d.idade)}` : "",
  ]
    .filter(Boolean)
    .join(" &nbsp;·&nbsp; ");
  return `<p class="idf"><b>Paciente:</b> ${esc(d.paciente) || ln(260)}</p>${
    linha2 ? `<p class="idf">${linha2}</p>` : ""
  }`;
}

/** Rodapé cidade/data + assinatura. */
function assinatura(d: RelatorioData): string {
  const local = [esc(d.cidade), esc(d.dataBR)].filter((s) => s.trim()).join(", ");
  return `<p class="local">${local || ln(200)}</p>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-nm">Assinatura do médico — CRM / carimbo</div>
    </div>`;
}

/** Tabela de curva (colunas + N linhas em branco) com rodapé de orientação. */
function curva(titulo: string, cols: string[], linhas: number, rodape: string): string {
  const head = cols.map((c) => `<th>${esc(c)}</th>`).join("");
  const empty = `<tr>${cols.map(() => "<td>&nbsp;</td>").join("")}</tr>`.repeat(linhas);
  return `<h1 class="titulo">${esc(titulo)}</h1>
    <table class="curva"><thead><tr>${head}</tr></thead><tbody>${empty}</tbody></table>
    <p class="rodape">${esc(rodape)}</p>`;
}

// --- Documentos individuais (cada um é o conteúdo de uma folha) ---

function relatorioToxo(d: RelatorioData): string {
  return `<h1 class="titulo">RELATÓRIO MÉDICO</h1>
    ${ident(d)}
    <p class="just">A paciente acima identificada, gestante de ${ln(70)} semanas, apresenta
    <b>TOXOPLASMOSE AGUDA</b> comprovada laboratorialmente, necessitando de tratamento medicamentoso
    conforme prescrição em anexo.</p>
    <p class="just">Observações: ${ln(360)}</p>
    <p class="just">Este relatório foi confeccionado a pedido da paciente.</p>
    ${assinatura(d)}`;
}

function cartaPenicilina(d: RelatorioData): string {
  return `<h1 class="titulo">À FARMÁCIA / AO HOSPITAL DIA</h1>
    ${ident(d)}
    <p class="just">Solicito, para a paciente acima, aplicação de <b>1 ampola de 1.200.000 UI de
    Penicilina Benzatina em cada glúteo</b> (totalizando 2.400.000 UI), em ${ln(40)} dose(s), conforme
    estágio clínico.</p>
    <p>Datas de aplicação:</p>
    <p>1ª dose: ${ln(120)} &nbsp;&nbsp; 2ª dose: ${ln(120)} &nbsp;&nbsp; 3ª dose: ${ln(120)}</p>
    <p class="small">Hospital Dia — R. João Alfredo, 437, N. Sra. da Abadia · (34) 3318-5046 / 3318-5324</p>
    ${assinatura(d)}`;
}

function acompanhamentoPenicilina(d: RelatorioData): string {
  const linhas = [1, 2, 3]
    .map(
      (n) =>
        `<tr><td>${n}ª dose</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`,
    )
    .join("");
  return `<h1 class="titulo">ACOMPANHAMENTO DE DOSE — PENICILINA BENZATINA</h1>
    ${ident(d)}
    <p>Esquema: 2.400.000 UI IM por dose (1.200.000 UI em cada glúteo), semanal.</p>
    <table class="curva"><thead><tr><th>Dose</th><th>Data</th><th>Local de aplicação</th><th>Assinatura</th></tr></thead>
    <tbody>${linhas}</tbody></table>
    <p class="rodape">Retornar ao PSGO se reação à aplicação.</p>
    ${assinatura(d)}`;
}

function relatorioDmg(d: RelatorioData): string {
  return `<h1 class="titulo">RELATÓRIO MÉDICO</h1>
    ${ident(d)}
    <p class="just">A paciente acima encontra-se em acompanhamento pré-natal e foi classificada como
    <b>GESTAÇÃO DE ALTO RISCO</b> devido ao diagnóstico de <b>DIABETES MELLITUS GESTACIONAL</b>
    (CID-10 O24).</p>
    <p class="just">Idade gestacional: ${ln(120)}. Conduta / observações: ${ln(300)}</p>
    <p class="just">Este relatório foi confeccionado a pedido da paciente.</p>
    ${assinatura(d)}`;
}

function cartaInsumosDmg(d: RelatorioData): string {
  return `<h1 class="titulo">À FARMÁCIA CENTRAL</h1>
    ${ident(d)}
    <p>Solicito para a paciente acima (CID-10 O24) os insumos para automonitorização da glicemia:</p>
    <p>( &nbsp; ) Fitas reagentes &nbsp;.................................&nbsp; 90 unidades</p>
    <p>( &nbsp; ) Lancetas &nbsp;..........................................&nbsp; 90 unidades</p>
    <p>( &nbsp; ) Glicosímetro &nbsp;.....................................&nbsp; 1 unidade</p>
    ${assinatura(d)}`;
}

function cartaNoripurum(d: RelatorioData): string {
  return `<h1 class="titulo">AO HOSPITAL DIA</h1>
    ${ident(d)}
    <p class="just">Encaminho a paciente acima para realização de <b>reposição de ferro endovenoso
    (Noripurum)</b> devido a quadro de <b>ANEMIA</b>. Realizar 2 ampolas EV a cada três dias, até
    completar 10 ampolas (5 aplicações), conforme receita em anexo.</p>
    <p class="just">Pré-medicação (prometazina/dexclorfeniramina) 30 minutos antes de cada infusão.</p>
    <p class="small">Hospital Dia — R. João Alfredo, 437, N. Sra. da Abadia · (34) 3318-5046 / 3318-5324</p>
    ${assinatura(d)}`;
}

function cartaAplicacaoIm(d: RelatorioData): string {
  return `<h1 class="titulo">À FARMÁCIA / SALA DE MEDICAÇÃO</h1>
    ${ident(d)}
    <p class="just">Solicito, para a paciente acima, aplicação de <b>Ceftriaxona 500 mg IM,
    dose única</b>.</p>
    ${assinatura(d)}`;
}

function buildDoc(id: ReceitaDocId, d: RelatorioData): string {
  switch (id) {
    case "curva-termica":
      return curva(
        "CURVA TÉRMICA",
        ["DATA", "HORÁRIO", "TEMPERATURA"],
        14,
        "Procurar o PSGO se temperatura maior ou igual a 37,8 ºC.",
      );
    case "curva-pressorica":
      return curva(
        "CURVA PRESSÓRICA",
        ["DATA E HORA", "PRESSÃO ARTERIAL"],
        18,
        "Se pressão arterial maior ou igual a 160 × 110 mmHg, procurar pronto atendimento.",
      );
    case "curva-glicemica":
      return curva(
        "CURVA GLICÊMICA",
        ["DATA", "JEJUM", "1H APÓS CAFÉ", "1H APÓS ALMOÇO", "1H APÓS JANTAR"],
        16,
        "Medir 1 hora após o INÍCIO das refeições.",
      );
    case "relatorio-toxo":
      return relatorioToxo(d);
    case "carta-penicilina":
      return cartaPenicilina(d);
    case "acompanhamento-penicilina":
      return acompanhamentoPenicilina(d);
    case "relatorio-dmg":
      return relatorioDmg(d);
    case "carta-insumos-dmg":
      return cartaInsumosDmg(d);
    case "carta-noripurum":
      return cartaNoripurum(d);
    case "carta-aplicacao-im":
      return cartaAplicacaoIm(d);
  }
}

const STYLE = `
  @page { size: A4 landscape; margin: 10mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.35; color: #000; }
  table.doc { width: 100%; border-collapse: collapse; page-break-before: always; }
  table.doc:first-child { page-break-before: auto; }
  table.doc > thead > tr > td, table.doc > tbody > tr > td { border: 0; padding: 0; }
  /* Via única, folha em paisagem — conteúdo centralizado (não espelhado). */
  .page-body { max-width: 200mm; margin: 0 auto; }
  .letterhead { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 4px 10px; border-bottom: 1.5px solid #000; margin: 0 auto 10px; max-width: 200mm; }
  .letterhead img { width: auto; object-fit: contain; }
  .lh-sus { height: 40px; } .lh-uftm { height: 46px; } .lh-hubrasil { height: 42px; }
  h1.titulo { text-align: center; font-size: 12pt; margin: 4px 0 14px; letter-spacing: .02em; }
  .idf { margin: 3px 0; }
  p { margin: 8px 0; }
  .just { text-align: justify; }
  .small { font-size: 8.5pt; color: #333; }
  .ln { display: inline-block; border-bottom: 1px solid #000; }
  .local { margin-top: 30px; }
  .sig { text-align: center; margin-top: 40px; }
  .sig-line { width: 62%; border-top: 1px solid #000; margin: 0 auto 4px; }
  .sig-nm { font-size: 9.5pt; }
  table.curva { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.curva th, table.curva td { border: 1px solid #000; padding: 5px 6px; text-align: center; font-size: 9.5pt; }
  table.curva th { background: #eee; }
  .rodape { margin-top: 8px; font-weight: 700; text-align: center; }
`;

/** HTML autocontido com os documentos selecionados (uma folha por documento). */
export function renderReceitaDocsHtml(
  ids: ReceitaDocId[],
  data: RelatorioData,
  lh: LaudoLetterhead = DEFAULT_LETTERHEAD,
): string {
  const pages = ids.map((id) => frame(lh, buildDoc(id, data))).join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Documentos da receita — PSGO</title>
<style>${STYLE}</style></head>
<body>${pages}</body>
</html>`;
}
