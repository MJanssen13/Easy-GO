// Leitor dos arquivos ".trc" gravados pelos monitores fetais Edan (F2 / F3 /
// F3 Express). O formato é proprietário e não documentado publicamente — o
// layout abaixo foi obtido por engenharia reversa de gravações reais. Lógica de
// domínio pura (sem React); todo o processamento acontece no dispositivo.
//
// Estrutura observada (little-endian):
//   0x000  4 bytes   "trc " (assinatura)
//   0x004  uint32    offset onde começam os dados de amostra (= 1024)
//   0x00C  uint32    número de canais (= 3)
//   0x060  UTF-16LE  carimbo AAMMDDHHMM em dígitos ASCII ("2607030147")
//   0x138  uint8     dia
//   0x139  uint8     mês
//   0x13A  uint16    ano
//   0x144  uint32    número de amostras por canal (N)
//   0x400  N bytes   canal 0  — FHR2 (2º feto/gemelar; normalmente vazio)
//   0x400+N          canal 1  — FHR  (frequência cardíaca fetal, bpm)
//   0x400+2N         canal 2  — TOCO (atividade uterina, unidades relativas)
//
// Cada amostra é 1 byte com valor direto na unidade do canal. O valor 0xFF é o
// sentinela de "sem sinal" (perda de contato do transdutor / canal não usado).
// A taxa é de 1 amostra por segundo (1 Hz): uma das gravações tem exatamente
// 1217 amostras = 20 min 17 s (duração clássica de cardiotocografia anteparto) e
// a variabilidade entre amostras adjacentes (~1–3 bpm) corresponde a 1 Hz.

export const TRC_SAMPLE_RATE_HZ = 1;
const MAGIC = "trc ";
const OFF_DATA_PTR = 4;
const OFF_NCH = 12;
const OFF_TS = 0x60;
const OFF_DAY = 0x138;
const OFF_MONTH = 0x139;
const OFF_YEAR = 0x13a;
const OFF_NSAMPLES = 0x144;
const OFF_NEVENTS = 0x1c0; // 448 — número de registros de evento
const NO_SIGNAL = 0xff;

// Bloco de eventos: começa em dataOff + 4*N (após os 4 canais de N bytes) e tem
// `nEvents` registros de 116 bytes. Cada registro: [tipo u32][counter u32]
// [dia u8][mês u8][ano u16][posição_seg u32]…zeros. Tipo 3 = movimento fetal
// (botão de evento pressionado no exame); demais (1/4), com posição 0, = autozero
// do TOCO.
const EVENT_RECORD_SIZE = 116;
const EVENT_TYPE_FETAL_MOVEMENT = 3;

export interface CtgTraceDate {
  day: number;
  month: number;
  year: number;
}

export interface CtgTraceStats {
  /** Linha de base da FHR (mediana das amostras válidas), em bpm. */
  baselineFhr: number | null;
  /** Percentual de amostras de FHR com perda de sinal. */
  fhrLossPct: number;
  /** Duração da gravação em segundos. */
  durationSec: number;
}

export type CtgEventKind = "movimento" | "autozero";

export interface CtgEvent {
  /** Posição do evento em segundos a partir do início da gravação. */
  positionSec: number;
  /** Movimento fetal (botão de evento) ou autozero do TOCO. */
  kind: CtgEventKind;
  /** Código de tipo bruto do aparelho (3 = movimento fetal; 1/4 = autozero). */
  rawType: number;
}

export interface CtgTrace {
  fileName: string;
  sampleRateHz: number;
  /** Amostras por canal. */
  samples: number;
  date: CtgTraceDate | null;
  /** Horário de início "HH:MM" extraído do carimbo do arquivo. */
  startTime: string | null;
  /** FHR em bpm; `null` onde houve perda de sinal. */
  fhr: (number | null)[];
  /** TOCO em unidades relativas; `null` onde não há dado. */
  toco: (number | null)[];
  /** 2º canal fetal (gemelar); geralmente todo `null`. */
  fhr2: (number | null)[];
  /** Marcações e autozeros registrados durante o exame. */
  events: CtgEvent[];
  stats: CtgTraceStats;
}

export class TrcParseError extends Error {}

function readAsciiDigits(bytes: Uint8Array, start: number, end: number): string {
  let out = "";
  for (let i = start; i < end && i < bytes.length; i++) {
    const c = bytes[i];
    if (c >= 0x30 && c <= 0x39) out += String.fromCharCode(c);
  }
  return out;
}

