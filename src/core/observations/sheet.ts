/**
 * Planilha de aferições (lançar e editar em lote) — lógica pura, sem React.
 *
 * Cada linha da planilha é uma aferição; cada célula guarda TEXTO (como numa
 * planilha), convertido de/para `Observation` aqui. As colunas de lista aceitam
 * o rótulo ou um apelido digitado ("8", "rota", "n") e normalizam no `commit`.
 * Campos que não têm coluna (antibiótico, outra medicação, obs. do colo…) são
 * preservados ao editar uma aferição existente (mescla sobre o original).
 */
import type {
  MagnesiumData,
  Medication,
  NewObservationInput,
  Observation,
  ObstetricData,
  VitalSigns,
} from "@/core/patients/types";
import { parseDiuresisMlH, vitalAlerts, type VitalAlert } from "@/core/obstetric/alerts";

export type ColumnKind = "date" | "time" | "int" | "decimal" | "text" | "list";
export type ColumnGroup = "registro" | "fetal" | "vitais" | "toque" | "medicacao" | "mgso4" | "notas";

export interface SheetOption {
  value: string;
  label: string;
  /** Apelidos aceitos ao digitar (minúsculas, sem acento). */
  alias?: string[];
}

export interface SheetColumn {
  key: string;
  label: string;
  /** Rótulo curto no cabeçalho. */
  short?: string;
  kind: ColumnKind;
  group: ColumnGroup;
  width: number; // px
  options?: SheetOption[];
  min?: number;
  max?: number;
  placeholder?: string;
}

export const GROUP_LABELS: Record<ColumnGroup, string> = {
  registro: "Registro",
  fetal: "BCF / Dinâmica",
  vitais: "Sinais vitais",
  toque: "Toque",
  medicacao: "Medicação",
  mgso4: "MgSO₄",
  notas: "Conduta",
};

const DILATION_OPTIONS: SheetOption[] = [
  { value: "OEI", label: "OEI", alias: ["oei"] },
  { value: "OEEA", label: "OEEA", alias: ["oeea"] },
  { value: "OII", label: "OII", alias: ["oii"] },
  ...Array.from({ length: 11 }, (_, i) => ({ value: String(i), label: `${i} cm`, alias: [String(i), `${i}cm`] })),
];

