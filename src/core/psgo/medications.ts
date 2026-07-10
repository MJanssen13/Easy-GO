/**
 * Medicamentos em uso (MEU) frequentes na gestação. Cada item pode estar em
 * uso atual ou ter sido usado num intervalo (mês início/fim).
 */

export const COMMON_MEDICATIONS: string[] = [
  "SULFATO FERROSO 80MG/DIA",
  "CARBONATO DE CÁLCIO 1250MG/DIA",
  "ÁCIDO FÓLICO 0,4MG/DIA",
  "AAS 150MG/DIA",
  "METILDOPA 250MG",
  "NIFEDIPINO 20MG",
  "LEVOTIROXINA",
  "INSULINA NPH",
];

export interface MedicationUse {
  id: string;
  label: string;
  /** Em uso atual. */
  current: boolean;
  /** "Fez uso" — intervalo (mês/ano). */
  pastStart?: string;
  pastEnd?: string;
}

/** Linha de prontuário para um medicamento. */
export function formatMedication(m: MedicationUse): string {
  if (m.current) return m.label;
  if (m.pastStart || m.pastEnd) {
    const range = [m.pastStart, m.pastEnd].filter(Boolean).join(" A ");
    return `${m.label} (FEZ USO${range ? ` ${range}` : ""})`;
  }
  return m.label;
}

/** Linha do medicamento na seção FEZ USO (só o intervalo entre parênteses). */
export function formatPastMedication(m: MedicationUse): string {
  const range = [m.pastStart, m.pastEnd].filter(Boolean).join(" A ");
  return range ? `${m.label} (${range})` : m.label;
}
