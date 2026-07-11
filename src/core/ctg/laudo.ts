/**
 * Laudo imprimível da cardiotocografia (CTG) no formato do MODELO impresso
 * do HC-UFTM (papel timbrado UFTM · SUS · HUBRASIL). Gera um documento HTML
 * autocontido (CSS embutido) pronto para `window.print()` — ver `@/lib/print`.
 *
 * A pontuação segue `@/core/ctg/scoring` (apoio à decisão — validar com a
 * equipe). Campos sem dado no sistema (ex.: estímulos mecânicos) saem em branco,
 * como no modelo em papel, para preenchimento manual.
 */
import {
  computeCtgScore,
  suggestConclusion,
  type CtgVariability,
  type CtgPresence,
  type CtgAtMfRatio,
  type CtgDecelType,
  type CtgSoundStimulus,
} from "./scoring";

/** Caminhos padrão do papel timbrado (servidos de `public/laudo`). */
export const DEFAULT_LETTERHEAD: LaudoLetterhead = {
  uftm: "/laudo/uftm.png",
  sus: "/laudo/sus.jpg",
  hubrasil: "/laudo/hubrasil.png",
};

export interface LaudoLetterhead {
  uftm: string;
  sus: string;
  hubrasil: string;
}

/**
 * Papel timbrado com URLs absolutas (prefixadas pela origem). Necessário para a
 * impressão via iframe, cujo documento não resolve caminhos relativos.
 */
export function letterheadFor(origin: string): LaudoLetterhead {
  return {
    uftm: `${origin}${DEFAULT_LETTERHEAD.uftm}`,
    sus: `${origin}${DEFAULT_LETTERHEAD.sus}`,
    hubrasil: `${origin}${DEFAULT_LETTERHEAD.hubrasil}`,
  };
}

/** Dados de uma CTG + cabeçalho/rodapé para montar o laudo impresso. */
export interface CtgLaudoData {
  // Cabeçalho
  name: string;
  rg: string;
  /** Data já formatada para exibição (ex.: "03/07/2026"). */
  date: string;
  /** Hora da realização (ex.: "14:40"). */
  time: string;
  /** Hipótese diagnóstica (ex.: "GESTAÇÃO DE 36 SEMANAS E 4 DIAS"). */
  hd: string;

  // Parâmetros da CTG
  baseline: string;
  variability: CtgVariability | "" | null;
  accelerations: CtgPresence | "" | null;
  atMfRatio: CtgAtMfRatio | "" | null;
  movements: CtgPresence | "" | null;
  decelerations: CtgPresence | "" | null;
  decelerationType: CtgDecelType | "" | null;
  decelerationCount: string;
  contractions: CtgPresence | "" | null;
  soundStimulus: CtgSoundStimulus | "" | null;
  stimulusCount: string;
  /** Conclusão escolhida (um dos 7 rótulos) ou "" para usar a do escore. */
  conclusion: string;
  notes: string;

  // Rodapé
  /** Conduta (texto livre). */
  cd: string;
  /** Equipe de plantão (linhas já formatadas, ex.: "CHEFIA: ... | R3: ..."). */
  equipe: string;
}

const ACTIVITY = ["Feto ativo", "Feto hipoativo", "Feto inativo"];
const REACTIVITY = ["Reativo", "Hiporreativo", "Não reativo", "Bifásico"];

function esc(s: string): string {
  return String(s ?? "").replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string,
  );
}

/** Caixa de seleção (marcada/vazia) seguida do rótulo. */
function box(checked: boolean, label: string): string {
  return `<span class="box">${checked ? "&#9746;" : "&#9744;"}</span>${label}`;
}

/** Pontuação por parâmetro (mesma regra de `computeCtgScore`, decomposta). */
function points(d: CtgLaudoData): { base: number; varb: number; atmf: number; decel: number; total: number } {
  const bpm = d.baseline?.trim() ? Number(d.baseline) : NaN;
  const base = !Number.isNaN(bpm) && bpm >= 110 && bpm <= 160 ? 1 : 0;
  const varb = d.variability === "6-25" ? 1 : 0;
  const atmf = d.atMfRatio === "gte60" ? 2 : 0;
  const decel = d.decelerations === "absent" ? 1 : 0;
  const total = computeCtgScore({
    baseline: Number.isNaN(bpm) ? null : bpm,
    variability: d.variability || null,
    atMfRatio: d.atMfRatio || null,
    decelerations: d.decelerations || null,
  });
  return { base, varb, atmf, decel, total };
}