export const SHEET_COLUMNS: SheetColumn[] = [
  { key: "date", label: "Data", kind: "date", group: "registro", width: 92, placeholder: "dd/mm/aa" },
  { key: "time", label: "Hora", kind: "time", group: "registro", width: 64, placeholder: "hh:mm" },
  { key: "bcf", label: "BCF (bpm)", short: "BCF", kind: "int", group: "fetal", width: 60, min: 50, max: 230 },
  { key: "du", label: "Dinâmica uterina", short: "DU", kind: "text", group: "fetal", width: 96, placeholder: "2x40''/10'" },
  { key: "pas", label: "PA sistólica", short: "PAS", kind: "int", group: "vitais", width: 56, min: 40, max: 260 },
  { key: "pad", label: "PA diastólica", short: "PAD", kind: "int", group: "vitais", width: 56, min: 20, max: 180 },
  { key: "pasPe", label: "PA sistólica em pé", short: "PAS pé", kind: "int", group: "vitais", width: 62, min: 40, max: 260 },
  { key: "padPe", label: "PA diastólica em pé", short: "PAD pé", kind: "int", group: "vitais", width: 62, min: 20, max: 180 },
  { key: "fc", label: "FC (bpm)", short: "FC", kind: "int", group: "vitais", width: 52, min: 20, max: 250 },
  { key: "tax", label: "Temperatura (°C)", short: "TAX", kind: "decimal", group: "vitais", width: 56, min: 30, max: 43 },
  { key: "spo2", label: "SpO₂ (%)", short: "SpO₂", kind: "int", group: "vitais", width: 56, min: 50, max: 100 },
  { key: "dxt", label: "Glicemia capilar (mg/dL)", short: "DXT", kind: "int", group: "vitais", width: 56, min: 10, max: 700 },
  { key: "dilation", label: "Dilatação / colo", short: "Dilat.", kind: "list", group: "toque", width: 70, options: DILATION_OPTIONS },
  {
    key: "effacement",
    label: "Esvaecimento",
    short: "Esvaec.",
    kind: "list",
    group: "toque",
    width: 74,
    options: [
      { value: "0", label: "Grosso (0%)", alias: ["g", "grosso", "0", "0%"] },
      ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => ({
        value: String(n),
        label: `${n}%`,
        alias: [String(n), `${n}%`],
      })),
    ],
  },
  {
    key: "position",
    label: "Posição do colo",
    short: "Posição",
    kind: "list",
    group: "toque",
    width: 96,
    options: [
      { value: "posterior", label: "Posterior", alias: ["p", "post"] },
      { value: "intermediate", label: "Intermediário", alias: ["i", "inter", "intermediario"] },
      { value: "central", label: "Central", alias: ["c", "cent"] },
    ],
  },
  {
    key: "consistency",
    label: "Consistência do colo",
    short: "Consist.",
    kind: "list",
    group: "toque",
    width: 88,
    options: [
      { value: "nasal", label: "Nasal", alias: ["n"] },
      { value: "nasolabial", label: "Nasolabial", alias: ["nl"] },
      { value: "labial", label: "Labial", alias: ["l"] },
    ],
  },
  {
    key: "station",
    label: "Altura (De Lee)",
    short: "De Lee",
    kind: "list",
    group: "toque",
    width: 62,
    options: [
      { value: "-4", label: "AM", alias: ["am", "-4", "alta e movel"] },
      ...[-3, -2, -1, 0, 1, 2, 3, 4].map((n) => {
        const label = n > 0 ? `+${n}` : String(n);
        return { value: String(n), label, alias: [label, String(n)] };
      }),
    ],
  },
  {
    key: "presentation",
    label: "Apresentação",
    short: "Apres.",
    kind: "list",
    group: "toque",
    width: 80,
    options: [
      { value: "cephalic", label: "Cefálica", alias: ["c", "cef", "cefalico", "cefalica"] },
      { value: "breech", label: "Pélvica", alias: ["p", "pelv", "pelvico", "pelvica"] },
      { value: "transverse", label: "Córmica", alias: ["cor", "corm", "cormico", "cormica", "transversa"] },
    ],
  },
  {
    key: "membranes",
    label: "Bolsa",
    kind: "list",
    group: "toque",
    width: 96,
    options: [
      { value: "intact", label: "Íntegra", alias: ["i", "int", "integra", "bi"] },
      { value: "ruptured_clear", label: "Rota clara", alias: ["r", "rota", "rc", "rota clara", "claro"] },
      { value: "ruptured_meconium", label: "Rota meconial", alias: ["m", "mec", "meconio", "rota meconial", "rm"] },
    ],
  },
  {
    key: "sdl",
    label: "Sangue em dedo de luva",
    short: "SDL",
    kind: "list",
    group: "toque",
    width: 52,
    options: [
      { value: "true", label: "Sim", alias: ["s", "sim", "1", "x"] },
      { value: "false", label: "Não", alias: ["n", "nao", "0"] },
    ],
  },
  {
    key: "miso",
    label: "Misoprostol (mcg)",
    short: "Miso",
    kind: "list",
    group: "medicacao",
    width: 58,
    options: ["25", "50", "100", "200"].map((v) => ({ value: v, label: v, alias: [v] })),
  },
  { key: "misoCount", label: "Nº do comprimido de miso", short: "Miso nº", kind: "int", group: "medicacao", width: 60, min: 1, max: 20 },
  { key: "oxy", label: "Ocitocina (ml/h)", short: "Ocito.", kind: "decimal", group: "medicacao", width: 60, min: 0, max: 200 },
  {
    key: "reflex",
    label: "Reflexo patelar",
    short: "Reflexo",
    kind: "list",
    group: "mgso4",
    width: 84,
    options: [
      { value: "present", label: "Presente", alias: ["p", "pres", "presente", "+"] },
      { value: "decreased", label: "Diminuído", alias: ["d", "dim", "diminuido", "hipo"] },
      { value: "absent", label: "Ausente", alias: ["a", "aus", "ausente", "-"] },
      { value: "increased", label: "Exaltado", alias: ["e", "ex", "exaltado", "hiper"] },
    ],
  },
  { key: "diuresis", label: "Diurese", kind: "text", group: "mgso4", width: 76, placeholder: "ml/h" },
  { key: "fr", label: "FR (irpm)", short: "FR", kind: "int", group: "mgso4", width: 48, min: 4, max: 60 },
  { key: "examiner", label: "Examinador(a)", short: "Exam.", kind: "text", group: "notas", width: 110 },
  { key: "notes", label: "Conduta / observações", short: "Conduta", kind: "text", group: "notas", width: 220 },
];

export const COLUMN_INDEX: Record<string, number> = Object.fromEntries(SHEET_COLUMNS.map((c, i) => [c.key, i]));

