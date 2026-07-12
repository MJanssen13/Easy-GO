/**
 * Laudo de cardiotocografia no PSGO, no mesmo formato do pré-parto
 * (escore 0-5, `core/ctg/scoring`). Apoio à decisão — validar com a equipe.
 */
import {
  computeCtgScore,
  suggestConclusion,
  VARIABILITY_LABELS,
  DECEL_TYPE_LABELS,
  type CtgVariability,
  type CtgPresence,
  type CtgAtMfRatio,
  type CtgDecelType,
  type CtgSoundStimulus,
} from "@/core/ctg/scoring";

export interface PsgoCtg {
  /** Identificador da CTG (uma admissão pode ter várias). */
  id: string;
  /** Data de realização (ISO YYYY-MM-DD). */
  date: string;
  /** Horário de realização (HH:MM). */
  time: string;
  baseline: string;
  variability: CtgVariability | "";
  accelerations: CtgPresence | "";
  atMfRatio: CtgAtMfRatio | "";
  movements: CtgPresence | "";
  decelerations: CtgPresence | "";
  decelerationType: CtgDecelType | "";
  decelerationCount: string;
  contractions: CtgPresence | "";
  soundStimulus: CtgSoundStimulus | "";
  stimulusCount: string;
  mechanicalStimulus: CtgSoundStimulus | "";
  mechanicalStimulusCount: string;
  /** Vazio = usa a conclusão sugerida pelo escore. */
  conclusion: string;
  notes: string;
  /** Conduta da CTG (texto livre); vazia = sai vazia no laudo. */
  cd: string;
}

export function emptyPsgoCtg(): PsgoCtg {
  return {
    id: "",
    date: "",
    time: "",
    baseline: "",
    variability: "6-25",
    accelerations: "present",
    atMfRatio: "gte60",
    movements: "present",
    decelerations: "absent",
    decelerationType: "",
    decelerationCount: "",
    contractions: "absent",
    soundStimulus: "not_done",
    stimulusCount: "",
    mechanicalStimulus: "not_done",
    mechanicalStimulusCount: "",
    conclusion: "",
    notes: "",
    cd: "",
  };
}

export function psgoCtgScore(c: PsgoCtg): number {
  return computeCtgScore({
    baseline: c.baseline ? Number(c.baseline) : null,
    variability: c.variability || null,
    atMfRatio: c.atMfRatio || null,
    decelerations: c.decelerations || null,
  });
}

export function psgoCtgConclusion(c: PsgoCtg): string {
  return c.conclusion || suggestConclusion(psgoCtgScore(c));
}

const PRESENCE_SIGN: Record<CtgPresence, string> = { present: "+", absent: "-" };
const AT_MF_SHORT: Record<CtgAtMfRatio, string> = {
  gte60: "≥2 AT EM 20 MIN",
  lt60: "<2 AT EM 20 MIN",
};

/** Estímulo (sonoro/mecânico): quantidade quando realizado, "-" quando não. */
function stimulusMark(state: CtgSoundStimulus | "", count: string): string {
  if (state === "done") return count.trim() || "+";
  if (state === "not_done") return "-";
  return "";
}

/** Data ISO (YYYY-MM-DD) → DD/MM/AA. */
function ctgDateShort(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}/${mm}/${yy}`;
}

/**
 * Linha da CTG para o prontuário (sem o timestamp), no formato compacto:
 * `LB 125 BPM / VARIAB 6-25 / AT + (≥2 AT EM 20 MIN) / ES - / EM 1 / MF + /
 * DESC - / CONTR - / FETO ATIVO (5 PTS) / OBS: ... / CD: ...`.
 */
export function renderPsgoCtg(c: PsgoCtg): string {
  const parts: string[] = [];
  if (c.baseline) parts.push(`LB ${c.baseline} BPM`);
  if (c.variability) parts.push(`VARIAB ${VARIABILITY_LABELS[c.variability].toUpperCase()}`);
  if (c.accelerations) {
    parts.push(
      `AT ${PRESENCE_SIGN[c.accelerations]}${c.atMfRatio ? ` (${AT_MF_SHORT[c.atMfRatio]})` : ""}`,
    );
  }
  const es = stimulusMark(c.soundStimulus, c.stimulusCount);
  if (es) parts.push(`ES ${es}`);
  const em = stimulusMark(c.mechanicalStimulus, c.mechanicalStimulusCount);
  if (em) parts.push(`EM ${em}`);
  if (c.movements) parts.push(`MF ${PRESENCE_SIGN[c.movements]}`);
  if (c.decelerations) {
    let d = `DESC ${PRESENCE_SIGN[c.decelerations]}`;
    if (c.decelerations === "present" && c.decelerationType) {
      d += ` (${DECEL_TYPE_LABELS[c.decelerationType].toUpperCase()}${
        c.decelerationCount.trim() ? ` x${c.decelerationCount.trim()}` : ""
      })`;
    }
    parts.push(d);
  }
  if (c.contractions) parts.push(`CONTR ${PRESENCE_SIGN[c.contractions]}`);
  parts.push(`${psgoCtgConclusion(c).toUpperCase()} (${psgoCtgScore(c)} PTS)`);
  if (c.notes.trim()) parts.push(`OBS: ${c.notes.trim().toUpperCase()}`);
  if (c.cd.trim()) parts.push(`CD: ${c.cd.trim().toUpperCase()}`);
  return parts.join(" / ");
}

/** Linha da CTG com "(DATA HORA)" na frente, quando informados. */
export function ctgLineWithTime(c: PsgoCtg): string {
  const stamp = [ctgDateShort(c.date), c.time?.trim()].filter(Boolean).join(" ");
  const line = renderPsgoCtg(c);
  return stamp ? `(${stamp}) ${line}` : line;
}

/**
 * Bloco de CTG do prontuário para uma ou mais CTGs. Vazio (sem CTGs) → "" para
 * omitir a seção. Cada CTG sai numa linha própria, com "- " na frente.
 */
export function renderPsgoCtgs(list: PsgoCtg[]): string {
  if (!list.length) return "";
  return ["CTG:", ...list.map((c) => `- ${ctgLineWithTime(c)}`)].join("\n");
}
