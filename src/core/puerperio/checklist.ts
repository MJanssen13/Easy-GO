/**
 * Pendências de segurança do puerpério (avisos na tela, não entram no texto).
 * APOIO À DECISÃO — validar com a equipe.
 *
 * - Imunoglobulina anti-D em até 72 h pós-parto para puérpera Rh negativo com RN
 *   Rh positivo (ou desconhecido) e Coombs indireto negativo — MS, Gestação de
 *   Alto Risco (2022); ACOG Practice Bulletin 181 (2017).
 * - Sorologias da admissão para o parto (sífilis/HIV) — MS, PCDT Transmissão
 *   Vertical de HIV, Sífilis e Hepatites Virais (2022).
 */
import type { Patient } from "@/core/patients/types";
import type { PuerperioSummary } from "./types";

export function isRhNegative(bloodType?: string | null): boolean {
  return !!bloodType && /-|neg/i.test(bloodType);
}

export interface Pending {
  level: "danger" | "warning";
  text: string;
}

export function puerperioPendings(
  patient: Pick<Patient, "bloodType">,
  p: PuerperioSummary,
): Pending[] {
  const out: Pending[] = [];
  if (isRhNegative(patient.bloodType)) {
    const rn = p.history.newbornBloodType.trim();
    if (!rn) out.push({ level: "danger", text: "Mãe Rh negativo: aguardar TS do RN — anti-D em até 72 h se RN Rh+" });
    else if (!isRhNegative(rn))
      out.push({ level: "danger", text: `Mãe Rh negativo e RN ${rn}: imunoglobulina anti-D em até 72 h (se CI negativo)` });
  } else if (!p.history.newbornBloodType.trim()) {
    out.push({ level: "warning", text: "TS do RN pendente" });
  }
  if (!p.history.serologies.trim()) out.push({ level: "warning", text: "Sorologias não registradas" });
  return out;
}