export type RowValues = Record<string, string>;

export interface SheetRow {
  /** Id local da linha (estável na tela). */
  rid: string;
  /** Id da aferição no banco (linhas já salvas). */
  obsId?: string;
  values: RowValues;
  /** Valores como estavam no banco — para saber se a linha mudou. */
  original?: RowValues;
  deleted?: boolean;
}

export function emptyValues(): RowValues {
  return Object.fromEntries(SHEET_COLUMNS.map((c) => [c.key, ""]));
}

// --------------------------------- datas ---------------------------------

const pad = (n: number) => String(n).padStart(2, "0");

export function dateLabel(d: Date): string {
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${String(d.getFullYear()).slice(-2)}`;
}
export function timeLabel(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** "23/09/26", "23/09/2026", "23/9", "23-09" → [ano, mês, dia] (ano atual se omitido). */
export function parseDate(s: string, ref = new Date()): [number, number, number] | null {
  const m = s.trim().match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  let y = m[3] ? Number(m[3]) : ref.getFullYear();
  if (y < 100) y += 2000;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const probe = new Date(y, mo - 1, d);
  if (probe.getMonth() !== mo - 1) return null;
  return [y, mo, d];
}

/** "14:30", "1430", "14h30", "14h", "14" → [h, m]. */
export function parseTime(s: string): [number, number] | null {
  const t = s.trim().toLowerCase().replace(/\s/g, "");
  const m = t.match(/^(\d{1,2})(?:[:h.]?(\d{2}))?h?$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mi = m[2] ? Number(m[2]) : 0;
  if (h > 23 || mi > 59) return null;
  return [h, mi];
}

export function rowDate(v: RowValues): Date | null {
  const d = parseDate(v.date ?? "");
  const t = parseTime(v.time ?? "");
  if (!d || !t) return null;
  return new Date(d[0], d[1] - 1, d[2], t[0], t[1], 0, 0);
}

// ---------------------------- normalização ----------------------------

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Valor digitado → valor canônico da opção (ou null se não reconhecido). */
export function matchOption(col: SheetColumn, raw: string): SheetOption | null {
  const t = fold(raw);
  if (!t || !col.options) return null;
  return (
    col.options.find((o) => fold(o.value) === t || fold(o.label) === t || (o.alias ?? []).includes(t)) ??
    col.options.find((o) => fold(o.label).startsWith(t)) ??
    null
  );
}

/**
 * Normaliza o texto digitado numa célula (como a planilha faz ao confirmar):
 * listas viram o rótulo da opção; data/hora no formato padrão; números com
 * vírgula decimal. Texto não reconhecido é mantido (fica marcado inválido).
 */
export function normalizeCell(col: SheetColumn, raw: string, ref = new Date()): string {
  const s = raw.trim();
  if (!s) return "";
  switch (col.kind) {
    case "list":
      return matchOption(col, s)?.label ?? s;
    case "date": {
      const d = parseDate(s, ref);
      return d ? `${pad(d[2])}/${pad(d[1])}/${String(d[0]).slice(-2)}` : s;
    }
    case "time": {
      const t = parseTime(s);
      return t ? `${pad(t[0])}:${pad(t[1])}` : s;
    }
    case "decimal":
      return s.replace(".", ",");
    default: {
      // Dinâmica abreviada "3x40" → "3x40''/10'" (contrações em 10 min).
      const du = col.key === "du" ? s.match(/^(\d+)\s*x\s*(\d+)$/i) : null;
      return du ? `${du[1]}x${du[2]}''/10'` : s;
    }
  }
}

const num = (s: string): number | undefined => {
  const t = s.trim().replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
};

/** Mensagem de erro da célula (vazio = ok). */
export function cellError(col: SheetColumn, value: string): string | null {
  const s = value.trim();
  if (!s) return null;
  if (col.kind === "list") return matchOption(col, s) ? null : `Valor não reconhecido para ${col.label}`;
  if (col.kind === "date") return parseDate(s) ? null : "Data inválida (dd/mm/aa)";
  if (col.kind === "time") return parseTime(s) ? null : "Hora inválida (hh:mm)";
  if (col.kind === "int" || col.kind === "decimal") {
    const n = num(s);
    if (n == null) return "Número inválido";
    if (col.kind === "int" && !Number.isInteger(n)) return "Use número inteiro";
    if (col.min != null && n < col.min) return `Abaixo do plausível (${col.min})`;
    if (col.max != null && n > col.max) return `Acima do plausível (${col.max})`;
  }
  return null;
}

