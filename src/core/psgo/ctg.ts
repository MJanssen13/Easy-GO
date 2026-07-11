/**
 * Laudo de cardiotocografia no PSGO, no mesmo formato do pré-parto
 * (escore 0-5, `core/ctg/scoring`). Apoio à decisão — validar com a equipe.
 */
import {
  computeCtgScore,
  suggestConclusion,
  VARIABILITY_LABELS,
  AT_MF_LABELS,
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
}

export function emptyPsgoCtg(): PsgoCtg {
  return {
    id: "",
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

const PRESENCE_UP: Record<CtgPresence, string> = { present: "PRESENTES", absent: "AUSENTES" };

/** Linha do laudo da CTG para o prontuário (sem timestamp). */
export function renderPsgoCtg(c: PsgoCtg): string {
  const parts: string[] = [];
  if (c.baseline) parts.push(`LINHA BASE ${c.baseline} BPM`);
  if (c.variability) parts.push(`VARIAB ${VARIABILITY_LABELS[c.variability]}`);
  if (c.accelerations) parts.push(`AT ${PRESENCE_UP[c.accelerations]}`);
  if (c.atMfRatio) {
    const at = AT_MF_LABELS[c.atMfRatio].replace("<", "MENOR").replace(">", "MAIOR");
    parts.push(`AT/MF ${at.toUpperCase()}`);
  }
  if (c.movements) parts.push(`MF ${PRESENCE_UP[c.movements]}`);
  if (c.decelerations) {
    let d = PRESENCE_UP[c.decelerations];
    if (c.decelerations === "present" && c.decelerationType) {
      d += ` (${DECEL_TYPE_LABELS[c.decelerationType].toUpperCase()}${
        c.decelerationCount ? ` x${c.decelerationCount}` : ""
      })`;
    }
    parts.push(`DESC ${d}`);
  }
  if (c.contractions) parts.push(`CONTRAÇÕES ${PRESENCE_UP[c.contractions]}`);
  if (c.soundStimulus === "done") {
    parts.push(`ESTÍMULO SONORO REALIZADO${c.stimulusCount ? ` x${c.stimulusCount}` : ""}`);
  }
  if (c.mechanicalStimulus === "done") {
    parts.push(
      `ESTÍMULO MECÂNICO REALIZADO${c.mechanicalStimulusCount ? ` x${c.mechanicalStimulusCount}` : ""}`,
    );
  }
  parts.push(`PONTUAÇÃO ${psgoCtgScore(c)}/5 - ${psgoCtgConclusion(c).toUpperCase()}`);
  if (c.notes.trim()) parts.push(`OBS: ${c.notes.trim().toUpperCase()}`);
  return parts.join(" | ");
}

/** Laudo com o horário na frente (quando informado). */
export function ctgLineWithTime(c: PsgoCtg): string {
  const t = c.time?.trim();
  return t ? `${t} - ${renderPsgoCtg(c)}` : renderPsgoCtg(c);
}

/**
 * Bloco de CTG do prontuário para uma ou mais CTGs. Vazio (sem CTGs) → "" para
 * omitir a seção. Uma CTG → linha única; várias → uma por linha.
 */
export function renderPsgoCtgs(list: PsgoCtg[]): string {
  if (!list.length) return "";
  if (list.length === 1) return `CTG: ${ctgLineWithTime(list[0])}`;
  return ["CTG:", ...list.map((c) => `- ${ctgLineWithTime(c)}`)].join("\n");
}
