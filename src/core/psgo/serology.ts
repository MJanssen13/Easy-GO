/**
 * Sorologias: reconhece o formato colado do hospital
 *   -(dd/mm/aaaa): ANALITO RESULTADO / ANALITO RESULTADO / ...
 * e gera a saída combinada com as sorologias externas (quadro), marcando `EXT`
 * após a data. Linhas de alerta (**...**) são preservadas.
 */

/** Analitos do quadro de sorologias externas (ordem de exibição). */
export const SEROLOGY_ANALYTES = [
  "HIV",
  "HTLV",
  "VDRL",
  "TR-SÍFILIS",
  "FTA-ABS",
  "ANTIHBS",
  "HBSAG",
  "ANTIHCV",
  "TOXO-IGG",
  "TOXO-IGM",
  "CMV-IGM",
  "CMV-IGG",
  "RUB-IGG",
  "RUB-IGM",
];

/** Opções do VDRL: não reagente + titulações em diluições dobradas até 1:256. */
export const VDRL_TITERS = [
  "NR",
  "1:1",
  "1:2",
  "1:4",
  "1:8",
  "1:16",
  "1:32",
  "1:64",
  "1:128",
  "1:256",
];

export interface SerologyColumn {
  id: string;
  date: string; // ISO date
}

export interface SerologyGrid {
  columns: SerologyColumn[];
  /** Chave `${analyte}:${columnId}` → resultado (REAG/NR/titulação). */
  values: Record<string, string>;
}

export function emptySerologyGrid(): SerologyGrid {
  return { columns: [], values: {} };
}

interface SerologyEntry {
  dateStr: string; // dd/mm/aaaa
  sortKey: number; // timestamp p/ ordenação (Infinity se sem data)
  tokens: string;
  alerts: string[];
  external: boolean;
}

function brToSortKey(ddmmaa: string): number {
  const m = ddmmaa.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return Number.POSITIVE_INFINITY;
  const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
  const t = new Date(`${yr}-${m[2]}-${m[1]}T00:00:00`).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

function isoToBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/**
 * Faz o parse do texto colado em entradas de sorologia. Identifica apenas a data
 * dd/mm/aa(aa) no início da linha, ignorando a formatação ao redor (traço,
 * parênteses, ":"); reconhece o marcador `EXT` (coleta externa).
 */
export function parsePastedSerologies(text: string): SerologyEntry[] {
  const entries: SerologyEntry[] = [];
  // (opcional traço/parêntese) DATA (opcional EXT) (opcional ) e :) resto
  const lineRe = /^[\s\-(]*(\d{2}\/\d{2}\/\d{2,4})\s*(EXT)?\s*\)?\s*:?\s*(.*)$/i;
  const alertRe = /^\*\*.*\*\*$/;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (alertRe.test(line)) {
      if (entries.length > 0) entries[entries.length - 1].alerts.push(line);
      continue;
    }
    const m = line.match(lineRe);
    if (m) {
      entries.push({
        dateStr: m[1],
        sortKey: brToSortKey(m[1]),
        tokens: m[3].trim(),
        alerts: [],
        external: !!m[2],
      });
    } else if (entries.length > 0) {
      // continuação da linha anterior
      entries[entries.length - 1].tokens += ` ${line}`;
    }
  }
  return entries;
}

/**
 * Pares IGG/IGM com interpretação sorológica: numa mesma coleta, IGG e IGM não
 * reagentes → SUSCETÍVEL; apenas IGG reagente → IMUNE. Caso contrário mantém os
 * analitos individuais (ex.: IGM reagente = infecção recente).
 */
const IGG_IGM_GROUPS: { disease: string; igg: string; igm: string }[] = [
  { disease: "TOXO", igg: "TOXO-IGG", igm: "TOXO-IGM" },
  { disease: "CMV", igg: "CMV-IGG", igm: "CMV-IGM" },
  { disease: "RUB", igg: "RUB-IGG", igm: "RUB-IGM" },
];

/** Tokens de uma coleta externa (uma coluna), com a regra SUSCETÍVEL/IMUNE. */
function columnTokens(grid: SerologyGrid, colId: string): string[] {
  const val = (a: string) => grid.values[`${a}:${colId}`]?.trim() ?? "";
  const groupByAnalyte = new Map<string, (typeof IGG_IGM_GROUPS)[number]>();
  for (const g of IGG_IGM_GROUPS) {
    groupByAnalyte.set(g.igg, g);
    groupByAnalyte.set(g.igm, g);
  }
  const emitted = new Set<string>();
  const tokens: string[] = [];
  for (const a of SEROLOGY_ANALYTES) {
    const g = groupByAnalyte.get(a);
    if (g) {
      if (emitted.has(g.disease)) continue;
      emitted.add(g.disease);
      const igg = val(g.igg);
      const igm = val(g.igm);
      if (igg === "NR" && igm === "NR") {
        tokens.push(`${g.disease} SUSCETÍVEL`);
      } else if (igg === "REAG" && igm !== "REAG") {
        tokens.push(`${g.disease} IMUNE`);
      } else {
        if (igg) tokens.push(`${g.igg} ${igg}`);
        if (igm) tokens.push(`${g.igm} ${igm}`);
      }
      continue;
    }
    const v = val(a);
    if (v) tokens.push(`${a} ${v}`);
  }
  return tokens;
}

/** Converte o quadro de sorologias externas em entradas. */
export function gridToEntries(grid: SerologyGrid): SerologyEntry[] {
  return grid.columns
    .map((col) => ({ col, tokens: columnTokens(grid, col.id) }))
    .filter((x) => x.tokens.length > 0)
    .map(({ col, tokens }) => ({
      dateStr: isoToBR(col.date),
      sortKey: col.date ? new Date(`${col.date}T00:00:00`).getTime() : Number.POSITIVE_INFINITY,
      tokens: tokens.join(" / "),
      alerts: [],
      external: true,
    }));
}

/** Texto final das sorologias (colado + quadro externo), ordenado por data. */
export function renderSerologies(pasted: string, grid: SerologyGrid): string {
  const all = [...parsePastedSerologies(pasted), ...gridToEntries(grid)].sort(
    (a, b) => a.sortKey - b.sortKey,
  );
  const lines: string[] = [];
  for (const e of all) {
    lines.push(`-(${e.dateStr}${e.external ? " EXT" : ""}): ${e.tokens}`);
    for (const al of e.alerts) lines.push(al);
  }
  return lines.join("\n");
}