/** Alertas clínicos da linha (mesmos critérios do formulário de aferição). */
export function rowAlerts(v: RowValues): { cols: Set<string>; alerts: VitalAlert[] } {
  const opt = (key: string) => matchOption(SHEET_COLUMNS[COLUMN_INDEX[key]!]!, v[key] ?? "")?.value;
  const alerts = vitalAlerts({
    bcf: num(v.bcf ?? ""),
    paSystolic: num(v.pas ?? ""),
    paDiastolic: num(v.pad ?? ""),
    fc: num(v.fc ?? ""),
    tax: num(v.tax ?? ""),
    spo2: num(v.spo2 ?? ""),
    mgReflex: opt("reflex") ?? null,
    respiratoryRate: num(v.fr ?? ""),
    diuresisMlH: parseDiuresisMlH(v.diuresis),
  });
  const cols = new Set<string>();
  for (const a of alerts) {
    if (a.text.startsWith("BCF")) cols.add("bcf");
    else if (a.text.startsWith("PA")) (cols.add("pas"), cols.add("pad"));
    else if (a.text.startsWith("TAX")) cols.add("tax");
    else if (a.text.startsWith("FC")) cols.add("fc");
    else if (a.text.startsWith("SpO")) cols.add("spo2");
    else if (a.text.startsWith("Reflexo")) cols.add("reflex");
    else if (a.text.startsWith("FR")) cols.add("fr");
    else if (a.text.startsWith("Diurese")) cols.add("diuresis");
  }
  return { cols, alerts };
}

// ------------------------- aferição ↔ linha -------------------------

const DATA_KEYS = SHEET_COLUMNS.filter((c) => c.group !== "registro" && c.key !== "examiner").map((c) => c.key);

export function hasData(v: RowValues): boolean {
  return DATA_KEYS.some((k) => (v[k] ?? "").trim() !== "");
}

const labelOf = (key: string, value: string | number | boolean | undefined | null): string => {
  if (value == null || value === "") return "";
  const col = SHEET_COLUMNS[COLUMN_INDEX[key]!]!;
  return col.options?.find((o) => o.value === String(value))?.label ?? String(value);
};
const str = (n: number | undefined | null, decimal = false) =>
  n == null ? "" : decimal ? String(n).replace(".", ",") : String(n);

export function observationToValues(o: Observation): RowValues {
  const d = new Date(o.recordedAt);
  const ob = o.obstetric ?? {};
  const v = o.vitals ?? {};
  const dil =
    ob.dilation != null ? labelOf("dilation", ob.dilation) : ob.cervixStatus?.length ? ob.cervixStatus[0]! : "";
  return {
    ...emptyValues(),
    date: dateLabel(d),
    time: timeLabel(d),
    bcf: str(ob.bcf),
    du: ob.dynamicsSummary ?? "",
    pas: str(v.paSystolic),
    pad: str(v.paDiastolic),
    pasPe: str(v.paStandingSystolic),
    padPe: str(v.paStandingDiastolic),
    fc: str(v.fc),
    tax: str(v.tax, true),
    spo2: str(v.spo2),
    dxt: str(v.dxt),
    dilation: dil,
    effacement: labelOf("effacement", ob.effacement),
    position: labelOf("position", ob.cervixPosition),
    consistency: labelOf("consistency", ob.cervixConsistency),
    station: labelOf("station", ob.station),
    presentation: labelOf("presentation", ob.presentation),
    membranes: labelOf("membranes", ob.membranes),
    sdl: ob.bloodOnGlove == null ? "" : labelOf("sdl", String(ob.bloodOnGlove)),
    miso: str(o.medication?.misoprostolDose),
    misoCount: str(o.medication?.misoprostolCount),
    oxy: str(o.medication?.oxytocinDose, true),
    reflex: labelOf("reflex", o.magnesiumData?.reflex),
    diuresis: o.magnesiumData?.diuresis ?? "",
    fr: str(o.magnesiumData?.respiratoryRate),
    examiner: o.examinerName ?? "",
    notes: o.notes ?? "",
  };
}

const prune = <T extends object>(o: T): T =>
  Object.fromEntries(Object.entries(o).filter(([, x]) => x !== undefined && x !== "")) as T;

/**
 * Linha → dados da aferição. `base` (aferição original) preserva os campos que
 * a planilha não mostra. Retorna null se faltar data/hora válida.
 */
