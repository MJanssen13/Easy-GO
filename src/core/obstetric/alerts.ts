/**
 * Alertas de valores fora da faixa numa aferição intraparto/puerperal.
 * APOIO À DECISÃO — validar com a equipe; limiares de referência:
 *
 * - BCF normal 110–160 bpm; < 110 bradicardia, > 160 taquicardia
 *   (FIGO Intrapartum Fetal Monitoring Guidelines, 2015; NICE NG229, 2022).
 * - PA ≥ 140/90 hipertensão; ≥ 160/110 hipertensão grave — tratar em até
 *   30–60 min (ACOG Practice Bulletin 222, 2020; MS Gestação de Alto Risco, 2022).
 * - PA < 90 sistólica: hipotensão (sinal de alerta de choque; OMS/MS).
 * - Temperatura ≥ 38,0 °C: febre (ACOG Committee Opinion 712, 2017).
 * - FC materna > 100 bpm: taquicardia (alerta p/ infecção/hemorragia).
 * - SpO₂ < 95 %: hipoxemia.
 * - MgSO₄: suspender se reflexo patelar ausente, FR < 12 irpm ou diurese
 *   < 25 ml/h (MS Gestação de Alto Risco, 2022) — mesmos critérios já exibidos
 *   no formulário.
 */

export type AlertLevel = "warning" | "danger";

export interface VitalAlert {
  level: AlertLevel;
  text: string;
}

export interface AlertInput {
  bcf?: number | null;
  paSystolic?: number | null;
  paDiastolic?: number | null;
  fc?: number | null;
  tax?: number | null;
  spo2?: number | null;
  mgReflex?: string | null;
  respiratoryRate?: number | null;
  /** Diurese em ml/h (quando informada como número). */
  diuresisMlH?: number | null;
}

const has = (v: number | null | undefined): v is number => v != null && !Number.isNaN(v);

export function vitalAlerts(v: AlertInput): VitalAlert[] {
  const out: VitalAlert[] = [];

  if (has(v.bcf) && v.bcf > 0) {
    if (v.bcf < 110) out.push({ level: "danger", text: `BCF ${v.bcf} bpm — bradicardia fetal (< 110)` });
    else if (v.bcf > 160) out.push({ level: "danger", text: `BCF ${v.bcf} bpm — taquicardia fetal (> 160)` });
  }

  const s = has(v.paSystolic) ? v.paSystolic : undefined;
  const d = has(v.paDiastolic) ? v.paDiastolic : undefined;
  if ((s ?? 0) >= 160 || (d ?? 0) >= 110) {
    out.push({ level: "danger", text: `PA ${s ?? "?"}x${d ?? "?"} — hipertensão grave (≥ 160/110)` });
  } else if ((s ?? 0) >= 140 || (d ?? 0) >= 90) {
    out.push({ level: "warning", text: `PA ${s ?? "?"}x${d ?? "?"} — hipertensão (≥ 140/90)` });
  } else if (s != null && s > 0 && s < 90) {
    out.push({ level: "warning", text: `PAS ${s} — hipotensão (< 90)` });
  }

  if (has(v.tax) && v.tax >= 38) out.push({ level: "warning", text: `TAX ${v.tax} °C — febre (≥ 38,0)` });
  if (has(v.fc) && v.fc > 100) out.push({ level: "warning", text: `FC ${v.fc} bpm — taquicardia materna (> 100)` });
  if (has(v.spo2) && v.spo2 > 0 && v.spo2 < 95) out.push({ level: "warning", text: `SpO₂ ${v.spo2}% — hipoxemia (< 95)` });

  if (v.mgReflex === "absent") out.push({ level: "danger", text: "Reflexo patelar ausente — critério de suspensão do MgSO₄" });
  if (has(v.respiratoryRate) && v.respiratoryRate > 0 && v.respiratoryRate < 12)
    out.push({ level: "danger", text: `FR ${v.respiratoryRate} irpm — critério de suspensão do MgSO₄ (< 12)` });
  if (has(v.diuresisMlH) && v.diuresisMlH < 25)
    out.push({ level: "danger", text: `Diurese ${v.diuresisMlH} ml/h — critério de suspensão do MgSO₄ (< 25)` });

  return out;
}

/** Extrai ml/h de um texto livre de diurese ("50 ml/h", "40"). */
export function parseDiuresisMlH(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}
