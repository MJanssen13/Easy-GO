/**
 * Conversões centil ↔ z, portadas das funções da Fetal Medicine Foundation
 * (fetalmedicine.org). Apoio à decisão — validar com a equipe.
 */

/** P(X ≤ x) para uma normal(mean, sd). Aproximação de Abramowitz-Stegun (FMF). */
export function normalcdf(mean: number, sd: number, x: number): number {
  const n = (x - mean) / Math.sqrt(2 * sd * sd);
  const r = 1 / (1 + 0.3275911 * Math.abs(n));
  const l =
    1 -
    ((((1.061405429 * r - 1.453152027) * r + 1.421413741) * r - 0.284496736) * r + 0.254829592) *
      r *
      Math.exp(-n * n);
  const i = n < 0 ? -1 : 1;
  return 0.5 * (1 + i * l);
}

/** Z-score → centil (0-100). */
export function zToCentile(z: number | null): number | null {
  if (z === null || Number.isNaN(z)) return null;
  return normalcdf(0, 1, z) * 100;
}

/** Centil → z (valores discretos usados pela FMF para linhas de referência). */
export function centileToZ(centile: number): number {
  switch (centile) {
    case 1:
      return -2.326;
    case 2.5:
      return -1.96;
    case 3:
      return -1.88;
    case 5:
      return -1.645;
    case 10:
      return -1.282;
    case 90:
      return 1.282;
    case 95:
      return 1.645;
    case 97:
      return 1.88;
    case 97.5:
      return 1.96;
    case 99:
      return 2.326;
    default:
      return 0;
  }
}

/** Formata um centil para exibição: "<1", ">99" ou inteiro. */
export function formatCentile(centile: number | null): string | null {
  if (centile === null || Number.isNaN(centile)) return null;
  if (centile < 1) return "<1";
  if (centile > 99) return ">99";
  return String(Math.round(centile));
}
