/**
 * Plain-text generator for a Pré-Parto evolution note (evolução de trabalho de
 * parto), ready to paste into the medical record. Compact, line-oriented format
 * matching how the obstetric team writes partial evolutions.
 */
import type { Patient, Observation, ObstetricData } from "@/core/patients/types";
import type { CtgRecord } from "@/core/ctg/types";
import { renderCtgLine } from "@/core/ctg/render";
import { currentGaLabel } from "@/core/patients/display";
import { PATIENT_OUTCOME_LABELS } from "@/core/patients/status";
import { bishopScore, bishopInterpretation } from "@/core/obstetric/bishop";

/** Bishop a partir dos campos do toque (só quando os 5 componentes existem). */
function bishopFromObstetric(o: ObstetricData): number | null {
  const b = bishopScore({
    dilation: o.dilation,
    effacement: o.effacement,
    station: o.station,
    consistency: o.cervixConsistency,
    position: o.cervixPosition,
  });
  return b.complete ? b.total : null;
}

const PRESENTATION_LABELS: Record<string, string> = {
  cephalic: "cefálica",
  breech: "pélvica",
  transverse: "córmica",
};

const MEMBRANE_LABELS: Record<string, string> = {
  intact: "íntegra",
  ruptured_clear: "rota, líquido claro",
  ruptured_meconium: "rota, líquido meconial",
};

const CERVIX_POSITION_LABELS: Record<string, string> = {
  posterior: "posterior",
  intermediate: "intermediário",
  central: "centralizado",
};

const CERVIX_CONSISTENCY_LABELS: Record<string, string> = {
  nasal: "firme",
  nasolabial: "intermediária",
  labial: "amolecida",
};

const REFLEX_LABELS: Record<string, string> = {
  present: "presente",
  absent: "ausente",
  increased: "aumentado",
  decreased: "diminuído",
};

// --- Mapas compactos (formato do prontuário do hospital) ---
const CERVIX_POSITION_ABBR: Record<string, string> = {
  posterior: "P",
  intermediate: "I",
  central: "C",
};
const CERVIX_CONSISTENCY_ABBR: Record<string, string> = {
  nasal: "N",
  nasolabial: "NL",
  labial: "L",
};
const PRESENTATION_ABBR: Record<string, string> = {
  cephalic: "CEF",
  breech: "PELV",
  transverse: "CORM",
};
const MEMBRANE_ABBR: Record<string, string> = {
  intact: "ÍNTEGRA",
  ruptured_clear: "ROTA CLARA",
  ruptured_meconium: "ROTA MECONIAL",
};
const REFLEX_ABBR: Record<string, string> = {
  present: "PRESENTE",
  absent: "AUSENTE",
  increased: "AUMENTADO",
  decreased: "DIMINUÍDO",
};

/** Join non-empty "label: value" parts with " | ". */
function inline(parts: Array<string | null | undefined>): string | null {
  const kept = parts.filter((p): p is string => !!p && p.trim() !== "");
  return kept.length > 0 ? kept.join(" | ") : null;
}

