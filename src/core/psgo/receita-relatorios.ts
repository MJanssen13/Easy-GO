/**
 * Documentos opcionais que acompanham um modelo de receita do PSGO: relatórios,
 * cartas de solicitação/encaminhamento e folhas de acompanhamento (curvas). São
 * rascunhos a partir dos modelos em papel do HC-UFTM — o cabeçalho é preenchido
 * com os dados da paciente e o restante fica em branco para preenchimento/edição
 * manual. Puro (sem React); a impressão usa `@/lib/print` e o mesmo papel
 * timbrado do laudo/termos (`@/core/ctg/laudo`).
 *
 * Layout: folha em PAISAGEM dividida ao meio (como a receita). Relatórios/cartas
 * são empacotados dois por folha (metades diferentes, sem espelhar); as curvas
 * são ESPELHADAS (a mesma curva nas duas metades). NÃO é motor de decisão:
 * doses/condutas são as da equipe (ver CLAUDE.md).
 */
import { DEFAULT_LETTERHEAD, type LaudoLetterhead } from "@/core/ctg/laudo";

export type ReceitaDocId =
  | "curva-termica"
  | "curva-pressorica"
  | "curva-glicemica"
  | "relatorio-toxo"
  | "carta-sifilis"
  | "carta-sifilis-parceiro"
  | "relatorio-dmg"
  | "carta-insumos-dmg"
  | "carta-noripurum"
  | "carta-aplicacao-im";

export const RECEITA_DOC_LABEL: Record<ReceitaDocId, string> = {
  "curva-termica": "Curva térmica",
  "curva-pressorica": "Curva pressórica",
  "curva-glicemica": "Curva glicêmica",
  "relatorio-toxo": "Relatório médico (toxoplasmose)",
  "carta-sifilis": "Carta de aplicação e acompanhamento (sífilis)",
  "carta-sifilis-parceiro": "Carta de acompanhamento — parceiro (sífilis)",
  "relatorio-dmg": "Relatório de alto risco (DMG · CID O24)",
  "carta-insumos-dmg": "Solicitação de insumos à Farmácia (DMG)",
  "carta-noripurum": "Carta de encaminhamento ao Hospital Dia (ferro EV)",
  "carta-aplicacao-im": "Carta de solicitação de aplicação (IM)",
};

/** Curvas são espelhadas (mesma folha nas duas metades). */
const MIRROR_DOCS = new Set<ReceitaDocId>(["curva-termica", "curva-pressorica", "curva-glicemica"]);
/** Nº de linhas das curvas para preencher a meia-folha em paisagem. */
const CURVA_ROWS = 22;

export interface RelatorioData {
  paciente: string;
  prontuario: string;
  idade: string;
  cidade: string;
  /** Data já formatada (ex.: "20/07/2026"). */
  dataBR: string;
  /** Idade gestacional (preenchida automaticamente nos relatórios). */
  ig?: string;
  /** Sífilis: número de doses selecionado (1 ou 3). */
  numDoses?: string;
}

function esc(s: string): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

const ln = (min = 130) => `<span class="ln" style="min-width:${min}px"></span>`;
/** IG preenchida automaticamente; se vazia, linha em branco. */
const igField = (d: RelatorioData, min = 90) => (d.ig?.trim() ? esc(d.ig) : ln(min));

function letterhead(lh: LaudoLetterhead): string {
  return `<div class="letterhead">
    <img class="lh-sus" src="${esc(lh.sus)}" alt="SUS" />
    <img class="lh-uftm" src="${esc(lh.uftm)}" alt="UFTM" />
    <img class="lh-hubrasil" src="${esc(lh.hubrasil)}" alt="HUBRASIL" />
  </div>`;
}

/** Uma metade (coluna) da folha paisagem, com timbre próprio + conteúdo. */
function coluna(lh: LaudoLetterhead, content: string, lado: "left" | "right"): string {
  return `<div class="mdoc-col ${lado}">${letterhead(lh)}<div class="doc-body">${content}</div></div>`;
}

/** Cabeçalho de identificação (Nome / Prontuário / Idade). */
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

/** Rodapé cidade/data + assinatura (padrão). */
function assinatura(d: RelatorioData): string {
  const local = [esc(d.cidade), esc(d.dataBR)].filter((s) => s.trim()).join(", ");
  return `<p class="local">${local || ln(200)}</p>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-nm">Assinatura do médico — CRM / carimbo</div>
    </div>`;
}

