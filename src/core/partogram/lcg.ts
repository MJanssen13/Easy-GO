/**
 * WHO Labour Care Guide (LCG) — estrutura das linhas e limiares de ALERTA.
 * Fonte: WHO. Labour Care Guide: User's Manual. Genebra: OMS, 2020
 * (coluna "Alert" de cada linha). A fase ativa começa em 5 cm (OMS 2018).
 * APOIO À DECISÃO — um alerta pede avaliação e registro de plano (seção 7);
 * validar com a equipe.
 */

export type LcgStage = "first" | "second";

export interface LcgRow {
  id: string;
  label: string;
  section: string;
  /** Opções (célula por clique) ou número livre. */
  options?: string[];
  numeric?: boolean;
  text?: boolean;
  /** Texto do limiar de alerta (mostrado na coluna "Alerta"). */
  alertLabel?: string;
  alert?: (value: string) => boolean;
  stages: LcgStage[];
}

function n(v: string): number | null {
  const x = Number(v.replace(",", "."));
  return v.trim() === "" || Number.isNaN(x) ? null : x;
}

export const LCG_SECTIONS = [
  "Cuidados de suporte",
  "Cuidados com o bebê",
  "Cuidados com a mulher",
  "Progresso do trabalho de parto",
  "Medicação",
] as const;

export const LCG_ROWS: LcgRow[] = [
  // 2 — Cuidados de suporte
  { id: "companion", label: "Acompanhante", section: "Cuidados de suporte", options: ["S", "N"], alertLabel: "N", alert: (v) => v === "N", stages: ["first", "second"] },
  { id: "pain", label: "Alívio da dor", section: "Cuidados de suporte", options: ["S", "N"], alertLabel: "N", alert: (v) => v === "N", stages: ["first", "second"] },
  { id: "oral", label: "Líquidos orais", section: "Cuidados de suporte", options: ["S", "N"], alertLabel: "N", alert: (v) => v === "N", stages: ["first"] },
  { id: "posture", label: "Posição", section: "Cuidados de suporte", options: ["SP", "MO"], alertLabel: "SP", alert: (v) => v === "SP", stages: ["first", "second"] },
  // 3 — Cuidados com o bebê
  {
    id: "fhr",
    label: "BCF basal",
    section: "Cuidados com o bebê",
    numeric: true,
    alertLabel: "<110, ≥160",
    alert: (v) => {
      const x = n(v);
      return x != null && (x < 110 || x >= 160);
    },
    stages: ["first", "second"],
  },
  { id: "decel", label: "Desaceleração", section: "Cuidados com o bebê", options: ["N", "P", "T", "V"], alertLabel: "T", alert: (v) => v === "T", stages: ["first", "second"] },
  { id: "fluid", label: "Líquido amniótico", section: "Cuidados com o bebê", options: ["I", "C", "M+", "M++", "M+++", "S"], alertLabel: "M+++, S", alert: (v) => v === "M+++" || v === "S", stages: ["first"] },
  { id: "position", label: "Posição fetal", section: "Cuidados com o bebê", options: ["OA", "OP", "OT"], alertLabel: "OP, OT", alert: (v) => v === "OP" || v === "OT", stages: ["first", "second"] },
  { id: "caput", label: "Bossa", section: "Cuidados com o bebê", options: ["0", "+", "++", "+++"], alertLabel: "+++", alert: (v) => v === "+++", stages: ["first", "second"] },
  { id: "moulding", label: "Cavalgamento", section: "Cuidados com o bebê", options: ["0", "+", "++", "+++"], alertLabel: "+++", alert: (v) => v === "+++", stages: ["first", "second"] },
  // 4 — Cuidados com a mulher
  {
    id: "pulse",
    label: "Pulso",
    section: "Cuidados com a mulher",
    numeric: true,
    alertLabel: "<60, ≥120",
    alert: (v) => {
      const x = n(v);
      return x != null && (x < 60 || x >= 120);
    },
    stages: ["first", "second"],
  },
  {
    id: "sbp",
    label: "PA sistólica",
    section: "Cuidados com a mulher",
    numeric: true,
    alertLabel: "<80, ≥140",
    alert: (v) => {
      const x = n(v);
      return x != null && (x < 80 || x >= 140);
    },
    stages: ["first", "second"],
  },
  {
    id: "dbp",
    label: "PA diastólica",
    section: "Cuidados com a mulher",
    numeric: true,
    alertLabel: "≥90",
    alert: (v) => {
      const x = n(v);
      return x != null && x >= 90;
    },
    stages: ["first", "second"],
  },
  {
    id: "temp",
    label: "Temperatura °C",
    section: "Cuidados com a mulher",
    numeric: true,
    alertLabel: "<35,0, ≥37,5",
    alert: (v) => {
      const x = n(v);
      return x != null && (x < 35 || x >= 37.5);
    },
    stages: ["first"],
  },
  { id: "protein", label: "Urina — proteína", section: "Cuidados com a mulher", options: ["P0", "P+", "P++"], alertLabel: "P++", alert: (v) => v === "P++", stages: ["first"] },
  { id: "acetone", label: "Urina — cetona", section: "Cuidados com a mulher", options: ["A0", "A+", "A++"], alertLabel: "A++", alert: (v) => v === "A++", stages: ["first"] },
  // 5 — Progresso
  {
    id: "contractions",
    label: "Contrações /10 min",
    section: "Progresso do trabalho de parto",
    numeric: true,
    alertLabel: "≤2, >5",
    alert: (v) => {
      const x = n(v);
      return x != null && (x <= 2 || x > 5);
    },
    stages: ["first", "second"],
  },
  {
    id: "duration",
    label: "Duração (s)",
    section: "Progresso do trabalho de parto",
    numeric: true,
    alertLabel: "<20, >60",
    alert: (v) => {
      const x = n(v);
      return x != null && (x < 20 || x > 60);
    },
    stages: ["first", "second"],
  },
  { id: "cervix", label: "Colo (cm)", section: "Progresso do trabalho de parto", numeric: true, alertLabel: "tempo no mesmo cm*", stages: ["first"] },
  { id: "descent", label: "Descida (quintos)", section: "Progresso do trabalho de parto", options: ["5/5", "4/5", "3/5", "2/5", "1/5", "0/5"], stages: ["first", "second"] },
  { id: "pushing", label: "Puxos", section: "Progresso do trabalho de parto", options: ["S", "N"], stages: ["second"] },
  // 6 — Medicação
  { id: "oxytocin", label: "Ocitocina", section: "Medicação", text: true, stages: ["first", "second"] },
  { id: "medicine", label: "Medicamentos", section: "Medicação", text: true, stages: ["first", "second"] },
  { id: "fluids", label: "Fluidos EV", section: "Medicação", options: ["S", "N"], stages: ["first", "second"] },
  { id: "initials", label: "Iniciais", section: "Medicação", text: true, stages: ["first", "second"] },
];

