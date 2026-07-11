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
        <div class="opts">
          <div>${box(baseLt100, "&lt;100: 0 PONTOS")}</div>
          <div>${box(baseMid, "100 - 160: 1 PONTO")}</div>
          <div>${box(baseGt160, "&gt;160: 0 PONTOS")}</div>
        </div>
      </td>
      <td class="score">${pts.base}</td>
    </tr>
    <tr>
      <td class="param">
        <div class="p-title">VARIABILIDADE</div>
        <div class="opts">
          <div>${box(d.variability === "absent", "AUSENTE")}</div>
          <div>${box(d.variability === "lt5", "&lt;5: 0 PONTOS")}</div>
          <div>${box(d.variability === "6-25", "6 - 25: 1 PONTO")}</div>
          <div>${box(d.variability === "gt25", "&gt;25: 0 PONTOS")}</div>
          <div>${box(d.variability === "sinusoidal", "SINUSOIDAL: 0 PONTOS")}</div>
        </div>
      </td>
      <td class="score">${pts.varb}</td>
    </tr>
    <tr>
      <td class="param">
        <div class="p-title">ACELERAÇÕES TRANSITÓRIAS / RELAÇÃO AT/MF</div>
        <div class="opts">
          <div>${box(d.accelerations === "absent", "AUSENTES")} &nbsp; ${box(d.accelerations === "present", "PRESENTES")}</div>
          <div>${box(d.atMfRatio === "lt60", "&lt;60%: 0 PONTOS")}</div>
          <div>${box(d.atMfRatio === "gte60", "&gt;60% OU 2 AT 20 MIN: 2 PONTOS")}</div>
        </div>
      </td>
      <td class="score">${pts.atmf}</td>
    </tr>
    <tr>
      <td class="param">
        <div class="p-title">DESACELERAÇÕES</div>
        <div class="opts">
          <div>${box(d.decelerations === "absent", "AUSENTES: 1 PONTO")} &nbsp; ${box(decelPresent, "PRESENTES: 0 PONTOS")}</div>
          <div>Nº DE DESACELERAÇÕES: ${esc(d.decelerationCount)}</div>
          <div>${box(decelPresent && d.decelerationType === "early", "PRECOCE")} &nbsp; ${box(decelPresent && d.decelerationType === "late", "TARDIA")} &nbsp; ${box(decelPresent && d.decelerationType === "variable", "VARIÁVEL")}</div>
        </div>
      </td>
      <td class="score">${pts.decel}</td>
    </tr>
    <tr>
      <td class="param">
        <div class="p-title">MOVIMENTAÇÃO FETAL / CONTRAÇÕES</div>
        <div class="opts">
          <div>MOVIMENTAÇÃO FETAL: ${box(d.movements === "absent", "AUSENTES")} &nbsp; ${box(d.movements === "present", "PRESENTES")}</div>
          <div>CONTRAÇÕES: ${box(d.contractions === "absent", "AUSENTES")} &nbsp; ${box(d.contractions === "present", "PRESENTES")}</div>
        </div>
      </td>
      <td class="score total">TOTAL:<br /><span class="total-n">${pts.total}</span></td>
    </tr>`;

  const stim = `
    <table class="grid stim">
      <tr>
        <th>ESTIMULOS SONOROS</th>
        <th>ESTIMULOS MECÂNICOS</th>
      </tr>
      <tr>
        <td>
          <div>${box(soundDone, "REALIZADO")} &nbsp; ${box(soundNot, "NÃO REALIZADO")}</div>
          <div>Nº DE ESTIMULOS: ${soundDone ? esc(d.stimulusCount) : ""}</div>
        </td>
        <td>
          <div>${box(false, "REALIZADO")} &nbsp; ${box(false, "NÃO REALIZADO")}</div>
          <div>Nº DE ESTIMULOS: </div>
        </td>
      </tr>
    </table>`;

  const conclusion = `
    <div class="concl">
      <div class="concl-title">CONCLUSÃO:</div>
      <div class="concl-cols">
        <div class="concl-col">
          <div>${box(activity === "Feto ativo", "FETO ATIVO: 4 OU 5 PONTOS")}</div>
          <div>${box(activity === "Feto hipoativo", "FETO HIPOATIVO: 2 OU 3 PONTOS")}</div>
          <div>${box(activity === "Feto inativo", "FETO INATIVO: 0 OU 1 PONTO")}</div>
        </div>
        <div class="concl-col">
          <div>${box(reactivity === "Reativo", "REATIVO")}</div>
          <div>${box(reactivity === "Hiporreativo", "HIPORREATIVO")}</div>
          <div>${box(reactivity === "Não reativo", "NÃO REATIVO")}</div>
          <div>${box(reactivity === "Bifásico", "BIFÁSICO")}</div>
        </div>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Laudo — Cardiotocografia</title>
