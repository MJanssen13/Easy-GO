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

function brToSortKey(ddmmaaaa: string): number {
  const m = ddmmaaaa.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return Number.POSITIVE_INFINITY;
  return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`).getTime();
}

function isoToBR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Faz o parse do texto colado em entradas de sorologia (internas). */
export function parsePastedSerologies(text: string): SerologyEntry[] {
  const entries: SerologyEntry[] = [];
  const lineRe = /^-\s*\((\d{2}\/\d{2}\/\d{4})\)\s*:\s*(.*)$/;
  const alertRe = /^\*\*.*\*\*$/;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(lineRe);
    if (m) {
      entries.push({
        dateStr: m[1],
        sortKey: brToSortKey(m[1]),
        tokens: m[2].trim(),
        alerts: [],
        external: false,
      });
    } else if (alertRe.test(line)) {
      if (entries.length > 0) entries[entries.length - 1].alerts.push(line);
    } else if (entries.length > 0) {
      // continuação da linha anterior
      entries[entries.length - 1].tokens += ` ${line}`;
    }
  }
  return entries;
}

/** Converte o quadro de sorologias externas em entradas. */
export function gridToEntries(grid: SerologyGrid): SerologyEntry[] {
  return grid.columns
    .map((col) => {
      const tokens = SEROLOGY_ANALYTES.map((a) => {
        const v = grid.values[`${a}:${col.id}`]?.trim();
        return v ? `${a} ${v}` : null;
      }).filter(Boolean) as string[];
      return { col, tokens };
    })
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