export function valuesToObservation(
  patientId: string,
  v: RowValues,
  base?: Observation,
): (NewObservationInput & { recordedAt: string }) | null {
  const when = rowDate(v);
  if (!when) return null;
  const opt = (key: string) => matchOption(SHEET_COLUMNS[COLUMN_INDEX[key]!]!, v[key] ?? "")?.value;

  const vitals: VitalSigns = prune({
    paSystolic: num(v.pas ?? ""),
    paDiastolic: num(v.pad ?? ""),
    paStandingSystolic: num(v.pasPe ?? ""),
    paStandingDiastolic: num(v.padPe ?? ""),
    fc: num(v.fc ?? ""),
    tax: num(v.tax ?? ""),
    spo2: num(v.spo2 ?? ""),
    dxt: num(v.dxt ?? ""),
  });

  const dil = opt("dilation");
  const numericDil = dil != null && /^\d+$/.test(dil) ? Number(dil) : undefined;
  const sdl = opt("sdl");
  const keep = base?.obstetric ?? {};
  const obstetric: ObstetricData = prune({
    // preservados (sem coluna)
    cervixObservation: keep.cervixObservation,
    // OEI/OEEA/OII (colo sem dilatação numérica)
    cervixStatus: dil != null && numericDil == null ? [dil] : undefined,
    bcf: num(v.bcf ?? ""),
    dynamicsSummary: (v.du ?? "").trim() || undefined,
    dilation: numericDil,
    effacement: opt("effacement") != null ? Number(opt("effacement")) : undefined,
    cervixPosition: opt("position") as ObstetricData["cervixPosition"],
    cervixConsistency: opt("consistency") as ObstetricData["cervixConsistency"],
    station: opt("station") != null ? Number(opt("station")) : undefined,
    presentation: opt("presentation") as ObstetricData["presentation"],
    membranes: opt("membranes") as ObstetricData["membranes"],
    bloodOnGlove: sdl == null ? undefined : sdl === "true",
  });

  const med: Medication = prune({
    ...(base?.medication ?? {}),
    misoprostolDose: num(v.miso ?? ""),
    misoprostolCount: num(v.misoCount ?? ""),
    oxytocinDose: num(v.oxy ?? ""),
  });
  // Campos de medicação editáveis que foram apagados na planilha somem mesmo.
  if (!(v.miso ?? "").trim()) delete med.misoprostolDose;
  if (!(v.misoCount ?? "").trim()) delete med.misoprostolCount;
  if (!(v.oxy ?? "").trim()) delete med.oxytocinDose;

  const reflex = opt("reflex") as MagnesiumData["reflex"] | undefined;
  const diuresis = (v.diuresis ?? "").trim();
  const fr = num(v.fr ?? "");
  const magnesiumData: MagnesiumData | undefined =
    reflex || diuresis || fr != null ? prune({ reflex: reflex ?? "present", diuresis, respiratoryRate: fr }) : undefined;

  return {
    patientId,
    recordedAt: when.toISOString(),
    vitals,
    obstetric,
    medication: Object.keys(med).length ? med : undefined,
    magnesiumData,
    examinerName: (v.examiner ?? "").trim() || null,
    notes: (v.notes ?? "").trim() || null,
  };
}

export function rowChanged(r: SheetRow): boolean {
  if (!r.original) return hasData(r.values);
  return SHEET_COLUMNS.some((c) => (r.values[c.key] ?? "") !== (r.original![c.key] ?? ""));
}

// ----------------------------- geração -----------------------------

/** Horários de `from` (inclusive) até `to` (exclusive), a cada `stepMin`. */
export function timeSlots(from: Date, to: Date, stepMin: number, limit = 96): Date[] {
  const out: Date[] = [];
  for (let t = from.getTime(); t < to.getTime() && out.length < limit; t += stepMin * 60000) out.push(new Date(t));
  return out;
}

// ------------------------- copiar / colar -------------------------

/** Texto colado (TSV do Excel/Sheets, ou CSV com ;) → matriz de células. */
export function parseClipboard(text: string): string[][] {
  const clean = text.replace(/\r\n?/g, "\n").replace(/\n$/, "");
  if (!clean) return [];
  const lines = clean.split("\n");
  const sep = lines.some((l) => l.includes("\t")) ? "\t" : lines.every((l) => l.includes(";")) ? ";" : "\t";
  return lines.map((l) => l.split(sep).map((c) => c.replace(/^"(.*)"$/s, "$1").replace(/""/g, '"')));
}

export function toClipboard(matrix: string[][]): string {
  return matrix
    .map((r) => r.map((c) => (/[\t\n"]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join("\t"))
    .join("\n");
}
