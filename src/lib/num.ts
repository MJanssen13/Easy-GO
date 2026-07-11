/**
 * Converte texto em número aceitando vírgula OU ponto como separador decimal
 * (ex.: "1,70" e "1.70" → 1.7). Retorna null quando vazio ou inválido.
 */
export function parseDecimal(s: string | number | null | undefined): number | null {
  if (s == null) return null;
  const t = String(s).trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
