/**
 * Normalização do **princípio ativo** (DCB) para casar com as tabelas de risco
 * (gestação/lactação): reduz ao **nome-base** — minúsculas, sem acento, sem
 * conteúdo entre parênteses, sem a parte após vírgula e sem sal/éster/hidrato.
 * Compartilhado pelos geradores dos datasets e pelo lookup em runtime.
 */

// Sais/ésteres/hidratos removidos para chegar ao nome-base do fármaco.
const SALT_ADJ = new Set([
  "sodica", "sodico", "potassica", "potassico", "calcica", "calcico", "magnesica", "magnesico",
  "dissodica", "dissodico", "dipotassica", "sodio", "potassio", "calcio", "magnesio",
]);
const SALT_NOUN = new Set([
  "cloridrato", "dicloridrato", "bromidrato", "hidrobrometo", "sulfato", "hemisulfato",
  "bissulfato", "fosfato", "difosfato", "acetato", "besilato", "mesilato", "maleato", "fumarato",
  "hemifumarato", "tartarato", "bitartarato", "succinato", "citrato", "nitrato", "pamoato",
  "valerato", "propionato", "dipropionato", "enantato", "decanoato", "palmitato", "estearato",
  "estolato", "lactobionato", "gluconato", "pantotenato", "pivalato", "cipionato", "caproato",
  "isetionato", "xinafoato", "trometamol", "oleato", "embonato", "aceponato", "furoato",
  "butirato", "carbonato", "bicarbonato",
]);
const HYDRATE = new Set([
  "trihidratada", "dihidratada", "monoidratada", "monohidratada", "anidra", "hemihidratada",
  "pentaidratada", "sesquihidratada", "triidratada", "diidratada",
]);

/** Nome-base do princípio ativo (chave das tabelas de risco). */
export function normKey(pa: string): string {
  const s0 = pa
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/-/g, " ")
    .replace(/\(.*?\)/g, "")
    .split(",")[0]
    .replace(/\s+/g, " ")
    .trim();
  let t = s0.split(" ").filter(Boolean);
  if (t.length >= 3 && SALT_NOUN.has(t[0]) && t[1] === "de") t = t.slice(2);
  const base = t
    .filter((w) => !SALT_ADJ.has(w) && !SALT_NOUN.has(w) && !HYDRATE.has(w) && w !== "de" && w !== "e")
    .join(" ")
    .trim();
  return base || s0;
}

/** Componentes de uma associação ("A + B") já como nome-base. */
export function componentes(principioAtivo: string): string[] {
  return principioAtivo
    .split("+")
    .map((p) => normKey(p))
    .filter(Boolean);
}