<style>
  @page { size: A4; margin: 14mm 16mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: Arial, Helvetica, sans-serif;
    font-size: 10.5pt;
    line-height: 1.35;
    color: #000;
    text-transform: uppercase;
  }
  .sheet { width: 100%; }
  .letterhead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding-bottom: 8px;
    border-bottom: 1.5px solid #000;
  }
  .letterhead img { height: 46px; width: auto; object-fit: contain; }
  h1.doc-title {
    text-align: center;
    font-size: 15pt;
    letter-spacing: 1px;
    margin: 12px 0 10px;
  }
  .hdr { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  .hdr td { padding: 2px 4px; font-size: 10.5pt; vertical-align: bottom; }
  .hdr .lbl { font-weight: bold; white-space: nowrap; }
  .hdr .val { border-bottom: 1px dotted #555; width: 40%; }
  .hdr .val-wide { border-bottom: 1px dotted #555; }
  table.grid { width: 100%; border-collapse: collapse; }
  table.grid th, table.grid td { border: 1px solid #000; padding: 5px 7px; vertical-align: top; }
  table.grid th { background: #eee; text-align: left; font-size: 10.5pt; }
  .grid .param { width: 82%; }
  .grid .p-title { font-weight: bold; margin-bottom: 3px; }
  .grid .opts > div { margin: 1px 0; }
  .grid .score {
    text-align: center;
    vertical-align: middle;
    font-size: 15pt;
    font-weight: bold;
    width: 18%;
  }
  .grid .score.total { font-size: 10.5pt; font-weight: bold; }
  .grid .score .total-n { font-size: 17pt; }
  .stim { margin-top: 8px; }
  .stim th { text-align: center; }
  .stim td { width: 50%; }
  .stim td > div { margin: 2px 0; }
  .box { font-size: 12pt; margin-right: 4px; }
  .concl { margin-top: 10px; border: 1px solid #000; padding: 6px 8px; }
  .concl-title { font-weight: bold; margin-bottom: 4px; }
  .concl-cols { display: flex; gap: 24px; }
  .concl-col > div { margin: 2px 0; }
  .concl-col:first-child { flex: 1 1 55%; }
  .foot { margin-top: 10px; }
  .foot > div { margin: 6px 0; }
  .foot .lbl { font-weight: bold; }
  .foot .val { border-bottom: 1px dotted #555; min-height: 1.2em; display: inline-block; min-width: 60%; }
  .obs .val { display: block; min-height: 2.4em; width: 100%; }
</style>
</head>
<body>
  <div class="sheet">
    <div class="letterhead">
      <img src="${esc(letterhead.uftm)}" alt="UFTM" />
      <img src="${esc(letterhead.sus)}" alt="SUS" />
      <img src="${esc(letterhead.hubrasil)}" alt="HUBRASIL" />
    </div>

    <h1 class="doc-title">CARDIOTOCOGRAFIA</h1>

    <table class="hdr">
      <tr>
        <td class="lbl">NOME:</td><td class="val">${esc(d.name)}</td>
        <td class="lbl">DATA:</td><td class="val">${esc(d.date)}</td>
      </tr>
      <tr>
        <td class="lbl">RG:</td><td class="val">${esc(d.rg)}</td>
        <td class="lbl">HORA:</td><td class="val">${esc(d.time)}</td>
      </tr>
      <tr>
        <td class="lbl">HD:</td><td class="val-wide" colspan="3">${esc(d.hd)}</td>
      </tr>
    </table>

    <table class="grid">
      <tr><th>PARÂMETRO AVALIADO</th><th class="score">PONTUAÇÃO</th></tr>
      ${rows}
    </table>

    ${stim}

    ${conclusion}

    <div class="foot">
      <div class="obs"><span class="lbl">OBSERVAÇÕES:</span> <span class="val">${esc(d.notes)}</span></div>
      <div><span class="lbl">CD:</span> DISCUTIDA COM EQUIPE, QUE ORIENTA: <span class="val">${esc(d.cd)}</span></div>
      <div><span class="lbl">EQUIPE:</span> <span class="val">${esc(d.equipe)}</span></div>
    </div>
  </div>
</body>
</html>`;
}
