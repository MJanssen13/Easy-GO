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
