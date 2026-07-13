/**
 * Utilitário para blocos de texto cujas entradas começam com uma data
 * "-(dd/mm/aa): ..." (ou dd/mm/aaaa). Usado para ordenar cronologicamente
 * exames laboratoriais e "outros exames de imagem", e para mesclá-los com
 * outras fontes (ex.: USGs) por data.
 */

// Reconhece a data dd/mm/aa(aa) no início da linha, ignorando a formatação ao
// redor (traço, parênteses, "EXT", ":" etc.).
const DATE_PREFIX = /^[\s\-(]*(\d{2}\/\d{2}\/\d{2,4})/;

/** Timestamp de uma data BR (aceita ano com 2 ou 4 dígitos); Infinity se inválida. */
export function brToTimestamp(ddmmaa: string): number {
  const m = ddmmaa.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
  if (!m) return Number.POSITIVE_INFINITY;
  const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
  const t = new Date(`${yr}-${m[2]}-${m[1]}T00:00:00`).getTime();
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
}

export interface DatedEntry {
  sortKey: number;
  /** Ordem de aparição (desempate estável). */
  order: number;
  text: string;
}

/**
 * Divide o texto em entradas: cada linha que começa com "-(data)" inicia uma
 * entrada; linhas seguintes sem data são continuação da entrada anterior.
 */
export function parseDatedText(text?: string | null): DatedEntry[] {
  if (!text?.trim()) return [];
  const entries: DatedEntry[] = [];
  let current: { sortKey: number; order: number; lines: string[] } | null = null;
  let order = 0;
  const flush = () => {
    if (current) entries.push({ sortKey: current.sortKey, order: current.order, text: current.lines.join("\n") });
    current = null;
  };
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;
    const m = line.match(DATE_PREFIX);
    if (m) {
      flush();
      current = { sortKey: brToTimestamp(m[1]), order: order++, lines: [line.trim()] };
    } else if (current) {
      current.lines.push(line.trim());
    } else {
      current = { sortKey: Number.POSITIVE_INFINITY, order: order++, lines: [line.trim()] };
    }
  }
  flush();
  return entries;
}

/** Reordena um bloco de texto por data (estável); entradas sem data vão ao fim. */
export function sortDatedText(text?: string | null): string {
  return parseDatedText(text)
    .slice()
    .sort((a, b) => a.sortKey - b.sortKey || a.order - b.order)
    .map((e) => e.text)
    .join("\n");
}
