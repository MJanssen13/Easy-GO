/**
 * Folha de parâmetros para impressão (modelo HC-UFTM "PARÂMETROS | SULFATO DE
 * MAGNÉSIO" e variante de sinais vitais gerais): uma linha por hora, preenchida
 * com as aferições registradas naquela hora; horas sem registro ficam em
 * branco para preenchimento à mão. Lógica pura (sem React).
 */
import type { Observation, Patient } from "@/core/patients/types";
import { gaFromLMP } from "@/core/obstetric/gestational-age";

export type SheetModel = "mgso4" | "vitais";

export const SHEET_MODELS: { id: SheetModel; label: string; title: string }[] = [
  { id: "mgso4", label: "Sulfato de magnésio", title: "PARÂMETROS | SULFATO DE MAGNÉSIO" },
  { id: "vitais", label: "Sinais vitais", title: "PARÂMETROS | SINAIS VITAIS" },
];

export interface SheetColumnDef {
  key: string;
  label: string;
  /** Largura relativa (fr). */
  w: number;
}

export const MODEL_COLUMNS: Record<SheetModel, SheetColumnDef[]> = {
  mgso4: [
    { key: "pa", label: "Pressão Arterial", w: 1.25 },
    { key: "fc", label: "Frequência Cardíaca", w: 1 },
    { key: "fr", label: "Frequência Respiratória", w: 1 },
    { key: "diurese", label: "Diurese", w: 1 },
    { key: "reflexo", label: "Reflexo Patelar", w: 1 },
    { key: "bcf", label: "BCF", w: 0.9 },
    { key: "obs", label: "Observações", w: 2.1 },
  ],
  vitais: [
    { key: "pa", label: "Pressão Arterial", w: 1.25 },
    { key: "fc", label: "FC", w: 0.7 },
    { key: "tax", label: "TAX", w: 0.7 },
    { key: "spo2", label: "SpO₂", w: 0.7 },
    { key: "dxt", label: "DXT", w: 0.7 },
    { key: "bcf", label: "BCF", w: 0.7 },
    { key: "du", label: "DU", w: 1 },
    { key: "toque", label: "Toque", w: 1.3 },
    { key: "obs", label: "Observações", w: 1.8 },
  ],
};

export interface SheetLine {
  hour: number; // 0–23
  /** Início da hora (para saber o dia). */
  at: Date;
  cells: Record<string, string>;
}

const pad = (n: number) => String(n).padStart(2, "0");
const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dec = (n: number) => String(n).replace(".", ",");

const REFLEX: Record<string, string> = { present: "+", decreased: "Diminuído", absent: "Ausente", increased: "Exaltado" };

function paText(o: Observation): string {
  const v = o.vitals;
  const parts: string[] = [];
  const lying = v.paSystolic != null && v.paDiastolic != null ? `${v.paSystolic}x${v.paDiastolic}` : "";
  const standing =
    v.paStandingSystolic != null && v.paStandingDiastolic != null ? `${v.paStandingSystolic}x${v.paStandingDiastolic}` : "";
  if (lying && standing) parts.push(`S ${lying}`, `P ${standing}`);
  else if (lying) parts.push(lying);
  else if (standing) parts.push(`P ${standing}`);
  return parts.join(" ");
}

function toqueText(o: Observation): string {
  const ob = o.obstetric;
  const p: string[] = [];
  if (ob.dilation != null) p.push(`${ob.dilation} cm`);
  else if (ob.cervixStatus?.length) p.push(ob.cervixStatus.join(", "));
  if (ob.station != null) p.push(ob.station === -4 ? "AM" : `DL ${ob.station > 0 ? "+" : ""}${ob.station}`);
  if (ob.membranes) p.push(ob.membranes === "intact" ? "BI" : ob.membranes === "ruptured_meconium" ? "BR mec." : "BR");
  return p.join(" ");
}

function obsText(o: Observation, model: SheetModel): string {
  const p: string[] = [];
  const m = o.medication;
  if (m?.misoprostolDose != null) p.push(`${m.misoprostolCount ? `${m.misoprostolCount}º ` : ""}Miso ${m.misoprostolDose}mcg`);
  if (m?.oxytocinDose != null) p.push(`Ocitocina ${dec(m.oxytocinDose)} ml/h`);
  if (m?.antibiotic) p.push(m.antibiotic);
  if (m?.other) p.push(m.other);
  if (model === "mgso4") {
    if (o.vitals.tax != null) p.push(`TAX ${dec(o.vitals.tax)}°C`);
    if (o.vitals.spo2 != null) p.push(`SpO₂ ${o.vitals.spo2}%`);
    if (o.vitals.dxt != null) p.push(`DXT ${o.vitals.dxt}`);
  }
  if (o.notes?.trim() && !/^EVOLUÇÃO (PUERPÉRIO|ONCOGINECOLOGIA)$/.test(o.notes.trim())) p.push(o.notes.trim());
  return p.join("; ");
}