/** Data + assinatura com espaço reservado para o carimbo. */
function sigCarimbo(d: RelatorioData): string {
  const local = [esc(d.cidade), esc(d.dataBR)].filter((s) => s.trim()).join(", ");
  return `<p class="local">${local || ln(200)}</p>
    <div class="sig sig-carimbo">
      <div class="sig-line"></div>
      <div class="sig-nm">Assinatura / carimbo</div>
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

// --- Documentos individuais (conteúdo de uma metade) ---

function relatorioToxo(d: RelatorioData): string {
  return `<h1 class="titulo">RELATÓRIO MÉDICO</h1>
    ${ident(d)}
    <p class="just">A paciente acima identificada, gestante de ${igField(d)}, apresenta
    <b>TOXOPLASMOSE AGUDA</b> comprovada laboratorialmente, necessitando de tratamento medicamentoso
    conforme prescrição em anexo.</p>
    <p class="just">Este relatório foi confeccionado a pedido da paciente.</p>
    ${assinatura(d)}`;
}

/** Carta unificada da sífilis: solicitação + acompanhamento (paciente ou parceiro). */
function cartaSifilis(d: RelatorioData, withNote: boolean): string {
  const n = (d.numDoses ?? "1").trim() || "1";
  const nRows = Math.max(1, Number(n) || 1);
  const rows = Array.from(
    { length: nRows },
    (_, i) => `<tr><td>${i + 1}ª dose</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`,
  ).join("");
  return `<h1 class="titulo">SÍFILIS — SOLICITAÇÃO E ACOMPANHAMENTO</h1>
    ${ident(d)}
    <p class="just">Solicito, para a paciente acima, aplicação de 1 ampola de 1.200.000 UI de
    Penicilina Benzatina em cada glúteo (totalizando 2.400.000 UI), em ${esc(n)} dose(s).</p>
    ${sigCarimbo(d)}
    <table class="curva"><thead><tr><th>Dose</th><th>Data</th><th>Local de aplicação</th><th>Assinatura</th></tr></thead>
    <tbody>${rows}</tbody></table>
    ${withNote ? `<p class="rodape">Retornar ao PSGO se reação à aplicação.</p>` : ""}`;
}

function relatorioDmg(d: RelatorioData): string {
  return `<h1 class="titulo">RELATÓRIO MÉDICO</h1>
    ${ident(d)}
    <p class="just">A paciente acima encontra-se em acompanhamento pré-natal e foi classificada como
    <b>GESTAÇÃO DE ALTO RISCO</b> devido ao diagnóstico de <b>DIABETES MELLITUS GESTACIONAL</b>
    (CID-10 O24).</p>
    <p class="just">Idade gestacional: ${igField(d, 120)}.</p>
    <p class="just">Este relatório foi confeccionado a pedido da paciente.</p>
    ${assinatura(d)}`;
}

function cartaInsumosDmg(d: RelatorioData): string {
  return `<h1 class="titulo">À FARMÁCIA CENTRAL</h1>
    ${ident(d)}
    <p>Solicito para a paciente acima (CID-10 O24) os insumos para automonitorização da glicemia:</p>
    <p>1. Fitas reagentes &nbsp;.................................&nbsp; 120 unidades</p>
    <p>2. Lancetas &nbsp;..........................................&nbsp; 120 unidades</p>
    <p>3. Glicosímetro &nbsp;.....................................&nbsp; 1 unidade</p>
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
    <p class="just">Solicito, para a pessoa acima, aplicação de <b>Ceftriaxona 500 mg IM,
    dose única</b>.</p>
    ${assinatura(d)}`;
}

function buildDoc(id: ReceitaDocId, d: RelatorioData): string {
  switch (id) {
    case "curva-termica":
      return curva(
        "CURVA TÉRMICA",
        ["DATA", "HORÁRIO", "TEMPERATURA"],
        CURVA_ROWS,
        "Procurar o PSGO se temperatura maior ou igual a 37,8 ºC.",
      );
    case "curva-pressorica":
      return curva(
        "CURVA PRESSÓRICA",
        ["DATA E HORA", "PRESSÃO ARTERIAL"],
        CURVA_ROWS,
        "Se pressão arterial maior ou igual a 160 × 110 mmHg, procurar pronto atendimento.",
      );
    case "curva-glicemica":
      return curva(
        "CURVA GLICÊMICA",
        ["DATA", "JEJUM", "1H APÓS CAFÉ", "1H APÓS ALMOÇO", "1H APÓS JANTAR"],
        CURVA_ROWS,
        "Medir 1 hora após o INÍCIO das refeições.",
      );
    case "relatorio-toxo":
      return relatorioToxo(d);
    case "carta-sifilis":
      return cartaSifilis(d, true);
    case "carta-sifilis-parceiro":
      return cartaSifilis(d, false);
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

/**
 * Monta as folhas (sem wrapper HTML): curvas ESPELHADAS (mesma folha nas duas
 * metades); relatórios/cartas empacotados dois por folha (metades diferentes).
 */
export function receitaDocsSheetsHtml(
  ids: ReceitaDocId[],
  data: RelatorioData,
  lh: LaudoLetterhead = DEFAULT_LETTERHEAD,
): string {
  const sheets: string[] = [];
  let pending: string | null = null;
  const flush = () => {
    if (pending != null) {
      sheets.push(`<div class="mdoc-sheet">${coluna(lh, pending, "left")}<div class="mdoc-col right"></div></div>`);
      pending = null;
    }
  };
  for (const id of ids) {
    const content = buildDoc(id, data);
    if (MIRROR_DOCS.has(id)) {
      flush();
      // Espelhada: a mesma folha nas duas metades.
      sheets.push(`<div class="mdoc-sheet">${coluna(lh, content, "left")}${coluna(lh, content, "right")}</div>`);
    } else if (pending == null) {
      pending = content;
    } else {
      sheets.push(`<div class="mdoc-sheet">${coluna(lh, pending, "left")}${coluna(lh, content, "right")}</div>`);
      pending = null;
    }
  }
  flush();
  return sheets.join("");
}

export const RECEITA_DOCS_STYLE = `
  @page { size: A4 landscape; margin: 8mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 9.5pt; line-height: 1.3; color: #000; }
  /* Folha paisagem dividida em duas metades (como a receita). */
  .mdoc-sheet { display: flex; page-break-after: always; }
  .mdoc-sheet:last-child { page-break-after: auto; }
  .mdoc-col { flex: 1 1 0; min-width: 0; padding: 4mm 7mm; display: flex; flex-direction: column; min-height: 192mm; }
  .mdoc-col.left { border-right: 1px dashed #999; }
  .doc-body { flex: 1 1 auto; }
  .letterhead { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 2px 6px; border-bottom: 1.5px solid #000; margin-bottom: 8px; }
  .letterhead img { width: auto; object-fit: contain; }
  .lh-sus { height: 32px; } .lh-uftm { height: 38px; } .lh-hubrasil { height: 34px; }
  h1.titulo { text-align: center; font-size: 11pt; margin: 2px 0 10px; letter-spacing: .02em; }
  .idf { margin: 3px 0; }
  p { margin: 7px 0; }
  .just { text-align: justify; }
  .small { font-size: 8pt; color: #333; }
  .ln { display: inline-block; border-bottom: 1px solid #000; max-width: 100%; }
  .local { margin-top: 18px; }
  .sig { text-align: center; margin-top: 26px; }
  .sig.sig-carimbo { margin: 16px 0 20mm; }
  .sig-line { width: 70%; border-top: 1px solid #000; margin: 0 auto 4px; }
  .sig-nm { font-size: 9pt; }
  table.curva { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.curva th, table.curva td { border: 1px solid #000; padding: 4px 5px; text-align: center; font-size: 9pt; }
  table.curva th { background: #eee; }
  .rodape { margin-top: 8px; font-weight: 700; text-align: center; }
`;

/** HTML autocontido com os documentos selecionados (folha paisagem dividida). */
export function renderReceitaDocsHtml(
  ids: ReceitaDocId[],
  data: RelatorioData,
  lh: LaudoLetterhead = DEFAULT_LETTERHEAD,
): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Documentos da receita — PSGO</title>
<style>${RECEITA_DOCS_STYLE}</style></head>
<body>${receitaDocsSheetsHtml(ids, data, lh)}</body>
</html>`;
}

/**
 * Impressão combinada de vários blocos (ex.: receita do parceiro + carta),
 * cada bloco com seu próprio CSS. As classes não colidem (receita usa
 * `.sheet`/`.col`; documentos usam `.mdoc-*`).
 */
export function renderCombinedPrint(blocks: { style: string; sheets: string }[]): string {
  const styles = blocks.map((b) => b.style).join("\n");
  const body = blocks.map((b) => b.sheets).join("");
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><title>Impressão — PSGO</title>
<style>${styles}</style></head>
<body>${body}</body>
</html>`;
}