/** Monta o HTML autocontido do laudo (uma CTG por página A4). */
export function renderCtgLaudoHtml(
  d: CtgLaudoData,
  letterhead: LaudoLetterhead = DEFAULT_LETTERHEAD,
): string {
  const pts = points(d);

  const bpm = d.baseline?.trim() ? Number(d.baseline) : NaN;
  const baseLt100 = !Number.isNaN(bpm) && bpm < 100;
  const baseMid = !Number.isNaN(bpm) && bpm >= 100 && bpm <= 160;
  const baseGt160 = !Number.isNaN(bpm) && bpm > 160;

  const effective = d.conclusion || suggestConclusion(pts.total);
  const activity = ACTIVITY.includes(effective) ? effective : suggestConclusion(pts.total);
  const reactivity = REACTIVITY.includes(effective) ? effective : "";

  const decelPresent = d.decelerations === "present";
  const soundDone = d.soundStimulus === "done";
  const soundNot = d.soundStimulus === "not_done";

  const rows = `
    <tr>
      <td class="param">
        <div class="p-title">LINHA DE BASE : ${esc(d.baseline)}</div>
        <div class="g3">
          <span>${box(baseLt100, "&lt;100: 0 PONTOS")}</span>
          <span>${box(baseMid, "100 - 160: 1 PONTO")}</span>
          <span>${box(baseGt160, "&gt;160: 0 PONTOS")}</span>
        </div>
      </td>
      <td class="score">${pts.base}</td>
    </tr>
    <tr>
      <td class="param">
        <div class="p-title">VARIABILIDADE</div>
        <div class="g3">
          <span>${box(d.variability === "absent", "AUSENTE")}</span>
          <span>${box(d.variability === "lt5", "&lt;5: 0 PONTOS")}</span>
          <span>${box(d.variability === "6-25", "6 - 25: 1 PONTO")}</span>
          <span>${box(d.variability === "gt25", "&gt;25: 0 PONTOS")}</span>
          <span>${box(d.variability === "sinusoidal", "SINUSOIDAL: 0 PONTOS")}</span>
        </div>
      </td>
      <td class="score">${pts.varb}</td>
    </tr>
    <tr>
      <td class="param nested">
        <table class="sub"><tbody><tr>
          <td class="sub-l">
            <div class="p-title">ACELERAÇÕES TRANSITÓRIAS</div>
            <div class="rin">
              <span>${box(d.accelerations === "absent", "AUSENTES")}</span>
              <span>${box(d.accelerations === "present", "PRESENTES")}</span>
            </div>
          </td>
          <td class="sub-r">
            <div class="p-title">RELAÇÃO AT/MF</div>
            <div>${box(d.atMfRatio === "lt60", "&lt;60%: 0 PONTOS")}</div>
            <div>${box(d.atMfRatio === "gte60", "&gt;60%: OU 2 AT 20 MIN: 2 PONTOS")}</div>
          </td>
        </tr></tbody></table>
      </td>
      <td class="score">${pts.atmf}</td>
    </tr>
    <tr>
      <td class="param">
        <div class="p-title">DESACELERAÇÕES</div>
        <div class="rin">
          <span>${box(d.decelerations === "absent", "AUSENTES: 1 PONTOS")}</span>
          <span>${box(decelPresent, "PRESENTES: 0 PONTOS")}</span>
        </div>
        <div class="rin">
          <span>Nº DE DESACELERAÇÕES: ${esc(d.decelerationCount)}</span>
          <span>${box(decelPresent && d.decelerationType === "early", "PRECOCE")}</span>
          <span>${box(decelPresent && d.decelerationType === "late", "TARDIA")}</span>
          <span>${box(decelPresent && d.decelerationType === "variable", "VARIÁVEL")}</span>
        </div>
      </td>
      <td class="score">${pts.decel}</td>
    </tr>
    <tr>
      <td class="param nested">
        <table class="sub"><tbody><tr>
          <td class="sub-l">
            <div class="p-title">MOVIMENTAÇÃO FETAL</div>
            <div class="rin">
              <span>${box(d.movements === "absent", "AUSENTES")}</span>
              <span>${box(d.movements === "present", "PRESENTES")}</span>
            </div>
          </td>
          <td class="sub-r">
            <div class="p-title">CONTRAÇÕES</div>
            <div class="rin">
              <span>${box(d.contractions === "absent", "AUSENTES")}</span>
              <span>${box(d.contractions === "present", "PRESENTES")}</span>
            </div>
          </td>
        </tr></tbody></table>
      </td>
      <td class="score total">TOTAL:<div class="total-n">${pts.total}</div></td>
    </tr>`;

  const stim = `
    <table class="grid stim">
      <tbody>
      <tr>
        <th>ESTIMULOS SONOROS</th>
        <th>ESTIMULOS MECÂNICOS</th>
      </tr>
      <tr>
        <td>
          <div class="rin"><span>${box(soundDone, "REALIZADO")}</span><span>${box(soundNot, "NÃO REALIZADO")}</span></div>
          <div>Nº DE ESTIMULOS: ${soundDone ? esc(d.stimulusCount) : ""}</div>
        </td>
        <td>
          <div class="rin"><span>${box(false, "REALIZADO")}</span><span>${box(false, "NÃO REALIZADO")}</span></div>
          <div>Nº DE ESTIMULOS: </div>
        </td>
      </tr>
      </tbody>
    </table>`;

  const concluObs = `
    <div class="cbo">
      <div class="concl">
        <div class="sec-title">CONCLUSÃO:</div>
        <div>${box(activity === "Feto ativo", "FETO ATIVO: 4 OU 5 PONTOS")}</div>
        <div>${box(activity === "Feto hipoativo", "FETO HIPOATIVO: 2 OU 3 PONTOS")}</div>
        <div class="indent">${box(reactivity === "Reativo", "REATIVO")}</div>
        <div class="indent">${box(reactivity === "Hiporreativo", "HIPORREATIVO")}</div>
        <div class="indent">${box(reactivity === "Não reativo", "NÃO REATIVO")}</div>
        <div class="indent">${box(reactivity === "Bifásico", "BIFÁSICO")}</div>
        <div>${box(activity === "Feto inativo", "FETO INATIVO: 0 OU 1 PONTO")}</div>
      </div>
      <div class="obs">
        <div class="sec-title">OBSERVAÇÕES:</div>
        <div class="obs-val">${esc(d.notes)}</div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Laudo — Cardiotocografia</title>
<style>
  @page { size: A4; margin: 12mm 14mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10pt;
    line-height: 1.3;
    color: #000;
    text-transform: uppercase;
  }
  .sheet { width: 100%; }
  .letterhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 0 4px 8px;
    border-bottom: 1.5px solid #000;
  }
  .letterhead img { width: auto; object-fit: contain; }
  .lh-sus { height: 44px; }
  .lh-uftm { height: 50px; }
  .lh-hubrasil { height: 46px; }
  h1.doc-title {
    text-align: center;
    font-size: 16pt;
    letter-spacing: 1px;
    margin: 10px 0 12px;
  }
  .hdr { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .hdr td { padding: 3px 5px; vertical-align: bottom; }
  .hdr .lbl { font-weight: bold; white-space: nowrap; width: 1%; }
  .hdr .val { border-bottom: 1px dotted #666; }
  table.grid { width: 100%; border-collapse: collapse; }
  table.grid > tbody > tr > th,
  table.grid > tbody > tr > td { border: 1px solid #000; vertical-align: top; }
  table.grid > tbody > tr > th { background: #e9e9e9; text-align: center; padding: 4px 6px; }
  td.param { padding: 4px 7px; width: 84%; }
  td.param.nested { padding: 0; }
  .p-title { font-weight: bold; margin-bottom: 3px; }
  .g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px 10px; }
  .rin { display: flex; flex-wrap: wrap; gap: 2px 26px; }
  td.score {
    text-align: center;
    vertical-align: middle;
    font-size: 15pt;
    font-weight: bold;
    width: 16%;
    padding: 4px;
  }
  td.score.total { font-size: 10pt; }
  td.score.total .total-n { font-size: 16pt; margin-top: 2px; }
  table.sub { width: 100%; border-collapse: collapse; }
  table.sub td { border: none; padding: 4px 7px; vertical-align: top; width: 50%; }
  table.sub td.sub-l { border-right: 1px solid #000; }
  .stim { margin-top: 8px; }
  .stim td { width: 50%; padding: 4px 7px; }
  .stim td > div { margin: 2px 0; }
  .box { margin-right: 4px; font-size: 11pt; }
  .cbo { display: flex; gap: 20px; margin-top: 10px; }
  .cbo .concl { flex: 1 1 56%; }
  .cbo .obs { flex: 1 1 44%; }
  .sec-title { font-weight: bold; margin-bottom: 3px; }
  .concl > div { margin: 2px 0; }
  .concl .indent { padding-left: 28px; }
  .obs-val { min-height: 5em; white-space: pre-wrap; }
  .foot { margin-top: 14px; }
  .foot > div { margin: 10px 0; }
  .foot .lbl { font-weight: bold; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="letterhead">
      <img class="lh-sus" src="${esc(letterhead.sus)}" alt="SUS" />
      <img class="lh-uftm" src="${esc(letterhead.uftm)}" alt="UFTM" />
      <img class="lh-hubrasil" src="${esc(letterhead.hubrasil)}" alt="HUBRASIL" />
    </div>

    <h1 class="doc-title">CARDIOTOCOGRAFIA</h1>

    <table class="hdr">
      <tbody>
      <tr>
        <td class="lbl">NOME:</td><td class="val">${esc(d.name)}</td>
        <td class="lbl">RG:</td><td class="val">${esc(d.rg)}</td>
      </tr>
      <tr>
        <td class="lbl">DATA:</td><td class="val">${esc(d.date)}</td>
        <td class="lbl">HORA:</td><td class="val">${esc(d.time)}</td>
      </tr>
      <tr>
        <td class="lbl">HD:</td><td class="val" colspan="3">${esc(d.hd)}</td>
      </tr>
      </tbody>
    </table>

    <table class="grid">
      <tbody>
      <tr><th>PARÂMETRO AVALIADO</th><th class="score">PONTUAÇÃO</th></tr>
      ${rows}
      </tbody>
    </table>

    ${stim}

    ${concluObs}

    <div class="foot">
      <div><span class="lbl">CD:</span> DISCUTIDA COM EQUIPE, QUE ORIENTA: ${esc(d.cd)}</div>
      <div><span class="lbl">EQUIPE:</span> ${esc(d.equipe)}</div>
    </div>
  </div>
</body>
</html>`;
}