function cellsOf(o: Observation, model: SheetModel): Record<string, string> {
  const v = o.vitals;
  const mg = o.magnesiumData;
  return {
    pa: paText(o),
    fc: v.fc != null ? String(v.fc) : "",
    fr: mg?.respiratoryRate != null ? String(mg.respiratoryRate) : "",
    diurese: mg?.diuresis ?? "",
    reflexo: mg?.reflex ? (REFLEX[mg.reflex] ?? mg.reflex) : "",
    bcf: o.obstetric.bcf != null ? String(o.obstetric.bcf) : "",
    tax: v.tax != null ? dec(v.tax) : "",
    spo2: v.spo2 != null ? String(v.spo2) : "",
    dxt: v.dxt != null ? String(v.dxt) : "",
    du: o.obstetric.dynamicsSummary ?? "",
    toque: toqueText(o),
    obs: obsText(o, model),
  };
}

/**
 * Linhas da folha: `hours` horas a partir de `start` (início de hora). Cada
 * aferição cai na hora em que foi feita; se não foi na hora cheia, a hora
 * exata aparece em Observações. Mais de uma aferição na mesma hora: os valores
 * são separados por " / ".
 */
export function buildSheetLines(
  observations: Observation[],
  start: Date,
  hours: number,
  model: SheetModel,
): SheetLine[] {
  const t0 = new Date(start);
  t0.setMinutes(0, 0, 0);
  const lines: SheetLine[] = Array.from({ length: hours }, (_, i) => {
    const at = new Date(t0.getTime() + i * 3600000);
    return { hour: at.getHours(), at, cells: {} };
  });
  const sorted = [...observations].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  for (const o of sorted) {
    const d = new Date(o.recordedAt);
    const idx = Math.floor((d.getTime() - t0.getTime()) / 3600000);
    const line = lines[idx];
    if (!line) continue;
    const c = cellsOf(o, model);
    if (d.getMinutes() !== 0) c.obs = [`(${hm(d)})`, c.obs].filter(Boolean).join(" ");
    for (const [k, val] of Object.entries(c)) {
      if (!val) continue;
      line.cells[k] = line.cells[k] ? `${line.cells[k]} / ${val}` : val;
    }
    // "(hh:mm)" sozinho em Observações não informa nada se a hora não teve dados.
    if (line.cells.obs && /^\(\d\d:\d\d\)$/.test(line.cells.obs.split(" / ").pop() ?? "")) {
      const others = Object.entries(line.cells).some(([k, v]) => k !== "obs" && v);
      if (!others) delete line.cells.obs;
    }
  }
  return lines;
}

/** Cabeçalho da folha a partir da paciente (data de referência = dia da folha). */
export function sheetHeader(p: Patient, ref: Date) {
  const robson = (p.clinicalSummary as { robsonGroup?: number | null } | null)?.robsonGroup;
  const days = Math.floor((ref.getTime() - new Date(p.admissionDate).getTime()) / 86400000);
  const usGa =
    p.usGaWeeks != null
      ? (() => {
          const total = p.usGaWeeks * 7 + (p.usGaDays ?? 0) + Math.max(0, days);
          return `${Math.floor(total / 7)}s ${total % 7}d`;
        })()
      : "";
  let dumGa = "";
  if (p.lmp && p.datingMethod !== "ultrasound") {
    try {
      const ga = gaFromLMP(new Date(`${p.lmp}T00:00:00`), ref);
      dumGa = `${ga.weeks}s ${ga.days}d`;
    } catch {
      dumGa = "";
    }
  }
  return {
    name: p.name,
    rg: p.medicalRecordNumber ?? "",
    age: p.age != null ? `${p.age} anos` : "",
    parity: p.parity ?? "",
    bloodType: p.bloodType ?? "",
    robson: robson != null ? `Grupo ${robson}` : "",
    comorbidities: (p.riskFactors ?? []).join(" + "),
    usGa,
    dumGa,
    bed: p.bed ?? "",
  };
}
