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

/** Minúsculas sem acentos, para casar formas/princípios com/sem acentuação. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Via de administração pré-selecionada a partir da **forma farmacêutica** e do
 * **princípio ativo**, seguindo as convenções de bula/ANVISA por forma (a via é
 * sempre editável). Exceções por princípio ativo (via padrão da apresentação):
 * insulinas → Subcutânea; benzilpenicilina → Intramuscular; heparinas de baixo
 * peso molecular → Subcutânea.
 */
function inferVia(forma: string, pa: string): string {
  const p = norm(pa);
  if (p.includes("insulina")) return "Subcutânea";
  if (p.includes("benzilpenicilina")) return "Intramuscular";
  if (
    p.includes("enoxaparina") ||
    p.includes("dalteparina") ||
    p.includes("nadroparina") ||
    p.includes("fondaparinux")
  )
    return "Subcutânea";

  const f = norm(forma);
  // Injetável com rota indicada na própria forma.
  if (/\bim\b/.test(f) || f.includes("intramuscular")) return "Intramuscular";
  if (f.includes("intra-ocular") || f.includes("intraocular") || f.includes("intravitre"))
    return "Ocular";
  // Locais específicos (antes de tópica/inalatória).
  if (f.includes("vaginal") || f.includes("ovulo")) return "Vaginal";
  if (f.includes("retal") || f.includes("suposit") || f.includes("enema")) return "Retal";
  if (f.includes("oftalm") || f.includes("colir") || f.includes("ocular")) return "Ocular";
  if (f.includes("otolog") || f.includes("auricular") || f.includes("otic")) return "Otológica";
  if (f.includes("nasal")) return "Nasal"; // inclui aerossol/spray/solução nasal
  if (
    f.includes("inala") ||
    f.includes("nebuliz") ||
    f.includes("aerossol") ||
    f.startsWith("aer ") ||
    f.includes("inalante")
  )
    return "Inalatória";
  if (f.includes("transderm") || f.includes("adesivo") || f.includes("percutane"))
    return "Transdérmica";
  if (f.includes("sublingual")) return "Sublingual";
  // Injetável genérico → intravenosa (default editável).
  if (
    f.includes("injet") ||
    /\binj\b/.test(f) ||
    /\bamp\b/.test(f) ||
    f.includes("carpule") ||
    f.includes("implante")
  )
    return "Intravenosa";
  // Tópicos.
  if (
    f.includes("creme") ||
    f.includes("pomada") ||
    f.includes("gel") ||
    f.includes("locao") ||
    f.includes("topic") ||
    f.includes("pasta") ||
    f.includes("xampu") ||
    f.includes("sabonete") ||
    f.includes("esmalte") ||
    f.includes("bastao") ||
    f.includes("orabase") ||
    f.includes("emulsao derm")
  )
    return "Tópica";
  return "Oral";
}

/**
 * Unidade de dose pré-selecionada a partir da forma e do princípio ativo
 * (mapeada às opções do seletor). Insulinas e heparina → **UI**.
 */
function inferUnidade(forma: string, pa: string): string {
  const p = norm(pa);
  if (p.includes("insulina") || p.includes("heparina")) return "UI";

  const f = norm(forma);
  // Aerossol/inalatório/spray → jato (antes de gota, para spray nasal).
  if (
    f.includes("aerossol") ||
    f.includes("inala") ||
    f.includes("nebuliz") ||
    f.includes("spray") ||
    f.includes("inalante") ||
    f.startsWith("aer ")
  )
    return "jato";
  // Gotas (oftálmica/otológica/nasal em solução/suspensão).
  if (
    f.includes("colir") ||
    f.includes("oftalm") ||
    f.includes("otolog") ||
    f.includes("otic") ||
    f.includes("nasal") ||
    f.includes("gota")
  )
    return "gota";
  if (
    f.includes("comprimido") ||
    f.includes("drag") ||
    f.startsWith("comp") ||
    f.includes("pastilha") ||
    f.includes("goma") ||
    f.includes("tablete")
  )
    return "comprimido";
  if (f.includes("capsula") || /^cap\b/.test(f) || f.startsWith("cap ")) return "cápsula";
  if (
    f.includes("suposit") ||
    f.includes("ovulo") ||
    f.includes("adesivo") ||
    f.includes("implante") ||
    f.includes("intrauterino")
  )
    return "unidade";
  if (
    f.includes("creme") ||
    f.includes("pomada") ||
    f.includes("gel") ||
    f.includes("locao") ||
    f.includes("topic") ||
    f.includes("pasta") ||
    f.includes("xampu") ||
    f.includes("sabonete") ||
    f.includes("emulsao derm") ||
    f.includes("orabase") ||
    f.includes("bisnaga")
  )
    return "aplicação";
  if (
    f.includes("injet") ||
    /\binj\b/.test(f) ||
    /\bamp\b/.test(f) ||
    f.includes("liof") ||
    f.includes("carpule")
  )
    return "ampola";
  if (
    f.includes("solucao") ||
    f.includes("suspens") ||
    f.includes("sol oral") ||
    f.includes("susp oral") ||
    f.startsWith("sol ") ||
    f.startsWith("susp ") ||
    f.includes("xarope") ||
    f.includes("xpe") ||
    f.includes("elixir") ||
    f.includes("tintura") ||
    f.includes("emulsao") ||
    f.includes("gelei")
  )
    return "mL";
  if (f.includes("granulado") || f === "po" || f.startsWith("po ")) return "sachê";
  return "unidade";
}

/**
 * Ajustes de forma para exibição/receita. "Pó para suspensão injetável" é
 * mostrado apenas como "Suspensão injetável" (na plataforma e na receita).
 */
function normalizeForma(forma: string): string {
  if (/^p[óo] para suspens[ãa]o injet[áa]vel$/i.test(forma.trim())) return "Suspensão injetável";
  return forma;
}

export const CATMAT_MEDS: MedCatmat[] = CATMAT_RAW.map(([pa, conc, forma, fornecimento]) => {
  const f = normalizeForma(forma);
  return {
    pa,
    conc,
    forma: f,
    fornecimento,
    via: inferVia(f, pa),
    unidade: inferUnidade(f, pa),
  };
});

/** Rótulo de exibição/busca: "Dipirona sódica 500 mg — Comprimido". */
export function medCatmatLabel(m: MedCatmat): string {
  return m.conc ? `${m.pa} ${m.conc} — ${m.forma}` : `${m.pa} — ${m.forma}`;
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
