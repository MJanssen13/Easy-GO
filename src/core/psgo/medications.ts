/**
 * Medicamentos em uso (MEU) frequentes na gestação. Cada item pode estar em uso
 * atual (com o "desde" opcional) ou ter sido usado num período informado.
 * As sugestões são só o princípio ativo (sem dose) — o nome/dose é editável.
 */

export const COMMON_MEDICATIONS: string[] = [
  "SULFATO FERROSO",
  "CARBONATO DE CÁLCIO",
  "ÁCIDO FÓLICO",
  "AAS",
  "METILDOPA",
  "NIFEDIPINO",
  "LEVOTIROXINA",
  "INSULINA NPH",
  "ONDANSETRONA",
  "ESCOPOLAMINA",
  "DIPIRONA",
  "METFORMINA",
  "PARACETAMOL",
  "NITROFURANTOÍNA",
  "AMOXICILINA",
  "CEFALEXINA",
];

export interface MedicationUse {
  id: string;
  label: string;
  /** Em uso atual. */
  current: boolean;
  /** "Em uso" — desde quando (opcional; ex.: "01/2025" → "DESDE 01/2025"). */
  currentStart?: string;
  /** "Fez uso" — período (campo único, ex.: "2020 A 2021"). */
  pastPeriod?: string;
  /** @deprecated Legado (intervalo início/fim) — migrado para `pastPeriod`. */
  pastStart?: string;
  /** @deprecated Legado (intervalo início/fim) — migrado para `pastPeriod`. */
  pastEnd?: string;
}

/** Período de uso de um medicamento "fez uso" (campo único, com fallback legado). */
export function pastPeriodOf(m: MedicationUse): string {
  if (m.pastPeriod?.trim()) return m.pastPeriod.trim();
  return [m.pastStart, m.pastEnd].filter(Boolean).join(" A ");
}

/** Linha do medicamento em uso: acrescenta "(DESDE …)" quando informado. */
export function formatCurrentMedication(m: MedicationUse): string {
  const since = m.currentStart?.trim();
  return since ? `${m.label} (DESDE ${since})` : m.label;
}

/** Linha de prontuário para um medicamento (em uso ou "fez uso"). */
export function formatMedication(m: MedicationUse): string {
  if (m.current) return formatCurrentMedication(m);
  const range = pastPeriodOf(m);
  return `${m.label} (FEZ USO${range ? ` ${range}` : ""})`;
}

/** Linha do medicamento na seção FEZ USO (só o período entre parênteses). */
export function formatPastMedication(m: MedicationUse): string {
  const range = pastPeriodOf(m);
  return range ? `${m.label} (${range})` : m.label;
}
