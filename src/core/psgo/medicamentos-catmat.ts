/**
 * Medicamentos do catálogo CATMAT (Ministério da Saúde) para pré-preencher a
 * receita: princípio ativo, concentração, forma e unidade de fornecimento vêm
 * da planilha oficial (`catmat-data`); a **via** e a **unidade de dose** são
 * inferidas da forma farmacêutica (melhor esforço, editáveis). Identidade do
 * produto — NÃO é recomendação de dose (a posologia é da equipe; ver CLAUDE.md).
 */
import { CATMAT_RAW } from "./catmat-data";

export interface MedCatmat {
  pa: string; // princípio ativo (DCB)
  conc: string; // concentração
  forma: string; // forma farmacêutica
  fornecimento: string; // unidade de fornecimento (CATMAT)
  via: string; // via inferida da forma
  unidade: string; // unidade de dose inferida da forma
}

/** Via de administração inferida da forma farmacêutica. */
function inferVia(forma: string): string {
  const f = forma.toLowerCase();
  if (f.includes("vaginal")) return "Vaginal";
  if (f.includes("oftálm") || f.includes("oftalm") || f.includes("colír") || f.includes("ocular"))
    return "Ocular";
  if (f.includes("otológ") || f.includes("otolog") || f.includes("auricular") || f.includes("ótic"))
    return "Otológica";
  if (f.includes("nasal")) return "Nasal";
  if (f.includes("retal") || f.includes("supositór") || f.includes("enema")) return "Retal";
  if (f.includes("inala") || f.includes("aerossol") || f.includes("spray")) return "Inalatória";
  if (f.includes("transdérm") || f.includes("transderm") || f.includes("adesivo"))
    return "Transdérmica";
  if (f.includes("sublingual")) return "Sublingual";
  if (f.includes("injet")) return "Intravenosa";
  if (
    f.includes("creme") ||
    f.includes("pomada") ||
    f.includes("gel") ||
    f.includes("loção") ||
    f.includes("locao") ||
    f.includes("tópic") ||
    f.includes("topic") ||
    f.includes("pasta")
  )
    return "Tópica";
  return "Oral";
}

/** Unidade de dose inferida da forma (mapeada às opções do seletor de dose). */
function inferUnidade(forma: string): string {
  const f = forma.toLowerCase();
  if (f.includes("comprimido") || f.includes("drág") || f.includes("drag")) return "comprimido";
  if (f.includes("cápsula") || f.includes("capsula")) return "cápsula";
  if (f.includes("injet") || f.includes("ampola")) return "ampola";
  if (f.includes("creme") || f.includes("pomada") || f.includes("gel") || f.includes("pasta"))
    return "aplicação";
  if (f.includes("inala") || f.includes("aerossol") || f.includes("spray")) return "jato";
  if (
    f.includes("oftálm") ||
    f.includes("oftalm") ||
    f.includes("colír") ||
    f.includes("nasal") ||
    f.includes("ótic") ||
    f.includes("otológ") ||
    f.includes("gota")
  )
    return "gota";
  if (
    f.includes("solução") ||
    f.includes("solucao") ||
    f.includes("suspens") ||
    f.includes("xarope")
  )
    return "mL";
  return "unidade";
}

export const CATMAT_MEDS: MedCatmat[] = CATMAT_RAW.map(([pa, conc, forma, fornecimento]) => ({
  pa,
  conc,
  forma,
  fornecimento,
  via: inferVia(forma),
  unidade: inferUnidade(forma),
}));

/** Rótulo de exibição/busca: "Dipirona sódica 500 mg — Comprimido". */
export function medCatmatLabel(m: MedCatmat): string {
  return m.conc ? `${m.pa} ${m.conc} — ${m.forma}` : `${m.pa} — ${m.forma}`;
}

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Busca por proximidade ao nome digitado (não alfabética): prioriza o princípio
 * ativo mais próximo do termo (igual > começa com > contém) e prefere os nomes
 * mais curtos, para o item procurado aparecer no topo em vez de percorrer todas
 * as apresentações. Todos os termos digitados precisam constar no rótulo.
 */
export function searchMeds(query: string, limit = 30): MedCatmat[] {
  const q = norm(query.trim());
  if (q.length < 2) return [];
  const tokens = q.split(/\s+/).filter(Boolean);

  const scored: { m: MedCatmat; score: number }[] = [];
  for (const m of CATMAT_MEDS) {
    const pa = norm(m.pa);
    const label = norm(medCatmatLabel(m));
    if (!tokens.every((t) => label.includes(t))) continue;

    let score = 0;
    if (pa === q) score += 1000;
    else if (pa.startsWith(q)) score += 600;
    else if (pa.includes(q)) score += 300;
    if (pa.split(/\s+/).some((w) => w.startsWith(tokens[0]))) score += 120;
    if (label.startsWith(q)) score += 80;
    // Preferir nomes mais curtos (mais próximos do termo) e menos apresentações.
    score -= pa.length * 0.5;
    score -= label.length * 0.1;

    scored.push({ m, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.m);
}
