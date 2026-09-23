"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/form-controls";
import type { OncoHistory } from "@/core/oncogineco/types";
import type { Basics } from "../actions";

const ONCO_FIELDS: { key: keyof OncoHistory; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: "diagnosis", label: "Diagnóstico oncológico", placeholder: "ex.: CARCINOMA DE COLO UTERINO", wide: true },
  { key: "histology", label: "Histologia", placeholder: "ex.: CEC" },
  { key: "staging", label: "Estadiamento", placeholder: "ex.: FIGO IB2" },
  { key: "origin", label: "Procedente de" },
  { key: "priorTreatment", label: "Tratamento prévio", placeholder: "ex.: QT + RT EM 2025", wide: true },
  { key: "admissionReason", label: "Motivo da internação", placeholder: "ex.: HISTERECTOMIA RADICAL", wide: true },
];

const HISTORY_FIELDS: { key: keyof OncoHistory; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: "cmb", label: "CMB", wide: true },
  { key: "meu", label: "MEU", wide: true },
  { key: "pastMeds", label: "Fez uso de", wide: true },
  { key: "surgeries", label: "Cirurgias prévias", placeholder: "NEGA" },
  { key: "allergies", label: "Alergias", placeholder: "NEGA" },
  { key: "hcv", label: "HCV", placeholder: "NEGA TABAGISMO, ETILISMO E NEGA UDI." },
];

export function BasicsFields({ basics, onChange }: { basics: Basics; onChange: (b: Basics) => void }) {
  const set = (patch: Partial<Basics>) => onChange({ ...basics, ...patch });
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
      <Field label="Nome" className="col-span-2 sm:col-span-3">
        <Input value={basics.name} onChange={(e) => set({ name: e.target.value })} />
      </Field>
      <Field label="RG">
        <Input value={basics.medicalRecordNumber} onChange={(e) => set({ medicalRecordNumber: e.target.value })} />
      </Field>
      <Field label="Leito">
        <Input value={basics.bed} onChange={(e) => set({ bed: e.target.value })} />
      </Field>
      <Field label="Idade">
        <Input inputMode="numeric" value={basics.age} onChange={(e) => set({ age: e.target.value })} />
      </Field>
      <Field label="Paridade" className="sm:col-span-2">
        <Input value={basics.parity} onChange={(e) => set({ parity: e.target.value })} />
      </Field>
      <Field label="Tipo sanguíneo">
        <Input value={basics.bloodType} onChange={(e) => set({ bloodType: e.target.value })} />
      </Field>
    </div>
  );
}

function Fields({
  list,
  value,
  onChange,
}: {
  list: typeof ONCO_FIELDS;
  value: OncoHistory;
  onChange: (h: OncoHistory) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {list.map((f) => (
        <Field key={f.key} label={f.label} className={f.wide ? "sm:col-span-3" : ""}>
          <Input
            placeholder={f.placeholder}
            value={value[f.key]}
            onChange={(e) => onChange({ ...value, [f.key]: e.target.value })}
          />
        </Field>
      ))}
    </div>
  );
}

/** Diagnóstico, estadiamento, tratamento e cirurgia desta internação. */
export function OncoDiagnosisFields({ value, onChange }: { value: OncoHistory; onChange: (h: OncoHistory) => void }) {
  return (
    <div className="space-y-2">
      <Fields list={ONCO_FIELDS} value={value} onChange={onChange} />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <Field label="Cirurgia nesta internação" className="sm:col-span-2">
          <Input
            placeholder="ex.: HISTERECTOMIA TOTAL ABDOMINAL + SALPINGOOFORECTOMIA BILATERAL"
            value={value.surgery}
            onChange={(e) => onChange({ ...value, surgery: e.target.value })}
          />
        </Field>
        <Field label="Data da cirurgia">
          <Input
            type="date"
            value={value.surgeryDate}
            onChange={(e) => onChange({ ...value, surgeryDate: e.target.value })}
          />
        </Field>
      </div>
    </div>
  );
}

export function OncoHistoryFields({ value, onChange }: { value: OncoHistory; onChange: (h: OncoHistory) => void }) {
  return <Fields list={HISTORY_FIELDS} value={value} onChange={onChange} />;
}

export function ContextField({
  value,
  onChange,
  onDraft,
}: {
  value: string;
  onChange: (v: string) => void;
  onDraft: () => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">Contexto da internação</span>
        <button type="button" onClick={onDraft} className="-my-1.5 min-h-8 py-1.5 text-xs text-primary hover:underline">
          Regerar a partir do diagnóstico
        </button>
      </div>
      <Textarea aria-label="Contexto da internação" rows={4} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
