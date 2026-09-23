"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WardHistory } from "@/core/puerperio/types";
import type { Basics } from "../actions";
import { Field } from "./delivery-fields";

const HISTORY_FIELDS: { key: keyof WardHistory; label: string; placeholder?: string; wide?: boolean }[] = [
  { key: "origin", label: "Procedente de" },
  { key: "prenatalVisits", label: "Consultas de pré-natal" },
  { key: "coombsIndirect", label: "Coombs indireto" },
  { key: "newbornBloodType", label: "Tipo sanguíneo RN", placeholder: "ex.: O+" },
  { key: "directCoombs", label: "Coombs direto" },
  { key: "cmb", label: "CMB", wide: true },
  { key: "meu", label: "MEU", placeholder: "ex.: SULFATO FERROSO 80MG/DIA", wide: true },
  { key: "pastMeds", label: "Fez uso de", wide: true },
  { key: "surgeries", label: "Cirurgias prévias", placeholder: "NEGA" },
  { key: "allergies", label: "Alergias", placeholder: "NEGA" },
  { key: "hcv", label: "HCV", placeholder: "NEGA TABAGISMO, ETILISMO E NEGA UDI.", wide: true },
];

/** Cabeçalho da paciente: dados comuns (colunas) + antecedentes do módulo. */
export function HistoryFields({
  basics,
  onBasics,
  history,
  onHistory,
}: {
  basics: Basics;
  onBasics: (b: Basics) => void;
  history: WardHistory;
  onHistory: (h: WardHistory) => void;
}) {
  const setB = (patch: Partial<Basics>) => onBasics({ ...basics, ...patch });
  const setH = (patch: Partial<WardHistory>) => onHistory({ ...history, ...patch });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
        <Field label="Nome" className="col-span-2 sm:col-span-3">
          <Input value={basics.name} onChange={(e) => setB({ name: e.target.value })} />
        </Field>
        <Field label="RG">
          <Input value={basics.medicalRecordNumber} onChange={(e) => setB({ medicalRecordNumber: e.target.value })} />
        </Field>
        <Field label="Leito">
          <Input value={basics.bed} onChange={(e) => setB({ bed: e.target.value })} />
        </Field>
        <Field label="Idade">
          <Input inputMode="numeric" value={basics.age} onChange={(e) => setB({ age: e.target.value })} />
        </Field>
        <Field label="Paridade" className="sm:col-span-2">
          <Input placeholder="ex.: G2P1C" value={basics.parity} onChange={(e) => setB({ parity: e.target.value })} />
        </Field>
        <Field label="Tipo sanguíneo">
          <Input placeholder="ex.: O+" value={basics.bloodType} onChange={(e) => setB({ bloodType: e.target.value })} />
        </Field>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {HISTORY_FIELDS.map((f) => (
          <Field key={f.key} label={f.label} className={f.wide ? "sm:col-span-3" : ""}>
            <Input
              placeholder={f.placeholder}
              value={history[f.key]}
              onChange={(e) => setH({ [f.key]: e.target.value } as Partial<WardHistory>)}
            />
          </Field>
        ))}
        <Field label="Sorologias" className="sm:col-span-3">
          <Textarea rows={2} value={history.serologies} onChange={(e) => setH({ serologies: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}
