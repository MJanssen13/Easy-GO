/**
 * Plain-text generator for a Pré-Parto evolution note (evolução de trabalho de
 * parto), ready to paste into the medical record. Compact, line-oriented format
 * matching how the obstetric team writes partial evolutions.
 */
import type { Patient, Observation } from "@/core/patients/types";
import { currentGaLabel } from "@/core/patients/display";

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
  firm: "firme",
  intermediate: "intermediária",
  soft: "amolecida",
};

const REFLEX_LABELS: Record<string, string> = {
  present: "presente",
  absent: "ausente",
  increased: "aumentado",
  decreased: "diminuído",
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