function formatDateTimeBR(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export function renderEvolution(patient: Patient, obs: Observation): string {
  const ga = currentGaLabel(patient);
  const lines: string[] = [];

  lines.push("PRÉ-PARTO — EVOLUÇÃO");
  lines.push(formatDateTimeBR(obs.recordedAt));

  const idParts = inline([
    patient.name,
    patient.bed ? `Leito ${patient.bed}` : null,
    patient.parity ?? null,
    ga ? `IG ${ga}` : null,
  ]);
  if (idParts) lines.push(idParts);

  // --- Sinais vitais ---
  const v = obs.vitals;
  const pa =
    v.paSystolic != null && v.paDiastolic != null
      ? `PA ${v.paSystolic}×${v.paDiastolic} mmHg`
      : null;
  const vitals = inline([
    pa,
    v.fc != null ? `FC ${v.fc} bpm` : null,
    v.tax != null ? `Tax ${v.tax}°C` : null,
    v.spo2 != null ? `SpO₂ ${v.spo2}%` : null,
    v.dxt != null ? `Dxt ${v.dxt} mg/dL` : null,
  ]);
  if (vitals) {
    lines.push("");
    lines.push(`SINAIS VITAIS: ${vitals}`);
  }

  // PA ortostática (protocolo metildopa)
  if (v.paStandingSystolic != null && v.paStandingDiastolic != null) {
    lines.push(`PA em pé (Metildopa): ${v.paStandingSystolic}×${v.paStandingDiastolic} mmHg`);
  }

  // --- Dinâmica / BCF ---
  const o = obs.obstetric;
  const din = inline([
    o.dynamicsSummary ? `Dinâmica uterina ${o.dynamicsSummary}` : null,
    o.bcf != null ? `BCF ${o.bcf} bpm` : null,
  ]);
  if (din) {
    lines.push("");
    lines.push(din);
  }

  // --- Toque vaginal ---
  const tvHead = inline([
    o.dilation != null ? `Dilatação ${o.dilation} cm` : null,
    o.effacement != null ? `Esvaecimento ${o.effacement}%` : null,
    o.station != null ? `De Lee ${o.station > 0 ? `+${o.station}` : o.station}` : null,
    o.presentation ? `Apresentação ${PRESENTATION_LABELS[o.presentation]}` : null,
  ]);
  const tvColo = inline([
    o.cervixPosition ? `colo ${CERVIX_POSITION_LABELS[o.cervixPosition]}` : null,
    o.cervixConsistency ? CERVIX_CONSISTENCY_LABELS[o.cervixConsistency] : null,
  ]);
  const tvExtra = inline([
    o.membranes ? `Bolsa ${MEMBRANE_LABELS[o.membranes]}` : null,
    o.bloodOnGlove ? "sangue na luva" : null,
  ]);
  if (tvHead || tvColo || tvExtra || o.cervixObservation) {
    lines.push("");
    lines.push("TOQUE VAGINAL");
    if (tvHead) lines.push(tvHead);
    if (tvColo) lines.push(tvColo.charAt(0).toUpperCase() + tvColo.slice(1));
    if (tvExtra) lines.push(tvExtra);
    const bishop = bishopFromObstetric(o);
    if (bishop != null) lines.push(`Índice de Bishop: ${bishop} (${bishopInterpretation(bishop)})`);
    if (o.cervixObservation) lines.push(o.cervixObservation);
  }

  // --- Protocolo MgSO₄ ---
  if (obs.magnesiumData) {
    const m = obs.magnesiumData;
    const mg = inline([
      m.reflex ? `Reflexo patelar ${REFLEX_LABELS[m.reflex]}` : null,
      m.diuresis ? `Diurese ${m.diuresis}` : null,
      m.respiratoryRate != null ? `FR ${m.respiratoryRate} irpm` : null,
    ]);
    if (mg) {
      lines.push("");
      lines.push(`PROTOCOLO MgSO₄: ${mg}`);
    }
  }

  // --- Medicação ---
  if (obs.medication) {
    const md = obs.medication;
    const med = inline([
      md.misoprostolDose != null
        ? `Misoprostol ${md.misoprostolDose} mcg${md.misoprostolCount ? ` (${md.misoprostolCount}º)` : ""}`
        : null,
      md.oxytocinDose != null ? `Ocitocina ${md.oxytocinDose} ml/h` : null,
      md.antibiotic ? `ATB ${md.antibiotic}` : null,
      md.other ? md.other : null,
      md.notes ?? null,
    ]);
    if (med) {
      lines.push("");
      lines.push(`MEDICAÇÃO: ${med}`);
    }
  }

  // --- Conduta / observações ---
  if (obs.notes && obs.notes.trim() !== "") {
    lines.push("");
    lines.push("CONDUTA / OBSERVAÇÕES");
    lines.push(obs.notes.trim());
  }

  if (obs.examinerName) {
    lines.push("");
    lines.push(`Examinador(a): ${obs.examinerName}`);
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// ---------------------------------------------------------------------------
// Prontuário consolidado (formato compacto do HC-UFTM)
// ---------------------------------------------------------------------------

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Toque no formato compacto: "TOQUE: 70% AP, P, NL, 5CM, CEF, DE LEE -1, ÍNTEGRA, SSDL". */
export function renderToqueCompact(o: ObstetricData): string {
  const parts: string[] = [];

  if (o.effacement != null) parts.push(o.effacement === 0 ? "G" : `${o.effacement}% AP`);
  if (o.cervixPosition && CERVIX_POSITION_ABBR[o.cervixPosition])
    parts.push(CERVIX_POSITION_ABBR[o.cervixPosition]);
  if (o.cervixConsistency && CERVIX_CONSISTENCY_ABBR[o.cervixConsistency])
    parts.push(CERVIX_CONSISTENCY_ABBR[o.cervixConsistency]);

  if (o.dilation != null && o.dilation > 0) parts.push(`${o.dilation}CM`);
  else if (o.cervixStatus && o.cervixStatus.length > 0) parts.push(o.cervixStatus.join(", "));
  else if (o.dilation === 0) parts.push("0CM");

  if (o.presentation && PRESENTATION_ABBR[o.presentation]) parts.push(PRESENTATION_ABBR[o.presentation]);

  if (o.station != null) parts.push(o.station === -4 ? "AM" : `DE LEE ${o.station > 0 ? "+" : ""}${o.station}`);

  if (o.membranes && MEMBRANE_ABBR[o.membranes]) parts.push(MEMBRANE_ABBR[o.membranes]);
  if (o.bloodOnGlove !== undefined) parts.push(o.bloodOnGlove ? "SDL" : "SSDL");
  const bishop = bishopFromObstetric(o);
  if (bishop != null) parts.push(`BISHOP ${bishop}`);
  if (o.cervixObservation) parts.push(`OBS: ${o.cervixObservation}`);

  return parts.length > 0 ? `TOQUE: ${parts.join(", ")}` : "";
}

/** Uma linha compacta de evolução: "HH:MM HS | BCF: 140 BPM | PA: ... | TOQUE: ...". */
export function renderObservationLine(obs: Observation): string {
  const d = new Date(obs.recordedAt);
  const time = Number.isNaN(d.getTime()) ? "--:--" : `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  const v = obs.vitals;
  const o = obs.obstetric;
  const parts: string[] = [`${time} HS`];

  if (o.bcf != null) parts.push(`BCF: ${o.bcf} BPM`);
  if (v.paSystolic != null && v.paDiastolic != null) {
    let pa = `PA: ${v.paSystolic}X${v.paDiastolic} MMHG`;
    if (v.paStandingSystolic != null && v.paStandingDiastolic != null) {
      pa += ` (EM PÉ: ${v.paStandingSystolic}X${v.paStandingDiastolic})`;
    }
    parts.push(pa);
  }
  if (v.fc != null) parts.push(`FC: ${v.fc} BPM`);
  if (v.tax != null) parts.push(`TAX: ${v.tax}°C`);
  if (v.spo2 != null) parts.push(`SAT: ${v.spo2}%`);
  if (o.dynamicsSummary) parts.push(`DU ${o.dynamicsSummary}`);

  const toque = renderToqueCompact(o);
  if (toque) parts.push(toque);

  if (v.dxt != null) parts.push(`DXT: ${v.dxt} MG/DL`);

  if (obs.medication) {
    const md = obs.medication;
    if (md.misoprostolDose != null) {
      const count = md.misoprostolCount ? `${md.misoprostolCount}º ` : "";
      parts.push(`${count}MISO ${md.misoprostolDose}MCG`);
    }
    if (md.oxytocinDose != null) parts.push(`OCITOCINA ${md.oxytocinDose} ML/H`);
    if (md.antibiotic) parts.push(`ATB ${md.antibiotic}`);
    if (md.other) parts.push(md.other);
  }

  if (obs.magnesiumData) {
    const m = obs.magnesiumData;
    if (m.diuresis) parts.push(`DIURESE ${m.diuresis}`);
    if (m.reflex && REFLEX_ABBR[m.reflex]) parts.push(`REFLEXO ${REFLEX_ABBR[m.reflex]}`);
    if (m.respiratoryRate != null) parts.push(`FR ${m.respiratoryRate} IRPM`);
  }

  if (obs.notes && obs.notes.trim() !== "") parts.push(obs.notes.trim());

  return parts.join(" | ");
}

/**
 * Prontuário consolidado: evoluções agrupadas por data (# DD/MM/AA #), em linha
 * compacta; seção de CTGs; e linha de desfecho. Formato do HC-UFTM (MAIÚSCULAS).
 */
export function renderConsolidatedProntuario(
  patient: Patient,
  observations: Observation[],
  ctgs: CtgRecord[] = [],
): string {
  const lines: string[] = [];

  const sorted = [...observations].sort(
    (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
  );

  let lastDate = "";
  for (const obs of sorted) {
    const d = new Date(obs.recordedAt);
    const dateStr = `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
    if (dateStr !== lastDate) {
      lines.push(`# ${dateStr} #`);
      lastDate = dateStr;
    }
    lines.push(renderObservationLine(obs));
  }

  if (ctgs.length > 0) {
    const sortedCtgs = [...ctgs].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime(),
    );
    lines.push("");
    lines.push("--- CARDIOTOCOGRAFIAS ---");
    for (const c of sortedCtgs) lines.push(renderCtgLine(c));
  }

  if (patient.outcome && patient.outcome !== "none") {
    const label = PATIENT_OUTCOME_LABELS[patient.outcome] ?? "";
    const map: Record<string, string> = {
      vaginal_delivery: "EVOLUIU PARA PARTO NORMAL",
      c_section: "ENCAMINHADA PARA CESÁREA",
      discharge: "ALTA",
      transfer: "TRANSFERÊNCIA",
    };
    const outcomeLine = map[patient.outcome] ?? label.toUpperCase();
    if (outcomeLine) {
      lines.push("");
      lines.push(outcomeLine);
    }
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim().toUpperCase();
}
