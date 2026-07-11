/**
 * Mapeia a admissão do PSGO (`PsgoForm`) para o modelo de paciente
 * compartilhado (`Patient`), e de volta. Campos comuns vão nas colunas de
 * `patients` (para busca/exibição e para viajarem na transferência entre
 * módulos); a admissão completa fica em `clinical_summary` (JSON).
 */
import type { NewPatientInput, Patient } from "@/core/patients/types";
import {
  eddFromLMP,
  eddFromUltrasound,
  gaFromLMP,
  gaFromUltrasound,
} from "@/core/obstetric/gestational-age";
import type { PsgoForm } from "./types";
import { emptyPsgoCtg } from "./ctg";
import { formatParity } from "./parity";
import { autoComorbidities } from "./comorbidities";
import { resolvePsgoDating } from "./dating";
import { computePsgo, renderPsgo } from "./render";
import { parseDecimal } from "@/lib/num";

/** Formato do `clinical_summary` de uma paciente do PSGO. */
export interface PsgoClinicalSummary {
  version: 1;
  form: PsgoForm;
  robsonGroup: number | null;
  /** Texto do prontuário no momento da admissão (histórico/exibição). */
  prontuario: string;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function splitOther(s?: string): string[] {
  return (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
}

function dedup(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const it of items) {
    const key = it.trim().toUpperCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      out.push(it.trim());
    }
  }
  return out;
}

/** Comorbidades (selecionadas + outras + automáticas) → fatores de risco. */
export function psgoRiskFactors(form: PsgoForm): string[] {
  const weight = parseDecimal(form.weight);
  const height = parseDecimal(form.height);
  const parity = formatParity(form.priorPregnancies, form.pregnant);
  return dedup([
    ...form.comorbidities,
    ...splitOther(form.comorbiditiesOther),
    ...autoComorbidities({ weightKg: weight, heightM: height, cesareanCount: parity.cesareanCount }),
  ]);
}

/** Datação → colunas (lmp/edd/IG atual) pelo método escolhido (ACOG). */
function datingColumns(form: PsgoForm): {
  lmp: string | null;
  edd: string | null;
  gaWeeks: number | null;
  gaDays: number | null;
} {
  // Não gestante: guarda a DUM como dado ginecológico, sem IG/DPP.
  if (!form.pregnant) {
    return { lmp: form.lmp || null, edd: null, gaWeeks: null, gaDays: null };
  }
  const dating = resolvePsgoDating({
    lmp: form.lmp,
    lmpUncertain: form.lmpUncertain,
    usgExams: form.imagingExams,
    preference: form.datingPreference,
  });
  const lmpDate = form.lmp ? new Date(`${form.lmp}T00:00:00`) : null;
  const ex =
    form.imagingExams.find((e) => e.useForDating) ??
    form.imagingExams.find((e) => e.date && e.gaWeeks != null);
  const scanDate = ex?.date ? new Date(`${ex.date}T00:00:00`) : null;
  const scanGa = ex && ex.gaWeeks != null ? { weeks: ex.gaWeeks, days: ex.gaDays ?? 0 } : null;

  if (dating.methodTag === "DUM" && lmpDate && !Number.isNaN(lmpDate.getTime())) {
    const g = gaFromLMP(lmpDate);
    return { lmp: form.lmp || null, edd: toISODate(eddFromLMP(lmpDate)), gaWeeks: g.weeks, gaDays: g.days };
  }
  if (dating.methodTag === "US" && scanDate && scanGa) {
    const g = gaFromUltrasound(scanDate, scanGa);
    return {
      lmp: form.lmp || null,
      edd: toISODate(eddFromUltrasound(scanDate, scanGa)),
      gaWeeks: g.weeks,
      gaDays: g.days,
    };
  }
  return { lmp: form.lmp || null, edd: null, gaWeeks: dating.gaWeeks, gaDays: null };
}

/** Admissão do PSGO → paciente (module="psgo"), com o form completo no JSON. */
export function psgoFormToNewPatient(form: PsgoForm): NewPatientInput {
  const parity = formatParity(form.priorPregnancies, form.pregnant);
  const { robsonGroup } = computePsgo(form);
  const dt = datingColumns(form);

  const summary: PsgoClinicalSummary = {
    version: 1,
    form,
    robsonGroup,
    prontuario: renderPsgo(form),
  };

  return {
    module: "psgo",
    name: form.name.trim(),
    medicalRecordNumber: form.rg.trim() || null,
    age: form.age ? Number(form.age) : null,
    parity: parity.summary || null,
    bloodType: form.bloodType || null,
    lmp: dt.lmp,
    edd: dt.edd,
    gaWeeks: dt.gaWeeks,
    gaDays: dt.gaDays,
    status: "observation",
    riskFactors: psgoRiskFactors(form),
    clinicalSummary: summary as unknown as Record<string, unknown>,
  };
}

/** Recupera o `PsgoForm` salvo de uma paciente (para reabrir/editar a admissão). */
export function patientToPsgoForm(patient: Patient): PsgoForm | null {
  const cs = patient.clinicalSummary as unknown as PsgoClinicalSummary | null;
  if (!cs?.form) return null;
  // Defaults para campos adicionados depois (admissões antigas não os têm).
  const coombsList =
    cs.form.coombsList && cs.form.coombsList.length > 0
      ? cs.form.coombsList
      : cs.form.coombs
        ? [{ id: "legacy", result: cs.form.coombs, date: cs.form.coombsDate ?? "" }]
        : [];
  return {
    ...cs.form,
    pregnant: cs.form.pregnant ?? true,
    companionRelationOther: cs.form.companionRelationOther ?? "",
    prenatalIrregular: cs.form.prenatalIrregular ?? false,
    medicationsPast: cs.form.medicationsPast ?? "",
    coombsList,
    udiWhich: cs.form.udiWhich ?? "",
    // CTG legada (texto livre) migra para as observações do laudo.
    ctgLaudo: cs.form.ctgLaudo ?? { ...emptyPsgoCtg(), notes: cs.form.ctg ?? "" },
  };
}
