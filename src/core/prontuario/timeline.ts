/**
 * Linha do tempo das aferições para o prontuário (como o "Copiar para
 * prontuário" da plataforma original): agrupada por data, uma aferição por
 * linha, observações do partograma e CTGs ao final. Sai em MAIÚSCULAS.
 */
import type { Observation, Patient } from "@/core/patients/types";
import type { CtgRecord } from "@/core/ctg/types";
import { renderObservationLine } from "./preparto";
import { renderCtgLine } from "@/core/ctg/render";
import { readPartogram } from "@/core/partogram/types";

const pad = (n: number) => String(n).padStart(2, "0");
const dateKey = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;

export function renderTimeline(patient: Patient, observations: Observation[], ctgs: CtgRecord[] = []): string {
  const lines: string[] = [];
  let lastDay = "";
  const sorted = [...observations].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );
  for (const o of sorted) {
    const day = dateKey(new Date(o.recordedAt));
    if (day !== lastDay) {
      if (lines.length) lines.push("");
      lines.push(`# ${day} #`);
      lastDay = day;
    }
    lines.push(renderObservationLine(o));
  }

  const pg = readPartogram(patient.partogramData);
  if (patient.status === "partogram_open" || pg?.openedAt) {
    lines.push("", "ABERTO PARTOGRAMA E MANTIDOS DEMAIS PARÂMETROS REGISTRADOS EM PARTOGRAMA.");
  }
  if (pg?.observations?.trim()) lines.push(`OBSERVAÇÕES DO PARTOGRAMA: ${pg.observations.trim()}`);

  if (ctgs.length) {
    lines.push("", "--- CARDIOTOCOGRAFIAS ---");
    const sortedCtgs = [...ctgs].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
    for (const c of sortedCtgs) lines.push(renderCtgLine(c));
  }
  return lines.join("\n").toUpperCase();
}
