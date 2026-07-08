/**
 * Paridade obstétrica detalhada — CONVENÇÃO DO SERVIÇO (definida pela equipe):
 * G (gestações), P (desfechos) e o detalhamento N (partos normais), C
 * (cesáreas), F (fórceps), A (abortos), E (ectópicas).
 *
 * Regras:
 * - G conta todas as gestações (gemelar = 1 gestação); soma a atual quando a
 *   pessoa está gestante no momento.
 * - P soma TODOS os desfechos: partos (N, F, C) e também abortos (A).
 * - Ectópica conta como aborto e aparece aninhada em A. Ex.: A2(E1).
 * - Gemelar: via vaginal (N/F) conta 1 parto por feto; cesárea conta 1 parto
 *   para os dois fetos (1 cirurgia). Anota-se GEM2 junto à via; se as vias
 *   diferem, o detalhe vai em colchetes. Ex.: G2P3(N3(GEM2));
 *   G3P2(N1C1(GEM2)); G3P3(N2C1(GEM2[N1C1])).
 *
 * ATENÇÃO — literatura: na notação clássica (GPA/GTPAL — ACOG, Williams
 * Obstetrics, FEBRASGO), abortos/ectópicas NÃO somam em P (paridade = partos
 * ≥ 20–22 semanas) e gestação gemelar conta como 1 parto independentemente da
 * via. A convenção acima diverge disso por decisão do serviço — apoio à
 * documentação, validar com a equipe.
 */

export type PriorPregnancyType = "N" | "F" | "C" | "A" | "E";

/** Vias de parto (desfechos com nascimento). */
export type BirthRoute = "N" | "F" | "C";

export interface PriorPregnancy {
  id: string;
  type: PriorPregnancyType;
  year?: string;
  note?: string;
  /** Gestação gemelar (2 fetos) — só para desfechos de parto (N/F/C). */
  twin?: boolean;
  /** Via de parto do 2º gemelar (padrão: a mesma do 1º, `type`). */
  twinRoute2?: BirthRoute;
}

export const PRIOR_TYPE_LABELS: Record<PriorPregnancyType, string> = {
  N: "Parto normal",
  F: "Fórceps",
  C: "Cesárea",
  A: "Aborto",
  E: "Ectópica",
};

export const BIRTH_ROUTE_LABELS: Record<BirthRoute, string> = {
  N: "Normal",
  C: "Cesárea",
  F: "Fórceps",
};

export function isBirthType(t: PriorPregnancyType): t is BirthRoute {
  return t === "N" || t === "F" || t === "C";
}

/** Ordem das categorias no detalhamento (ex.: G5P4(N1C2A1)). */
const SUMMARY_ORDER = ["N", "C", "F", "A"] as const;
type SummaryCat = (typeof SUMMARY_ORDER)[number];

/** Via de cada feto de uma gestação com parto (2 se gemelar); null p/ A e E. */
export function pregnancyRoutes(p: PriorPregnancy): BirthRoute[] | null {
  if (!isBirthType(p.type)) return null;
  return p.twin ? [p.type, p.twinRoute2 ?? p.type] : [p.type];
}

/** Soma por categoria: vaginal (N/F) 1 por feto; cesárea 1 por gestação. */
function addRoutes(counts: Record<SummaryCat, number>, routes: BirthRoute[]): void {
  for (const r of routes) if (r !== "C") counts[r] += 1;
  if (routes.includes("C")) counts.C += 1;
}

/** Anotação de uma gestação gemelar: "GEM2" ou "GEM2[N1C1]" quando misto. */
function twinAnnotation(routes: BirthRoute[]): string {
  const gem = `GEM${routes.length}`;
  if (routes.every((r) => r === routes[0])) return gem;
  const counts: Record<SummaryCat, number> = { N: 0, C: 0, F: 0, A: 0 };
  addRoutes(counts, routes);
  const detail = SUMMARY_ORDER.filter((c) => counts[c] > 0)
    .map((c) => `${c}${counts[c]}`)
    .join("");
  return `${gem}[${detail}]`;
}

/** Categoria onde a anotação GEM aparece: a última via envolvida, na ordem. */
function twinAnnotationTarget(routes: BirthRoute[]): SummaryCat {
  let idx = 0;
  for (const r of routes) idx = Math.max(idx, SUMMARY_ORDER.indexOf(r));
  return SUMMARY_ORDER[idx];
}

export interface ParityResult {
  /** Ex.: "G5P4(N1C2A1)", "G5P5(N2C1A2(E1))", "G3P3(N2C1(GEM2[N1C1]))". */
  summary: string;
  /** Linhas por gestação prévia, ordenadas por ano. */
  lines: string[];
  /** Nº de cesáreas (cirurgias; gemelar por cesárea conta 1). */
  cesareanCount: number;
  /** true se multípara (≥1 gestação com parto: N, F ou C). */
  multipara: boolean;
}

/**
 * Monta o resumo e as linhas de paridade. `includesCurrent` soma a gestação
 * atual ao total de G (true quando a pessoa está gestante no momento).
 */
export function formatParity(prior: PriorPregnancy[], includesCurrent = true): ParityResult {
  const counts: Record<SummaryCat, number> = { N: 0, C: 0, F: 0, A: 0 };
  const annotations: Record<SummaryCat, string[]> = { N: [], C: [], F: [], A: [] };
  let ectopics = 0;
  let birthCount = 0;

  for (const p of prior) {
    const routes = pregnancyRoutes(p);
    if (!routes) {
      // Aborto (comum ou ectópico): conta em A e soma em P.
      counts.A += 1;
      if (p.type === "E") ectopics += 1;
      continue;
    }
    birthCount += 1;
    addRoutes(counts, routes);
    if (routes.length > 1) {
      annotations[twinAnnotationTarget(routes)].push(twinAnnotation(routes));
    }
  }
  if (ectopics > 0) annotations.A.push(`E${ectopics}`);

  const g = prior.length + (includesCurrent ? 1 : 0);
  const partos = SUMMARY_ORDER.reduce((sum, c) => sum + counts[c], 0);

  let detail = "";
  for (const cat of SUMMARY_ORDER) {
    if (counts[cat] === 0) continue;
    detail += `${cat}${counts[cat]}`;
    for (const ann of annotations[cat]) detail += `(${ann})`;
  }
  const summary = `G${g}P${partos}${detail ? `(${detail})` : ""}`;

  // Linhas por gestação, ordenadas por ano; numeração por tipo.
  const sorted = [...prior].sort((a, b) => {
    const ya = a.year ? Number(a.year) : Infinity;
    const yb = b.year ? Number(b.year) : Infinity;
    return ya - yb;
  });
  const perTypeIndex: Record<string, number> = {};
  const lines = sorted.map((p) => {
    perTypeIndex[p.type] = (perTypeIndex[p.type] ?? 0) + 1;
    const routes = pregnancyRoutes(p);
    const twin =
      routes && routes.length > 1
        ? routes.every((r) => r === routes[0])
          ? " GEMELAR"
          : ` GEMELAR (${routes.join("+")})`
        : "";
    const tag = `${p.type}${perTypeIndex[p.type]}${twin}`;
    const when = p.year ? ` EM ${p.year}` : "";
    const noteText = p.note ? p.note.trim().replace(/\s*\n+\s*/g, "; ") : "";
    const note = noteText ? `, ${noteText.toUpperCase()}` : "";
    return `${tag}${when}${note}`;
  });

  return { summary, lines, cesareanCount: counts.C, multipara: birthCount > 0 };
}
