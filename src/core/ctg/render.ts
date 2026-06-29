import type { CtgRecord } from "./types";
import { VARIABILITY_LABELS, AT_MF_LABELS, DECEL_TYPE_LABELS } from "./scoring";

function dateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

/** One-line CTG summary for the medical record (UPPERCASE, hospital style). */
export function renderCtgLine(ctg: CtgRecord): string {
  const parts: string[] = [];
  if (ctg.baseline != null) parts.push(`LINHA BASE ${ctg.baseline} BPM`);
  if (ctg.variability) parts.push(`VARIAB ${VARIABILITY_LABELS[ctg.variability]}`);
  if (ctg.atMfRatio) {
    const at = AT_MF_LABELS[ctg.atMfRatio].replace("<", "MENOR").replace(">", "MAIOR");
    parts.push(`AT/MF ${at}`);
  }
  if (ctg.decelerations) {
    let d = ctg.decelerations === "present" ? "PRESENTES" : "AUSENTES";
    if (ctg.decelerations === "present" && ctg.decelerationType) {
      d += ` (${DECEL_TYPE_LABELS[ctg.decelerationType].toUpperCase()}${
        ctg.decelerationCount ? ` x${ctg.decelerationCount}` : ""
      })`;
    }
    parts.push(`DESC ${d}`);
  }
  parts.push(`PONTUAÇÃO ${ctg.score}/5 - ${String(ctg.conclusion).toUpperCase()}`);
  if (ctg.notes) parts.push(`OBS: ${ctg.notes.toUpperCase()}`);

  return `[${dateTime(ctg.recordedAt)}] CTG: ${parts.join(" | ")}`;
}
