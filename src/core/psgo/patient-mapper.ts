/**
 * Mapeia a admissão do PSGO (`PsgoForm`) para o modelo de paciente
 * compartilhado (`Patient`), e de volta. Campos comuns vão nas colunas de
 * `patients` (para busca/exibição e para viajarem na transferência entre
 * módulos); a admissão completa fica em `clinical_summary` (JSON).
 */
import type { NewPatientInput, Patient } from "@/core/patients/types";
import { gaFromEdd } from "@/core/obstetric/gestational-age";
import type { PsgoForm } from "./types";
import { emptyPsgoCtg, type PsgoCtg } from "./ctg";
import { formatParity } from "./parity";
import { autoComorbidities } from "./comorbidities";
import { resolveDatingContext, findDatingUsg } from "./dating";
import { computePsgo, renderPsgo } from "./render";
import { parseDecimal } from "@/lib/num";

const MS_PER_DAY = 86_400_000;

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

interface DatingColumns {
  lmp: string | null;
  edd: string | null;
  gaWeeks: number | null;
  gaDays: number | null;
  usGaWeeks: number | null;
  usGaDays: number | null;
  datingMethod: "lmp" | "ultrasound" | null;
}

/**
 * Datação → colunas do paciente pelo método resolvido (preferência + ACOG
 * CO-700). Guarda uma **DUM-equivalente** derivada da DPP (`edd − 280d`), como
 * o pré-parto faz, para a IG AVANÇAR com o passar dos dias mesmo quando a
 * datação veio da USG — e não ficar congelada após a admissão/transferência.
 */
function datingColumns(form: PsgoForm): DatingColumns {
  const empty: DatingColumns = {
    lmp: form.lmp || null,
    edd: null,
    gaWeeks: null,
    gaDays: null,
    usGaWeeks: null,
    usGaDays: null,
    datingMethod: null,
  };
  // Não gestante: guarda a DUM como dado ginecológico, sem IG/DPP.
  if (!form.pregnant) return empty;

  // IG por USG (exame âncora): guardada para exibição/vigilância no pré-parto.
  const usg = findDatingUsg(form.imagingExams);
  const usGaWeeks = usg && usg.gaWeeks != null ? usg.gaWeeks : null;
  const usGaDays = usGaWeeks != null ? (usg?.gaDays ?? 0) : null;

  const ctx = resolveDatingContext({
    lmp: form.lmp,
    lmpUncertain: form.lmpUncertain,
    usgExams: form.imagingExams,
    preference: form.datingPreference,
  });

  // Sem datação resolvível (só DUM incerta, ou sem insumos): mantém a DUM crua.
  if (!ctx.edd) return { ...empty, usGaWeeks, usGaDays };

  const ga = gaFromEdd(ctx.edd);
  const lmpEquiv = new Date(ctx.edd.getTime() - 280 * MS_PER_DAY);
  return {
    lmp: toISODate(lmpEquiv),
    edd: toISODate(ctx.edd),
    gaWeeks: ga.weeks,
    gaDays: ga.days,
    usGaWeeks,
    usGaDays,
    datingMethod: ctx.method === "US" ? "ultrasound" : "lmp",
  };
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
    usGaWeeks: dt.usGaWeeks,
    usGaDays: dt.usGaDays,
    datingMethod: dt.datingMethod,
    status: "observation",
    riskFactors: psgoRiskFactors(form),
    clinicalSummary: summary as unknown as Record<string, unknown>,
  };
}

/** CTGs a partir do form salvo, migrando o laudo único legado (`ctgLaudo`). */
function legacyCtgLaudos(form: PsgoForm): PsgoCtg[] {
  if (form.ctgLaudos && form.ctgLaudos.length > 0) {
    // Preenche campos adicionados depois (ex.: estímulo mecânico) em CTGs antigas.
    return form.ctgLaudos.map((c) => ({ ...emptyPsgoCtg(), ...c }));
  }
  const legacy = (form as { ctgLaudo?: PsgoCtg & { done?: boolean } }).ctgLaudo;
  if (legacy?.done) return [{ ...emptyPsgoCtg(), ...legacy, id: legacy.id || "ctg-1" }];
  return [];
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
  // Medicamentos: migra o intervalo legado (início/fim) para o campo único.
  const medications = (cs.form.medications ?? []).map((m) => ({
    ...m,
    pastPeriod: m.pastPeriod ?? ([m.pastStart, m.pastEnd].filter(Boolean).join(" A ") || undefined),
  }));
  return {
    ...cs.form,
    pregnant: cs.form.pregnant ?? true,
    companionRelationOther: cs.form.companionRelationOther ?? "",
    prenatalIrregular: cs.form.prenatalIrregular ?? false,
    medications,
    medicationsPast: cs.form.medicationsPast ?? "",
    surgeriesDenied: cs.form.surgeriesDenied ?? false,
    allergiesDenied: cs.form.allergiesDenied ?? false,
    multiplicity: cs.form.multiplicity ?? "",
    chorionAmnion: cs.form.chorionAmnion ?? "",
    otherImaging: cs.form.otherImaging ?? "",
    coombsList,
    udiWhich: cs.form.udiWhich ?? "",
    hd: cs.form.hd ?? "",
    prescricao: cs.form.prescricao ?? "",
    // CTG: admissões antigas guardavam um único laudo (`ctgLaudo`, com `done`).
    ctgLaudos: legacyCtgLaudos(cs.form),
  };
}