function channelToValues(bytes: Uint8Array, start: number, n: number): (number | null)[] {
  const out: (number | null)[] = new Array(n);
  for (let i = 0; i < n; i++) {
    const v = bytes[start + i];
    out[i] = v === NO_SIGNAL || v === undefined ? null : v;
  }
  return out;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

/**
 * Decodifica um arquivo .trc do Edan em um traçado de cardiotocografia.
 * Lança {@link TrcParseError} se a assinatura ou o layout não forem válidos.
 */
export function parseTrc(buffer: ArrayBuffer, fileName = "trace.trc"): CtgTrace {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < OFF_NSAMPLES + 4) {
    throw new TrcParseError("Arquivo pequeno demais para ser um .trc válido.");
  }
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (magic !== MAGIC) {
    throw new TrcParseError(
      `Assinatura inesperada (${JSON.stringify(magic)}). Este não parece ser um arquivo .trc do Edan.`,
    );
  }

  const view = new DataView(buffer);
  const dataOff = view.getUint32(OFF_DATA_PTR, true);
  const nch = view.getUint32(OFF_NCH, true);
  const n = view.getUint32(OFF_NSAMPLES, true);

  if (n <= 0 || n > 1_000_000) {
    throw new TrcParseError(`Contagem de amostras implausível (${n}).`);
  }
  if (dataOff + Math.max(nch, 3) * n > bytes.length) {
    throw new TrcParseError(
      "Dados truncados: o cabeçalho indica mais amostras do que o arquivo contém.",
    );
  }

  // Data e horário.
  let date: CtgTraceDate | null = null;
  const day = bytes[OFF_DAY];
  const month = bytes[OFF_MONTH];
  const year = view.getUint16(OFF_YEAR, true);
  if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2100) {
    date = { day, month, year };
  }

  let startTime: string | null = null;
  const digits = readAsciiDigits(bytes, OFF_TS, OFF_TS + 44); // "AAMMDDHHMM"
  if (digits.length >= 10) {
    startTime = `${digits.slice(6, 8)}:${digits.slice(8, 10)}`;
  }

  // Canais: 0 = FHR2, 1 = FHR, 2 = TOCO.
  const ch0 = channelToValues(bytes, dataOff, n);
  const ch1 = channelToValues(bytes, dataOff + n, n);
  const ch2 = channelToValues(bytes, dataOff + 2 * n, n);

  // O transdutor Doppler pode ter sido conectado no canal 1 ou no 2; escolhe o
  // canal fetal que efetivamente tem sinal como a FHR principal.
  const ch1Valid = ch1.some((v) => v !== null);
  const fhr = ch1Valid ? ch1 : ch0;
  const fhr2 = ch1Valid ? ch0 : ch1;
  const toco = ch2;

  // Eventos (marcações + autozeros): logo após os 4 canais de N bytes.
  const events: CtgEvent[] = [];
  const nEvents = view.getUint32(OFF_NEVENTS, true);
  const eventBlock = dataOff + 4 * n;
  if (nEvents > 0 && nEvents < 10_000) {
    for (let i = 0; i < nEvents; i++) {
      const rs = eventBlock + i * EVENT_RECORD_SIZE;
      if (rs + 16 > bytes.length) break;
      const rawType = view.getUint32(rs, true);
      const positionSec = view.getUint32(rs + 12, true);
      if (positionSec > n) continue; // fora da gravação: registro inconsistente
      events.push({
        positionSec,
        rawType,
        kind: rawType === EVENT_TYPE_FETAL_MOVEMENT ? "movimento" : "autozero",
      });
    }
  }

  const fhrValid = fhr.filter((v): v is number => v !== null);
  const stats: CtgTraceStats = {
    baselineFhr: median(fhrValid),
    fhrLossPct: n > 0 ? (100 * (n - fhrValid.length)) / n : 0,
    durationSec: n / TRC_SAMPLE_RATE_HZ,
  };

  return { fileName, sampleRateHz: TRC_SAMPLE_RATE_HZ, samples: n, date, startTime, fhr, toco, fhr2, events, stats };
}

/** Formata segundos como "Xmin YYs" para exibição. */
export function formatTraceDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}min ${s.toString().padStart(2, "0")}s` : `${s}s`;
}

/** Formata a data da gravação como DD/MM/AAAA. */
export function formatTraceDate(d: CtgTraceDate | null): string | null {
  if (!d) return null;
  return `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}/${d.year}`;
}

/** Linha-resumo dos metadados de uma gravação. */
export function traceSummary(t: CtgTrace): string {
  const parts: string[] = [];
  const date = formatTraceDate(t.date);
  parts.push(date ? (t.startTime ? `${date} · início ${t.startTime}` : date) : "data —");
  parts.push(`duração ${formatTraceDuration(t.stats.durationSec)}`);
  parts.push(`linha de base ~${t.stats.baselineFhr ?? "—"} bpm`);
  parts.push(`perda de sinal ${t.stats.fhrLossPct.toFixed(0)}%`);
  return parts.join("  ·  ");
}