/**
 * Colo: alerta quando a dilatação não progride por (OMS LCG 2020):
 * 5 cm ≥ 6 h · 6 cm ≥ 5 h · 7 cm ≥ 3 h · 8 cm ≥ 2,5 h · 9 cm ≥ 2 h.
 */
export const CERVIX_ALERT_HOURS: Record<number, number> = { 5: 6, 6: 5, 7: 3, 8: 2.5, 9: 2 };

/**
 * Índices (meia hora) em que o colo está em alerta: a dilatação registrada não
 * mudou desde o primeiro registro daquele valor há ≥ o limite da tabela.
 */
export function cervixAlerts(cervixBySlot: (string | undefined)[]): Set<number> {
  const out = new Set<number>();
  let current: number | null = null;
  let since = -1;
  cervixBySlot.forEach((raw, i) => {
    if (raw == null || raw === "") return;
    const d = Math.floor(Number(raw.replace(",", ".")));
    if (Number.isNaN(d)) return;
    if (d !== current) {
      current = d;
      since = i;
      return;
    }
    const limit = CERVIX_ALERT_HOURS[d];
    if (limit != null && (i - since) / 2 >= limit) out.add(i);
  });
  return out;
}

/** 2ª fase: alerta se durar ≥ 3 h (nulípara) ou ≥ 2 h (multípara) — OMS LCG 2020. */
export function secondStageAlertHours(nulliparous: boolean): number {
  return nulliparous ? 3 : 2;
}

/**
 * Nulípara a partir da paridade no formato do serviço ("G1", "G2P1N", "G3P2C"):
 * com "P<n>" usa n; sem "P", só G1 é nulípara. Na dúvida → multípara (limiar
 * de 2 h, o mais precoce).
 */
export function isNulliparous(parity?: string | null): boolean {
  if (!parity) return false;
  const p = parity.toUpperCase().replace(/\s/g, "");
  const births = p.match(/P(\d+)/);
  if (births) return Number(births[1]) === 0;
  return /^G1$/.test(p);
}
