/**
 * Partograma — gravado em `patients.partogram_data` (JSON, coluna já existente).
 *
 * Dois modelos, sempre disponíveis sobre os MESMOS dados:
 * - "oms": WHO Labour Care Guide (LCG, 2020);
 * - "uftm": Ficha de Trabalho de Parto do HC-UFTM (modelo antigo, portado da
 *   plataforma original "Preparto" — campos de topo compatíveis com o que ela
 *   gravava: startTime, points, contractionBlocks, tableData, headerData...).
 *
 * As aferições registradas após a abertura (`observations`) preenchem os dois
 * modelos automaticamente; o que for lançado à mão na folha fica aqui e
 * prevalece sobre o automático na mesma célula.
 */

export type PartogramModel = "oms" | "uftm";

// ---------------------------- Ficha HC-UFTM (legado) ----------------------------

export interface UftmPoint {
  x: number; // índice da hora (0-15); BCF usa fração (minuto/60)
  y: number; // dilatação 0-10 | estação mapeada (6 - De Lee) | BCF 80-180
  type: "dilation" | "station" | "fcf";
  variety?: string; // P, PS, PP, O, B, N, M
  rotation?: number;
}

export type ContractionStrength = "weak" | "moderate" | "strong";

export interface UftmContractionBlock {
  x: number; // hora
  slot: number; // 0-4 (0 = embaixo)
  type: ContractionStrength;
}

export interface UftmTableColumn {
  hourIndex: number;
  registerHour?: string;
  realTime: string;
  date?: string;
  amnioticFluid: string; // Bolsa
  la: string;
  oxytocin: string;
  meds: string;
  examiner: string;
  notes: string;
}

export interface UftmHeader {
  date: string;
  id: string;
  name: string;
  age: string;
  dum: string;
  dpp: string;
  ig: string;
  us: string;
  parity: string;
  bloodType: string;
  babyName: string;
}

// ------------------------------ OMS — LCG 2020 ------------------------------

/** Valores de uma coluna do LCG (1ª fase: meia hora; 2ª fase: 15 min). */
export type LcgCell = Record<string, string>;

export interface LcgData {
  /** Identificação / características do trabalho de parto (seção 1). */
  info: {
    laborOnset: "" | "espontaneo" | "induzido";
    activeLaborAt: string; // ISO — diagnóstico da fase ativa (≥ 5 cm)
    membranesRupturedAt: string; // ISO
    riskFactors: string;
  };
  /** 1ª fase: chave = índice da meia hora desde a abertura ("0".."23"). */
  first: Record<string, LcgCell>;
  /** 2ª fase: início (ISO) e células de 15 min ("0".."11"). */
  secondStageAt: string;
  second: Record<string, LcgCell>;
  /** Avaliação e plano (seção 7), por hora. */
  plans: Record<string, string>;
}

export interface PartogramData {
  version?: 2;
  model?: PartogramModel;
  /** Hora de abertura (= coluna 0). `startTime` é o nome legado. */
  openedAt?: string;
  startTime?: string;

  // Ficha HC-UFTM (lançamentos manuais; formato da plataforma original)
  points?: UftmPoint[];
  contractionBlocks?: UftmContractionBlock[];
  tableData?: UftmTableColumn[];
  activePhaseStartIndex?: number;
  headerData?: Partial<UftmHeader>;
  observations?: string;

  // OMS
  lcg?: LcgData;
}

export function emptyLcg(): LcgData {
  return {
    info: { laborOnset: "", activeLaborAt: "", membranesRupturedAt: "", riskFactors: "" },
    first: {},
    secondStageAt: "",
    second: {},
    plans: {},
  };
}

export function readPartogram(raw: unknown): PartogramData | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as PartogramData;
  const openedAt = p.openedAt ?? p.startTime;
  if (!openedAt) return null;
  return {
    ...p,
    version: 2,
    model: p.model ?? (p.points || p.tableData ? "uftm" : "oms"),
    openedAt,
    startTime: openedAt,
    lcg: { ...emptyLcg(), ...(p.lcg ?? {}), info: { ...emptyLcg().info, ...(p.lcg?.info ?? {}) } },
  };
}
