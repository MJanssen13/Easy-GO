"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  Stethoscope,
  Info,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  ExternalLink,
} from "lucide-react";
import {
  emptyPrenatalForm,
  type PrenatalForm,
} from "@/core/prenatal/types";
import { renderPrenatal, prenatalHd } from "@/core/prenatal/render";
import { renderPrenatalContext } from "@/core/prenatal/context";
import { PRENATAL_EXAM_SYSTEMS, prenatalNormalLine } from "@/core/prenatal/exam";
import { PRENATAL_VACCINES, VACCINE_STATUSES } from "@/core/prenatal/vaccines";
import { vaccineRecommendations, type VaccineRecStatus } from "@/core/prenatal/vaccine-schedule";
import {
  trimesterOf,
  routineExamsFor,
  trimesterLabel,
  routineExamsRequestLine,
} from "@/core/prenatal/routine-exams";
import { assessWeightGain } from "@/core/prenatal/weight-gain";
import {
  PRIOR_TYPE_LABELS,
  NO_COMPLICATIONS_LABEL,
  formatParity,
  formatCesareans,
  canMarkNoComplications,
  requiredNotePrompt,
  type PriorPregnancyType,
} from "@/core/psgo/parity";
import { COMMON_COMORBIDITIES, classifyBmi } from "@/core/psgo/comorbidities";
import { COMMON_MEDICATIONS } from "@/core/psgo/medications";
import { SEROLOGY_ANALYTES, VDRL_TITERS } from "@/core/psgo/serology";
import {
  datingDisplay,
  resolvePsgoDating,
  resolveDatingContext,
  withAutoGa,
  refFromISO,
} from "@/core/psgo/dating";
import { renderImagingExam, imagingWarnings, examCentiles, type ImagingExam } from "@/core/psgo/imaging";
import { HABITS, type CoombsEntry } from "@/core/psgo/types";
import {
  abdFieldsFor,
  toqueFieldsFor,
  ESP_FIELDS,
  ABD_DU_DETALHE_KEY,
  TOQUE_DOR_OPTIONS,
  TOQUE_DOR_INDOLOR_KEY,
  SEC_LOCAL_KEY,
  SEC_LOCAL_OPTIONS,
  SEC_ODOR_KEY,
  SEC_ODOR_OPTIONS,
  SEC_GRUMOS_KEY,
  SEC_GRUMOS_OPTIONS,
  SEC_COR_KEY,
  SEC_COR_OPTIONS,
  secHasCharacteristics,
  ESP_SANGRAMENTO_KEY,
  ESP_SANGRAMENTO_QTD_KEY,
  ESP_SANGRAMENTO_OPTIONS,
  ESP_SANGRAMENTO_QTD_OPTIONS,
  ESP_SANGRAMENTO_OE_KEY,
  ESP_SANGRAMENTO_OE_OPTIONS,
  ESP_SAIDA_COLO_KEY,
  ESP_SAIDA_COLO_OPTIONS,
  ESP_SAIDA_COLO_TIPO_KEY,
  ESP_SAIDA_COLO_TIPO_OPTIONS,
  ESP_AMNIOSURE_KEY,
  ESP_CRISTALIZACAO_KEY,
  TEST_OPTIONS,
  type GyField,
} from "@/core/psgo/gyneco-exam";
import { REVISION_QUESTIONS, type RevSub } from "@/core/psgo/hpma";
import {
  PRESENTATION_OPTIONS,
  PLACENTA_SITE_OPTIONS,
  PLACENTA_GRADE_OPTIONS,
} from "@/core/prenatal/imaging-options";
import { parseDecimal } from "@/lib/num";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import { DateBRInput } from "@/components/date-br-input";

const selectClass =
  "flex h-9 w-full max-w-[11rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// ---------- Componentes de apoio (mesmos padrões do gerador do PSGO) ----------

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function InfoTip({ title, children }: { title?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        aria-label={title ?? "Mais informações"}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 z-40 w-72 rounded-md border bg-background p-3 text-xs shadow-lg">
          {title && <p className="mb-1 font-semibold">{title}</p>}
          <div className="space-y-1 text-muted-foreground">{children}</div>
        </div>
      )}
    </span>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="inline-flex w-full overflow-hidden rounded-full border bg-background text-xs font-medium">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 whitespace-nowrap px-3 py-1.5 text-center transition-colors ${
            i > 0 ? "border-l" : ""
          } ${
            value === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Section({
  title,
  children,
  headerExtra,
  defaultOpen = true,
  contentClassName,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card>
      <div className="flex items-center justify-between gap-2 p-6">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-2 text-left"
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "" : "-rotate-90"
            }`}
          />
          <span className="text-base font-semibold leading-none tracking-tight">{title}</span>
        </button>
        {headerExtra && <div className="flex items-center gap-2">{headerExtra}</div>}
      </div>
      {open && (
        <div className={`px-6 pb-6 ${contentClassName ?? ""}`}>
          {children}
          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Recolher seção"
              title="Recolher"
              className="inline-flex h-6 w-12 items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}

/** Botão para abrir o LabFlow (laboratório) em nova aba. */
function LabflowButton() {
  return (
    <a
      href="https://labflowai.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(105deg,hsl(176_88%_22%),hsl(174_92%_30%)_52%,hsl(172_74%_41%))] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
    >
      <FlaskConical className="h-4 w-4" />
      Acessar LabFlow
      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
}

// -------------------------------- Gerador --------------------------------

export function PrenatalGenerator({ today }: { today?: string } = {}) {
  const [form, setForm] = useState<PrenatalForm>(() => emptyPrenatalForm(today));
  const [medInput, setMedInput] = useState("");
  const update = (patch: Partial<PrenatalForm>) => setForm((f) => ({ ...f, ...patch }));

  const text = useMemo(() => renderPrenatal(form), [form]);
  const parityView = useMemo(() => formatParity(form.priorPregnancies, true), [form.priorPregnancies]);
  const datingView = useMemo(
    () =>
      datingDisplay(
        {
          lmp: form.lmp,
          lmpUncertain: form.lmpUncertain,
          usgExams: form.imagingExams,
          preference: form.datingPreference,
        },
        refFromISO(form.date),
      ),
    [form.lmp, form.lmpUncertain, form.imagingExams, form.datingPreference, form.date],
  );
  const imagingComputed = useMemo(
    () =>
      withAutoGa(
        form.imagingExams,
        resolveDatingContext({
          lmp: form.lmp,
          lmpUncertain: form.lmpUncertain,
          usgExams: form.imagingExams,
          preference: form.datingPreference,
        }),
      ),
    [form.imagingExams, form.lmp, form.lmpUncertain, form.datingPreference],
  );
  const bmi = classifyBmi(parseDecimal(form.weight), parseDecimal(form.height));
  const cesareanText = formatCesareans(form.priorPregnancies);
  const autoHd = useMemo(() => prenatalHd(form), [form]);
  const contextPreview = useMemo(
    () => renderPrenatalContext(form.revision, form.currentComplaints),
    [form.revision, form.currentComplaints],
  );

  // IG resolvida (semanas) → recomendações de vacina e rotina de exames por trimestre.
  const gaWeeks = useMemo(
    () =>
      resolvePsgoDating(
        {
          lmp: form.lmp,
          lmpUncertain: form.lmpUncertain,
          usgExams: form.imagingExams,
          preference: form.datingPreference,
        },
        refFromISO(form.date),
      ).gaWeeks,
    [form.lmp, form.lmpUncertain, form.imagingExams, form.datingPreference, form.date],
  );
  const vaccineRecs = useMemo(() => vaccineRecommendations(gaWeeks), [gaWeeks]);
  const trimester = trimesterOf(gaWeeks);
  const weightGain = useMemo(
    () =>
      assessWeightGain({
        prePregnancyWeightKg: parseDecimal(form.prePregnancyWeight),
        currentWeightKg: parseDecimal(form.weight),
        heightM: parseDecimal(form.height),
        gaWeeks,
      }),
    [form.prePregnancyWeight, form.weight, form.height, gaWeeks],
  );

  // Cor do destaque da recomendação de vacina conforme o status.
  const vaccineStatusClass: Record<VaccineRecStatus, string> = {
    due: "text-emerald-700",
    late: "text-amber-700",
    wait: "text-muted-foreground",
    outside: "text-muted-foreground",
    anytime: "text-teal-700",
    unknown: "text-muted-foreground",
  };

  // Papanicolau (VCE) — resultados frequentes (Sistema Bethesda) para atalho.
  const PAP_RESULTS = [
    "NILM (NEGATIVO)",
    "ASC-US",
    "LSIL",
    "ASC-H",
    "HSIL",
    "AGC",
  ];

  // ---- Helpers de estado ----
  function toggleArray(key: "comorbidities" | "habits", value: string) {
    setForm((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  }
  function toggleHabit(value: string) {
    setForm((f) => {
      const has = f.habits.includes(value);
      let habits: string[];
      if (value === "NEGA") {
        habits = has ? [] : ["NEGA"];
      } else {
        habits = has
          ? f.habits.filter((x) => x !== value)
          : [...f.habits.filter((x) => x !== "NEGA"), value];
      }
      return { ...f, habits };
    });
  }

  // Paridade
  function addPrior(type: PriorPregnancyType = "N") {
    update({ priorPregnancies: [...form.priorPregnancies, { id: uid(), type, year: "", note: "" }] });
  }
  function updatePrior(id: string, patch: Partial<PrenatalForm["priorPregnancies"][number]>) {
    update({ priorPregnancies: form.priorPregnancies.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
  }
  function removePrior(id: string) {
    update({ priorPregnancies: form.priorPregnancies.filter((p) => p.id !== id) });
  }

  // Coombs indireto
  function addCoombs() {
    update({ coombsList: [...form.coombsList, { id: uid(), result: "", date: "" }] });
  }
  function updateCoombs(id: string, patch: Partial<CoombsEntry>) {
    update({ coombsList: form.coombsList.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }
  function removeCoombs(id: string) {
    update({ coombsList: form.coombsList.filter((c) => c.id !== id) });
  }

  // Medicamentos
  function addMed(label: string, current = true) {
    if (form.medications.some((m) => m.label.toUpperCase() === label.toUpperCase())) return;
    update({ medications: [...form.medications, { id: uid(), label, current }] });
  }
  function addMedCustom() {
    const label = medInput.trim();
    if (!label) return;
    addMed(label);
    setMedInput("");
  }
  function updateMed(id: string, patch: Partial<PrenatalForm["medications"][number]>) {
    update({ medications: form.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }
  function removeMed(id: string) {
    update({ medications: form.medications.filter((m) => m.id !== id) });
  }

  // Vacinas
  function updateVaccine(id: string, patch: Partial<{ status: string; detail: string }>) {
    update({ vaccines: { ...form.vaccines, [id]: { ...form.vaccines[id], ...patch } } });
  }

  // Sorologias externas (quadro)
  function addSerologyColumn() {
    update({
      serologyGrid: {
        ...form.serologyGrid,
        columns: [...form.serologyGrid.columns, { id: uid(), date: "" }],
      },
    });
  }
  function updateSerologyColumn(id: string, date: string) {
    update({
      serologyGrid: {
        ...form.serologyGrid,
        columns: form.serologyGrid.columns.map((c) => (c.id === id ? { ...c, date } : c)),
      },
    });
  }
  function removeSerologyColumn(id: string) {
    const values = { ...form.serologyGrid.values };
    for (const a of SEROLOGY_ANALYTES) delete values[`${a}:${id}`];
    update({
      serologyGrid: { columns: form.serologyGrid.columns.filter((c) => c.id !== id), values },
    });
  }
  function setSerologyValue(analyte: string, colId: string, value: string) {
    update({
      serologyGrid: {
        ...form.serologyGrid,
        values: { ...form.serologyGrid.values, [`${analyte}:${colId}`]: value },
      },
    });
  }

  // Exames de imagem (USG)
  function addImaging() {
    update({ imagingExams: [...form.imagingExams, { id: uid(), external: true }] });
  }
  function updateImaging(id: string, patch: Partial<ImagingExam>) {
    update({ imagingExams: form.imagingExams.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }
  function removeImaging(id: string) {
    update({ imagingExams: form.imagingExams.filter((e) => e.id !== id) });
  }
  /** Move um exame para a 1ª posição (é a âncora da datação). */
  function useForDating(id: string) {
    const target = form.imagingExams.find((e) => e.id === id);
    if (!target) return;
    update({ imagingExams: [target, ...form.imagingExams.filter((e) => e.id !== id)] });
  }

  // Exame ginecológico/obstétrico (reuso do PSGO)
  function setGyneco(patch: Partial<PrenatalForm["gyneco"]>) {
    update({ gyneco: { ...form.gyneco, ...patch } });
  }
  function setGynecoValue(fieldId: string, label: string) {
    update({ gyneco: { ...form.gyneco, values: { ...form.gyneco.values, [fieldId]: label } } });
  }
  // Dor ao toque (multi): "Indolor" é exclusivo dos demais.
  function toggleDor(key: string) {
    setForm((f) => {
      const cur = f.gyneco.values;
      const on = cur[key] === "1";
      const next = { ...cur };
      if (key === TOQUE_DOR_INDOLOR_KEY) {
        for (const op of TOQUE_DOR_OPTIONS) next[op.key] = "";
        next[TOQUE_DOR_INDOLOR_KEY] = on ? "" : "1";
      } else {
        next[key] = on ? "" : "1";
        if (!on) next[TOQUE_DOR_INDOLOR_KEY] = "";
      }
      return { ...f, gyneco: { ...f.gyneco, values: next } };
    });
  }

  // Revisão dirigida (HPMA adaptada) — valores por chave `rev.<id>`.
  function setRevVal(key: string, value: string) {
    update({ revision: { ...form.revision, [key]: value } });
  }

  const gyField = (field: GyField) => (
    <div key={field.id} className="space-y-1">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
      {field.render === "select" ? (
        <select
          className={`${selectClass} h-8 w-40`}
          value={form.gyneco.values[field.id] ?? field.options[0].label}
          onChange={(e) => setGynecoValue(field.id, e.target.value)}
        >
          {field.options.map((op) => (
            <option key={op.label} value={op.label}>
              {op.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {field.options.map((op) => (
            <Chip
              key={op.label}
              active={form.gyneco.values[field.id] === op.label}
              onClick={() => setGynecoValue(field.id, op.label)}
            >
              {op.label}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
  const gyChipRow = (label: string, fieldId: string, options: { label: string }[]) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((op) => (
          <Chip
            key={op.label}
            active={form.gyneco.values[fieldId] === op.label}
            onClick={() => setGynecoValue(fieldId, op.label)}
          >
            {op.label}
          </Chip>
        ))}
      </div>
    </div>
  );
  const gyTestToggle = (label: string, fieldId: string) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-24 text-xs text-muted-foreground">{label}</span>
      {TEST_OPTIONS.map((t) => (
        <Chip key={t} active={form.gyneco.values[fieldId] === t} onClick={() => setGynecoValue(fieldId, t)}>
          {t}
        </Chip>
      ))}
    </div>
  );

  const hpmaInputCls =
    "mx-0.5 inline-block h-6 w-14 rounded border border-input bg-background px-1 align-middle text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";
  const renderRevSub = (qid: string, sub: RevSub) => {
    const base = `rev.${qid}.${sub.id}`;
    if (sub.kind === "blank") {
      return (
        <span key={sub.id} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {sub.label}
          <input value={form.revision[base] ?? ""} onChange={(e) => setRevVal(base, e.target.value)} className={hpmaInputCls} />
        </span>
      );
    }
    return (
      <span key={sub.id} className="inline-flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted-foreground">{sub.label}:</span>
        {(sub.opts ?? []).map((op) => {
          const key = sub.kind === "multi" ? `${base}#${op}` : base;
          const active = sub.kind === "multi" ? form.revision[key] === "1" : form.revision[key] === op;
          return (
            <Chip
              key={op}
              active={active}
              onClick={() => setRevVal(key, sub.kind === "multi" ? (active ? "" : "1") : active ? "" : op)}
            >
              {op}
            </Chip>
          );
        })}
      </span>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ----- Formulário (2/3) ----- */}
      <div className="space-y-4 lg:col-span-2">
        {/* Identificação */}
        <Section title="Identificação" contentClassName="space-y-3">
          <div className="flex flex-wrap gap-3">
            <Field label="Data da consulta" className="w-44">
              <DateBRInput value={form.date} onChange={(iso) => update({ date: iso })} />
            </Field>
            <Field label="Idade" className="w-24">
              <Input value={form.age} onChange={(e) => update({ age: e.target.value })} inputMode="numeric" />
            </Field>
            <Field label="RG" className="min-w-[8rem] flex-1">
              <Input value={form.rg} onChange={(e) => update({ rg: e.target.value })} />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Nome" className="col-span-2">
              <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </Field>
            <Field label="Nome social (opcional)" className="col-span-1">
              <Input value={form.socialName} onChange={(e) => update({ socialName: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Procedente de" className="min-w-[12rem] flex-1">
              <Input value={form.origin} onChange={(e) => update({ origin: e.target.value })} />
            </Field>
            <Field label="Local do pré-natal" className="min-w-[12rem] flex-1">
              <Input value={form.prenatalPlace} onChange={(e) => update({ prenatalPlace: e.target.value })} />
            </Field>
            <Field label="Consultas (nº)" className="w-20">
              <Input
                value={form.prenatalCount}
                onChange={(e) => update({ prenatalCount: e.target.value })}
                inputMode="numeric"
                maxLength={2}
              />
            </Field>
            <label className="flex items-center gap-2 whitespace-nowrap pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.prenatalIrregular}
                onChange={(e) => update({ prenatalIrregular: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              Pré-natal irregular
            </label>
          </div>
        </Section>

        {/* Paridade */}
        <Section
          defaultOpen={false}
          title="Paridade (GPA)"
          contentClassName="space-y-3"
          headerExtra={
            <>
              <InfoTip title="Como codificar a paridade">
                <p>
                  <strong>G</strong> = gestações (soma a atual). Detalhamento na ordem{" "}
                  <strong>C</strong> cesárea, <strong>N</strong> normal, <strong>A</strong> abortos.
                </p>
                <p>Ex.: 1 cesárea + 1 normal, gestante → <strong>G3C1N1</strong>.</p>
              </InfoTip>
              {parityView.summary && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-bold tabular-nums text-primary">
                  {parityView.summary}
                </span>
              )}
            </>
          }
        >
          <div className="flex flex-wrap gap-1.5">
            {(["C", "N", "A"] as PriorPregnancyType[]).map((t) => (
              <Button key={t} type="button" size="sm" variant="outline" onClick={() => addPrior(t)}>
                <Plus className="h-3.5 w-3.5" /> {PRIOR_TYPE_LABELS[t]}
              </Button>
            ))}
          </div>
          {form.priorPregnancies.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Primigesta (G1). Use os botões acima para registrar gestações prévias.
            </p>
          ) : (
            form.priorPregnancies.map((p, idx) => (
              <div key={p.id} className="space-y-2 rounded-md border p-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">{idx + 1}ª gestação</span>
                  <select
                    className={`${selectClass} h-8 w-40`}
                    value={p.type}
                    onChange={(e) => {
                      const type = e.target.value as PriorPregnancyType;
                      updatePrior(p.id, {
                        type,
                        ...(canMarkNoComplications(type) ? {} : { noComplications: false }),
                      });
                    }}
                  >
                    {(Object.keys(PRIOR_TYPE_LABELS) as PriorPregnancyType[]).map((t) => (
                      <option key={t} value={t}>
                        {t} — {PRIOR_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="h-8 w-24"
                    placeholder="Ano"
                    value={p.year ?? ""}
                    inputMode="numeric"
                    onChange={(e) => updatePrior(p.id, { year: e.target.value })}
                  />
                  <div className="ml-auto flex items-center gap-1">
                    {canMarkNoComplications(p.type) && (
                      <Chip
                        active={!!p.noComplications}
                        onClick={() => updatePrior(p.id, { noComplications: !p.noComplications })}
                      >
                        {NO_COMPLICATIONS_LABEL}
                      </Chip>
                    )}
                    <Button type="button" variant="ghost" size="icon" onClick={() => removePrior(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {(!p.noComplications || !!requiredNotePrompt(p.type)) && (
                  <Textarea
                    rows={2}
                    placeholder={
                      requiredNotePrompt(p.type) ??
                      "Intercorrências / dados comemorativos (peso do RN, local, complicações, aleitamento…)"
                    }
                    value={p.note ?? ""}
                    onChange={(e) => updatePrior(p.id, { note: e.target.value })}
                    className={
                      requiredNotePrompt(p.type) && !(p.note ?? "").trim()
                        ? "border-rose-400 placeholder:font-semibold placeholder:text-rose-600 focus-visible:ring-rose-400"
                        : undefined
                    }
                  />
                )}
              </div>
            ))
          )}
        </Section>

        {/* Datação */}
        <Section title="Datação (DUM / IG)" contentClassName="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <Field label="DUM" className="w-40">
              <DateBRInput value={form.lmp} onChange={(iso) => update({ lmp: iso })} />
            </Field>
            <label className="flex items-center gap-2 whitespace-nowrap pb-2 text-sm">
              <input
                type="checkbox"
                checked={form.lmpUncertain}
                onChange={(e) => update({ lmpUncertain: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              DUM incerta
            </label>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <Label className="text-xs">Datação</Label>
                <InfoTip title="Como é feita a datação">
                  <p>O USG usado é sempre a <strong>1ª coluna</strong> do quadro de exames de imagem.</p>
                  <p><strong>DUM</strong> — regra de Naegele (DUM + 280 dias).</p>
                  <p><strong>USG</strong> — pela IG do exame (data + IG do USG).</p>
                  <p>
                    <strong>Auto (ACOG)</strong> — mantém a DUM, mas <em>redata pela USG</em> se a
                    diferença passar do limite (ACOG CO-700).
                  </p>
                </InfoTip>
              </div>
              <Segmented
                value={form.datingPreference}
                onChange={(v) => update({ datingPreference: v })}
                options={[
                  { value: "lmp", label: "DUM" },
                  { value: "us", label: "USG" },
                  { value: "auto", label: "Auto (ACOG)" },
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`rounded-lg border p-2.5 transition-colors ${
                datingView.chosen === "DUM" ? "border-primary/60 bg-primary/5" : "bg-background"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                IG pela DUM
              </span>
              {datingView.dum ? (
                <>
                  <p className="mt-1 text-xl font-bold leading-none tabular-nums">
                    {datingView.dum.ga.weeks}
                    <span className="text-sm font-medium text-muted-foreground"> sem </span>
                    {datingView.dum.ga.days}
                    <span className="text-sm font-medium text-muted-foreground"> dias</span>
                  </p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">DPP {datingView.dum.eddBR}</p>
                </>
              ) : (
                <p className="mt-2 text-[11px] text-muted-foreground">Informe a DUM acima.</p>
              )}
            </div>
            <div
              className={`rounded-lg border p-2.5 transition-colors ${
                datingView.chosen === "US" ? "border-primary/60 bg-primary/5" : "bg-background"
              }`}
            >
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                IG pela USG
              </span>
              {datingView.usg ? (
                <>
                  <p className="mt-1 text-xl font-bold leading-none tabular-nums">
                    {datingView.usg.currentGa.weeks}
                    <span className="text-sm font-medium text-muted-foreground"> sem </span>
                    {datingView.usg.currentGa.days}
                    <span className="text-sm font-medium text-muted-foreground"> dias</span>
                  </p>
                  <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                    Exame {datingView.usg.dateBR} · {datingView.usg.gaAtExam.weeks} sem{" "}
                    {datingView.usg.gaAtExam.days} dias na data
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                  Preencha a data e a IG na 1ª coluna do quadro de USG (usada para datar).
                </p>
              )}
            </div>
          </div>

          {/* Exames de imagem (USG) — juntos com a datação, como no PSGO */}
          <div className="space-y-3 border-t pt-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Exames de imagem (USG)</p>
              <Button type="button" size="sm" variant="outline" onClick={addImaging}>
                <Plus className="h-4 w-4" /> USG
              </Button>
            </div>
            {form.imagingExams.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Adicione um USG. Percentis de CC/PESO/CA pela Hadlock; IP-AUmb, IP-ACM, RCP e IP da a.
                uterina pela FMF. O 1º exame é a âncora da datação; os demais têm a IG preenchida
                automaticamente.
              </p>
            ) : (
              form.imagingExams.map((e, idx) => {
                const computed = imagingComputed.find((x) => x.id === e.id) ?? e;
                const centiles = examCentiles(computed);
                const preview = renderImagingExam(computed);
                const warns = imagingWarnings(computed);
                const isDating = idx === 0;
                return (
                  <div key={e.id} className="space-y-2 rounded-md border p-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">
                        USG {idx + 1}
                        {isDating && (
                          <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                            datação
                          </span>
                        )}
                      </span>
                      <DateBRInput
                        className="h-8 w-32"
                        value={e.date ?? ""}
                        onChange={(iso) => updateImaging(e.id, { date: iso })}
                      />
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={!!e.external}
                          onChange={(ev) => updateImaging(e.id, { external: ev.target.checked })}
                          className="h-3.5 w-3.5 rounded border-input"
                        />
                        Externo (EXT)
                      </label>
                      <div className="ml-auto flex items-center gap-1">
                        {!isDating && (
                          <Button type="button" size="sm" variant="ghost" onClick={() => useForDating(e.id)}>
                            Usar para datar
                          </Button>
                        )}
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeImaging(e.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {isDating ? (
                        <>
                          <Field label="IG (sem)">
                            <Input
                              className="h-8"
                              inputMode="numeric"
                              value={e.gaWeeks ?? ""}
                              onChange={(ev) =>
                                updateImaging(e.id, { gaWeeks: ev.target.value === "" ? undefined : Number(ev.target.value) })
                              }
                            />
                          </Field>
                          <Field label="IG (dias)">
                            <Input
                              className="h-8"
                              inputMode="numeric"
                              value={e.gaDays ?? ""}
                              onChange={(ev) =>
                                updateImaging(e.id, { gaDays: ev.target.value === "" ? undefined : Number(ev.target.value) })
                              }
                            />
                          </Field>
                        </>
                      ) : (
                        <Field label="IG (automática)" className="col-span-2">
                          <div className="flex h-8 items-center rounded-md border border-dashed bg-muted/40 px-3 text-sm text-muted-foreground">
                            {computed.gaWeeks != null
                              ? `${computed.gaWeeks} sem ${computed.gaDays ?? 0} d`
                              : "— (defina a datação)"}
                          </div>
                        </Field>
                      )}
                      <Field label="Apresentação">
                        <select
                          className={`${selectClass} h-8 w-full`}
                          value={e.presentation ?? ""}
                          onChange={(ev) => updateImaging(e.id, { presentation: ev.target.value })}
                        >
                          <option value="">—</option>
                          {PRESENTATION_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="BCF (bpm)">
                        <Input className="h-8" value={e.fhr ?? ""} onChange={(ev) => updateImaging(e.id, { fhr: ev.target.value })} />
                      </Field>
                      <Field label="CC (mm)">
                        <div className="flex items-center gap-1">
                          <Input className="h-8" inputMode="numeric" value={e.hc ?? ""} onChange={(ev) => updateImaging(e.id, { hc: ev.target.value })} />
                          <span className="text-[10px] text-muted-foreground">{centiles.hc}</span>
                        </div>
                      </Field>
                      <Field label="CA (mm)">
                        <div className="flex items-center gap-1">
                          <Input className="h-8" inputMode="numeric" value={e.ac ?? ""} onChange={(ev) => updateImaging(e.id, { ac: ev.target.value })} />
                          <span className="text-[10px] text-muted-foreground">{centiles.ac}</span>
                        </div>
                      </Field>
                      <Field label="PFE (g)">
                        <div className="flex items-center gap-1">
                          <Input className="h-8" inputMode="numeric" value={e.efw ?? ""} onChange={(ev) => updateImaging(e.id, { efw: ev.target.value })} />
                          <span className="text-[10px] text-muted-foreground">{centiles.efw}</span>
                        </div>
                      </Field>
                      <Field label="ILA (cm)">
                        <Input className="h-8" value={e.ila ?? ""} onChange={(ev) => updateImaging(e.id, { ila: ev.target.value })} />
                      </Field>
                      <Field label="MBV (cm)">
                        <Input className="h-8" value={e.mbv ?? ""} onChange={(ev) => updateImaging(e.id, { mbv: ev.target.value })} />
                      </Field>
                      <Field label="Placenta (inserção)">
                        <select
                          className={`${selectClass} h-8 w-full`}
                          value={e.placentaSite ?? ""}
                          onChange={(ev) => updateImaging(e.id, { placentaSite: ev.target.value })}
                        >
                          <option value="">—</option>
                          {PLACENTA_SITE_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Placenta (grau)">
                        <select
                          className={`${selectClass} h-8 w-full`}
                          value={e.placentaGrade ?? ""}
                          onChange={(ev) => updateImaging(e.id, { placentaGrade: ev.target.value })}
                        >
                          <option value="">—</option>
                          {PLACENTA_GRADE_OPTIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="IP AUmb">
                        <Input className="h-8" value={e.uaPi ?? ""} onChange={(ev) => updateImaging(e.id, { uaPi: ev.target.value })} />
                      </Field>
                      <Field label="IP ACM">
                        <Input className="h-8" value={e.mcaPi ?? ""} onChange={(ev) => updateImaging(e.id, { mcaPi: ev.target.value })} />
                      </Field>
                      <Field label="IP a. uterina">
                        <Input className="h-8" value={e.utPi ?? ""} onChange={(ev) => updateImaging(e.id, { utPi: ev.target.value })} />
                      </Field>
                    </div>
                    <Field label="Observações (laudo livre)">
                      <Input
                        className="h-8"
                        value={e.notes ?? ""}
                        onChange={(ev) => updateImaging(e.id, { notes: ev.target.value })}
                      />
                    </Field>
                    {warns.length > 0 && (
                      <p className="rounded bg-amber-50 px-2 py-1 text-[11px] text-amber-800">{warns.join(" · ")}</p>
                    )}
                    {preview.trim() && (
                      <p className="rounded bg-muted/50 px-2 py-1 text-[11px] text-muted-foreground">{preview}</p>
                    )}
                  </div>
                );
              })
            )}
            <Field label="Outros exames de imagem (texto livre)">
              <Textarea
                rows={2}
                placeholder="-(dd/mm/aa): USG MORFOLÓGICO ..."
                value={form.otherImaging}
                onChange={(e) => update({ otherImaging: e.target.value })}
              />
            </Field>
          </div>
        </Section>

        {/* Tipo sanguíneo / Coombs */}
        <Section defaultOpen={false} title="Tipo sanguíneo e Coombs indireto" contentClassName="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Field label="Tipo sanguíneo (TS)" className="w-40">
              <select
                className={selectClass}
                value={form.bloodType}
                onChange={(e) => update({ bloodType: e.target.value })}
              >
                <option value="">—</option>
                {BLOOD_TYPES.map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </Field>
            <Button type="button" size="sm" variant="outline" onClick={addCoombs}>
              <Plus className="h-4 w-4" /> CI
            </Button>
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Coombs indireto (CI)</Label>
            {form.coombsList.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhum CI registrado. Use &ldquo;+ CI&rdquo; para adicionar.
              </p>
            ) : (
              form.coombsList.map((c) => (
                <div key={c.id} className="flex flex-wrap items-center gap-2">
                  <div className="w-56">
                    <Segmented
                      value={(c.result || "neg") as "neg" | "pos"}
                      onChange={(v) => updateCoombs(c.id, { result: v })}
                      options={[
                        { value: "neg", label: "Negativo" },
                        { value: "pos", label: "Positivo" },
                      ]}
                    />
                  </div>
                  <DateBRInput
                    className="h-8 w-32"
                    value={c.date}
                    onChange={(iso) => updateCoombs(c.id, { date: iso })}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCoombs(c.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </Section>

        {/* Comorbidades */}
        <Section defaultOpen={false} title="Comorbidades (CMB)" contentClassName="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {COMMON_COMORBIDITIES.map((c) => (
              <Chip key={c} active={form.comorbidities.includes(c)} onClick={() => toggleArray("comorbidities", c)}>
                {c}
              </Chip>
            ))}
          </div>
          <Input
            placeholder="Outras (separadas por vírgula)"
            value={form.comorbiditiesOther}
            onChange={(e) => update({ comorbiditiesOther: e.target.value })}
          />
          {bmi?.label && <p className="text-xs text-muted-foreground">Automático: {bmi.label}</p>}
        </Section>

        {/* Medicamentos */}
        <Section defaultOpen={false} title="Medicamentos (MEU / fez uso)" contentClassName="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {COMMON_MEDICATIONS.map((m) => (
              <Chip key={m} active={form.medications.some((x) => x.label === m)} onClick={() => addMed(m)}>
                {m}
              </Chip>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Adicionar medicamento…"
              value={medInput}
              onChange={(e) => setMedInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addMedCustom();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addMedCustom} disabled={!medInput.trim()}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
          {form.medications.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Nenhum medicamento. Use os atalhos ou adicione acima; marque cada um como{" "}
              <strong>Em uso</strong> ou <strong>Fez uso</strong>.
            </p>
          ) : (
            form.medications.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                <Input
                  className="min-w-[8rem] flex-1 font-medium"
                  value={m.label}
                  onChange={(e) => updateMed(m.id, { label: e.target.value })}
                />
                <div className="w-40">
                  <Segmented
                    value={m.current ? "uso" : "fez"}
                    onChange={(v) => updateMed(m.id, { current: v === "uso" })}
                    options={[
                      { value: "uso", label: "Em uso" },
                      { value: "fez", label: "Fez uso" },
                    ]}
                  />
                </div>
                {m.current ? (
                  <Input
                    className="w-32"
                    placeholder="Desde (opcional)"
                    value={m.currentStart ?? ""}
                    onChange={(e) => updateMed(m.id, { currentStart: e.target.value })}
                  />
                ) : (
                  <Input
                    className="w-40"
                    placeholder="Período de uso"
                    value={m.pastPeriod ?? ""}
                    onChange={(e) => updateMed(m.id, { pastPeriod: e.target.value })}
                  />
                )}
                <Button type="button" variant="ghost" size="icon" onClick={() => removeMed(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))
          )}
        </Section>

        {/* Cirurgias / alergias / hábitos */}
        <Section defaultOpen={false} title="Cirurgias, alergias e hábitos (HCV)" contentClassName="space-y-3">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Cirurgias prévias (CX prévias)</Label>
              <Chip active={form.surgeriesDenied} onClick={() => update({ surgeriesDenied: !form.surgeriesDenied })}>
                Nega
              </Chip>
            </div>
            {form.surgeriesDenied ? (
              <p className="text-xs text-muted-foreground">
                Nega cirurgias prévias
                {cesareanText ? ` (exceto ${cesareanText.toLowerCase()}, da paridade)` : ""}.
              </p>
            ) : (
              <>
                <Input value={form.surgeries} onChange={(e) => update({ surgeries: e.target.value })} />
                {cesareanText && (
                  <p className="text-xs text-muted-foreground">Automático da paridade: {cesareanText}.</p>
                )}
              </>
            )}
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">Alergias</Label>
              <Chip active={form.allergiesDenied} onClick={() => update({ allergiesDenied: !form.allergiesDenied })}>
                Nega
              </Chip>
            </div>
            {form.allergiesDenied ? (
              <p className="text-xs text-muted-foreground">Nega alergias.</p>
            ) : (
              <Input value={form.allergies} onChange={(e) => update({ allergies: e.target.value })} />
            )}
          </div>
          <Field label="Hábitos de vida (HCV)">
            <div className="flex flex-wrap gap-1.5">
              {HABITS.map((h) => (
                <Chip key={h} active={form.habits.includes(h)} onClick={() => toggleHabit(h)}>
                  {h}
                </Chip>
              ))}
            </div>
          </Field>
          {form.habits.includes("UDI") && (
            <Input
              placeholder="UDI — qual(is) droga(s)?"
              value={form.udiWhich}
              onChange={(e) => update({ udiWhich: e.target.value })}
            />
          )}
          <Input
            placeholder="Outros hábitos"
            value={form.habitsOther}
            onChange={(e) => update({ habitsOther: e.target.value })}
          />
        </Section>

        {/* Cartão de vacinas — com recomendação por IG (PNI/MS) */}
        <Section
          defaultOpen={false}
          title="Cartão de vacinas"
          contentClassName="space-y-2"
          headerExtra={
            <>
              {gaWeeks != null && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {gaWeeks} sem
                </span>
              )}
              <InfoTip title="Vacinas na gestação (PNI/MS)">
                <p>Recomendação por IG: Hepatite B e dT (qualquer IG), dTpa (20–36 sem), Influenza e COVID-19 (qualquer IG), VSR materna (28–36 sem).</p>
                <p>Apoio à decisão — validar com a caderneta e o calendário vigente.</p>
              </InfoTip>
            </>
          }
        >
          {PRENATAL_VACCINES.map((v) => {
            const rec = vaccineRecs.find((r) => r.id === v.id);
            return (
              <div key={v.id} className="space-y-1 rounded-md border p-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="w-24 text-sm font-semibold">{v.label}</span>
                  <select
                    className={`${selectClass} h-8 w-40`}
                    value={form.vaccines[v.id].status}
                    onChange={(e) => updateVaccine(v.id, { status: e.target.value })}
                  >
                    {VACCINE_STATUSES.map((s) => (
                      <option key={s || "vazio"} value={s}>
                        {s || "—"}
                      </option>
                    ))}
                  </select>
                  <Input
                    className="h-8 min-w-[7rem] flex-1"
                    placeholder="Detalhe (data / IG da dose)"
                    value={form.vaccines[v.id].detail}
                    onChange={(e) => updateVaccine(v.id, { detail: e.target.value })}
                  />
                  {rec && (rec.status === "due" || rec.status === "late") && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      title="Marcar como realizada nesta IG"
                      onClick={() =>
                        updateVaccine(v.id, {
                          status: "REALIZADA",
                          detail: gaWeeks != null ? `${gaWeeks} SEM` : form.vaccines[v.id].detail,
                        })
                      }
                    >
                      Realizada
                    </Button>
                  )}
                </div>
                {rec && (
                  <p className={`text-[11px] ${vaccineStatusClass[rec.status]}`}>
                    <span className="font-medium">{rec.window}</span> · {rec.hint}
                  </p>
                )}
              </div>
            );
          })}
        </Section>

        {/* VCE — colpocitologia oncótica (Papanicolau) */}
        <Section defaultOpen={false} title="VCE (Papanicolau)" contentClassName="space-y-2">
          <p className="text-xs text-muted-foreground">
            Resultado da colpocitologia oncótica (Papanicolau).
          </p>
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Data" className="w-40">
              <DateBRInput value={form.vceDate} onChange={(iso) => update({ vceDate: iso })} />
            </Field>
            <Field label="Resultado" className="min-w-[12rem] flex-1">
              <Input value={form.vce} onChange={(e) => update({ vce: e.target.value })} />
            </Field>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {PAP_RESULTS.map((r) => (
              <Chip key={r} active={form.vce === r} onClick={() => update({ vce: form.vce === r ? "" : r })}>
                {r}
              </Chip>
            ))}
          </div>
        </Section>

        {/* Sorologias e laboratoriais */}
        <Section
          defaultOpen={false}
          title="Sorologias e laboratoriais"
          contentClassName="space-y-4"
          headerExtra={<LabflowButton />}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">Sorologias</p>
              <Button type="button" size="sm" variant="outline" onClick={addSerologyColumn}>
                <Plus className="h-4 w-4" /> Coleta externa
              </Button>
            </div>
            {form.serologyGrid.columns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border-b p-1 text-left font-medium text-muted-foreground">Externas (EXT)</th>
                      {form.serologyGrid.columns.map((c) => (
                        <th key={c.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <DateBRInput
                              className="h-7 w-28 text-xs"
                              value={c.date}
                              onChange={(iso) => updateSerologyColumn(c.id, iso)}
                            />
                            <button
                              type="button"
                              onClick={() => removeSerologyColumn(c.id)}
                              className="text-destructive"
                              title="Remover coleta"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SEROLOGY_ANALYTES.map((a) => (
                      <tr key={a}>
                        <td className="border-b p-1 font-medium">{a}</td>
                        {form.serologyGrid.columns.map((c) => {
                          const key = `${a}:${c.id}`;
                          const val = form.serologyGrid.values[key] ?? "";
                          if (a === "VDRL") {
                            return (
                              <td key={c.id} className="border-b p-1">
                                <select
                                  className={`${selectClass} h-7 !w-20 px-2 text-xs`}
                                  value={val}
                                  onChange={(e) => setSerologyValue(a, c.id, e.target.value)}
                                >
                                  <option value="">—</option>
                                  {VDRL_TITERS.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          }
                          return (
                            <td key={c.id} className="border-b p-1">
                              <div className="flex gap-1">
                                {[
                                  { v: "", label: "—" },
                                  { v: "NR", label: "NR" },
                                  { v: "REAG", label: "REAG" },
                                ].map((o) => (
                                  <Chip key={o.v || "nd"} active={val === o.v} onClick={() => setSerologyValue(a, c.id, o.v)}>
                                    {o.label}
                                  </Chip>
                                ))}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Colar sorologias do hospital (internas)</Label>
              <Textarea
                rows={3}
                placeholder="-(dd/mm/aaaa): TOXO SUSCETÍVEL / HBSAG NR / ..."
                value={form.serologyPasted}
                onChange={(e) => update({ serologyPasted: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-semibold">Exames laboratoriais</p>
            <Textarea
              rows={3}
              placeholder="-(dd/mm/aa): HB 11,2 / HT 34 / PLAQ 210000 …"
              value={form.labs}
              onChange={(e) => update({ labs: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              Inicie cada coleta com a data <strong>-(dd/mm/aa):</strong> para sair em ordem cronológica.
            </p>
          </div>
        </Section>

        {/* Rotina de exames por trimestre (MS/Febrasgo) */}
        <Section
          defaultOpen={false}
          title="Exames de rotina (por trimestre)"
          contentClassName="space-y-2"
          headerExtra={
            trimester != null ? (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                {trimesterLabel(trimester)}
              </span>
            ) : undefined
          }
        >
          {trimester == null ? (
            <p className="text-xs text-muted-foreground">
              Informe a DUM/USG para identificar o trimestre e a rotina de exames.
            </p>
          ) : (
            <>
              <ul className="space-y-1 text-sm">
                {routineExamsFor(trimester).map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      {e.label}
                      {e.note && <span className="text-muted-foreground"> — {e.note}</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  const line = routineExamsRequestLine(trimester);
                  update({ cd: form.cd.trim() ? `${form.cd.trim()}\n${line}` : line });
                }}
              >
                <Plus className="h-4 w-4" /> Copiar solicitação para conduta
              </Button>
              <p className="text-[10px] text-muted-foreground">
                Fonte: MS (Pré-Natal de Baixo Risco) / Febrasgo — lista curada, validar com o protocolo do serviço.
              </p>
            </>
          )}
        </Section>

        {/* HPMA / Contexto — revisão dirigida (sempre respondida) + queixas atuais.
            Adaptada do PSGO, sem o gerador de HPMA por QP (a pedido). */}
        <Section title="HPMA / Contexto" contentClassName="space-y-3">
          <Field label="Queixas atuais">
            <Textarea
              rows={2}
              placeholder="Ex.: refere cefaleia há 2 dias; edema de MMII…"
              value={form.currentComplaints}
              onChange={(e) => update({ currentComplaints: e.target.value })}
            />
          </Field>
          <div className="space-y-1.5 border-t pt-2">
            <p className="text-xs font-semibold text-muted-foreground">Revisão dirigida (sempre respondida)</p>
            {REVISION_QUESTIONS.map((q) => {
              const key = `rev.${q.id}`;
              const cur = form.revision[key] ?? q.options[0].value;
              const curOpt = q.options.find((op) => op.value === cur);
              return (
                <div key={q.id} className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="w-36 text-xs text-muted-foreground">{q.label}</span>
                    {q.options.map((op) => (
                      <Chip key={op.value} active={cur === op.value} onClick={() => setRevVal(key, op.value)}>
                        {op.label}
                      </Chip>
                    ))}
                  </div>
                  {curOpt?.subs && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-36">
                      {curOpt.subs.map((sub) => renderRevSub(q.id, sub))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="space-y-1 border-t pt-2">
            <span className="text-xs font-semibold text-muted-foreground">Prévia do CONTEXTO</span>
            <p className="prontuario-text rounded bg-muted/40 px-2 py-1 text-[11px] text-justify">
              {contextPreview}
            </p>
          </div>
        </Section>

        {/* Exame físico */}
        <Section defaultOpen={false} title="Exame físico" contentClassName="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            <Field label="Peso (kg)">
              <Input value={form.weight} onChange={(e) => update({ weight: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Altura (m)">
              <Input value={form.height} onChange={(e) => update({ height: e.target.value })} inputMode="decimal" />
            </Field>
            <Field label="Peso pré-gest. (kg)">
              <Input
                value={form.prePregnancyWeight}
                onChange={(e) => update({ prePregnancyWeight: e.target.value })}
                inputMode="decimal"
              />
            </Field>
            <Field label="Temp (°C)">
              <Input value={form.vitals.temp ?? ""} onChange={(e) => update({ vitals: { ...form.vitals, temp: e.target.value } })} />
            </Field>
            <Field label="Sat (%)">
              <Input value={form.vitals.sat ?? ""} onChange={(e) => update({ vitals: { ...form.vitals, sat: e.target.value } })} />
            </Field>
            <Field label="PAS">
              <Input value={form.vitals.pas ?? ""} onChange={(e) => update({ vitals: { ...form.vitals, pas: e.target.value } })} />
            </Field>
            <Field label="PAD">
              <Input value={form.vitals.pad ?? ""} onChange={(e) => update({ vitals: { ...form.vitals, pad: e.target.value } })} />
            </Field>
            <Field label="FC (bpm)">
              <Input value={form.vitals.fc ?? ""} onChange={(e) => update({ vitals: { ...form.vitals, fc: e.target.value } })} />
            </Field>
            <Field label="AU (cm)">
              <Input value={form.vitals.au ?? ""} onChange={(e) => update({ vitals: { ...form.vitals, au: e.target.value } })} />
            </Field>
            <Field label="BCF (bpm)">
              <Input value={form.vitals.bcf ?? ""} onChange={(e) => update({ vitals: { ...form.vitals, bcf: e.target.value } })} />
            </Field>
          </div>

          {/* IMC pré-gestacional + ganho de peso (IOM 2009) */}
          {weightGain && (
            <div className="rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  IMC pré-gestacional: {weightGain.bmi.imc} kg/m²{" "}
                  <span className="font-normal text-muted-foreground">({weightGain.bmi.label})</span>
                </span>
                <span className="text-muted-foreground">
                  Meta de ganho: {weightGain.totalTarget.low}–{weightGain.totalTarget.high} kg
                </span>
              </div>
              {weightGain.currentGain != null && (
                <p className="mt-1">
                  Ganho atual:{" "}
                  <span
                    className={`font-semibold ${
                      weightGain.status === "within"
                        ? "text-emerald-700"
                        : weightGain.status === null
                          ? ""
                          : "text-amber-700"
                    }`}
                  >
                    {weightGain.currentGain > 0 ? "+" : ""}
                    {weightGain.currentGain} kg
                    {weightGain.status === "below"
                      ? " (abaixo)"
                      : weightGain.status === "above"
                        ? " (acima)"
                        : weightGain.status === "within"
                          ? " (adequado)"
                          : ""}
                  </span>
                  {weightGain.expectedNow && (
                    <span className="text-muted-foreground">
                      {" "}
                      · esperado p/ IG: {weightGain.expectedNow.low}–{weightGain.expectedNow.high} kg
                    </span>
                  )}
                </p>
              )}
              <p className="mt-1 text-[10px] text-muted-foreground">Fonte: IOM 2009 · gestação única · validar.</p>
            </div>
          )}

          {PRENATAL_EXAM_SYSTEMS.map((s) => {
            const st = form.exam[s.id];
            return (
              <div key={s.id} className="rounded-md border p-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{s.label}</span>
                  <div className="w-44">
                    <Segmented
                      value={st.mode}
                      onChange={(v) =>
                        update({
                          exam: {
                            ...form.exam,
                            [s.id]: {
                              ...st,
                              mode: v,
                              ...(v === "altered" && !st.text.trim()
                                ? { text: prenatalNormalLine(s.id, form.vitals) }
                                : {}),
                            },
                          },
                        })
                      }
                      options={[
                        { value: "normal", label: "Normal" },
                        { value: "altered", label: "Alterado" },
                      ]}
                    />
                  </div>
                </div>
                {st.mode === "altered" ? (
                  <Textarea
                    className="mt-2"
                    rows={2}
                    value={st.text}
                    placeholder={prenatalNormalLine(s.id, form.vitals)}
                    onChange={(e) => update({ exam: { ...form.exam, [s.id]: { ...st, text: e.target.value } } })}
                  />
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">{prenatalNormalLine(s.id, form.vitals)}</p>
                )}
              </div>
            );
          })}
        </Section>

        {/* Exame ginecológico e obstétrico (clicável) — reuso do PSGO */}
        <Section
          defaultOpen={false}
          title="Exame ginecológico e obstétrico"
          contentClassName="space-y-4"
        >
          {/* Abdome gravídico */}
          <div className="space-y-2">
            <p className="text-sm font-semibold">Abdome (gravídico)</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{abdFieldsFor(true).map(gyField)}</div>
            {form.gyneco.values["abdDu"] === "Presente" && (
              <Field label="Dinâmica uterina (descrição)" className="max-w-md">
                <Input
                  value={form.gyneco.values[ABD_DU_DETALHE_KEY] ?? ""}
                  onChange={(e) => setGynecoValue(ABD_DU_DETALHE_KEY, e.target.value)}
                  placeholder="ex.: 2 em 10 minutos"
                />
              </Field>
            )}
            <p className="text-xs text-muted-foreground">AU e BCF vêm dos sinais vitais do exame físico.</p>
          </div>

          {/* Exame especular */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Exame especular</p>
              <div className="w-52">
                <Segmented
                  value={form.gyneco.espRealizado ? "sim" : "nao"}
                  onChange={(v) => setGyneco({ espRealizado: v === "sim" })}
                  options={[
                    { value: "sim", label: "Realizado" },
                    { value: "nao", label: "Não realizado" },
                  ]}
                />
              </div>
            </div>
            {form.gyneco.espRealizado && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ESP_FIELDS.map(gyField)}
                <div className="space-y-1 sm:col-span-2">
                  {gyChipRow("Secreção", SEC_LOCAL_KEY, SEC_LOCAL_OPTIONS)}
                  {secHasCharacteristics(form.gyneco.values[SEC_LOCAL_KEY]) && (
                    <div className="space-y-1.5 rounded-md bg-muted/40 p-2">
                      {gyChipRow("Cor", SEC_COR_KEY, SEC_COR_OPTIONS)}
                      {gyChipRow("Grumos", SEC_GRUMOS_KEY, SEC_GRUMOS_OPTIONS)}
                      {gyChipRow("Odor", SEC_ODOR_KEY, SEC_ODOR_OPTIONS)}
                    </div>
                  )}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  {gyChipRow("Sangramento", ESP_SANGRAMENTO_KEY, ESP_SANGRAMENTO_OPTIONS)}
                  {form.gyneco.values[ESP_SANGRAMENTO_KEY] === "Pelo OE" && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-muted-foreground">Tipo:</span>
                      {ESP_SANGRAMENTO_OE_OPTIONS.map((op) => (
                        <Chip
                          key={op.label}
                          active={form.gyneco.values[ESP_SANGRAMENTO_OE_KEY] === op.label}
                          onClick={() => setGynecoValue(ESP_SANGRAMENTO_OE_KEY, op.label)}
                        >
                          {op.label}
                        </Chip>
                      ))}
                    </div>
                  )}
                  {form.gyneco.values[ESP_SANGRAMENTO_KEY] !== "Ausente" && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-xs text-muted-foreground">Quantidade:</span>
                      {ESP_SANGRAMENTO_QTD_OPTIONS.map((op) => (
                        <Chip
                          key={op.label}
                          active={form.gyneco.values[ESP_SANGRAMENTO_QTD_KEY] === op.label}
                          onClick={() => setGynecoValue(ESP_SANGRAMENTO_QTD_KEY, op.label)}
                        >
                          {op.label}
                        </Chip>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1 sm:col-span-2">
                  {gyChipRow("Perdas líquidas via colo", ESP_SAIDA_COLO_KEY, ESP_SAIDA_COLO_OPTIONS)}
                  {form.gyneco.values[ESP_SAIDA_COLO_KEY] !== "Ausente" && (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-xs text-muted-foreground">Tipo:</span>
                        {ESP_SAIDA_COLO_TIPO_OPTIONS.map((op) => (
                          <Chip
                            key={op.label}
                            active={form.gyneco.values[ESP_SAIDA_COLO_TIPO_KEY] === op.label}
                            onClick={() => setGynecoValue(ESP_SAIDA_COLO_TIPO_KEY, op.label)}
                          >
                            {op.label}
                          </Chip>
                        ))}
                      </div>
                      <div className="space-y-1.5 rounded-md bg-muted/40 p-2">
                        {gyTestToggle("AmniSure", ESP_AMNIOSURE_KEY)}
                        {gyTestToggle("Cristalização", ESP_CRISTALIZACAO_KEY)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Toque vaginal */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold">Toque vaginal</p>
              <div className="w-52">
                <Segmented
                  value={form.gyneco.toqueRealizado ? "sim" : "nao"}
                  onChange={(v) => setGyneco({ toqueRealizado: v === "sim" })}
                  options={[
                    { value: "sim", label: "Realizado" },
                    { value: "nao", label: "Não realizado" },
                  ]}
                />
              </div>
            </div>
            {form.gyneco.toqueRealizado && (
              <>
                <p className="text-xs text-muted-foreground">
                  Toque realizado é sempre autorizado pela paciente.
                </p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{toqueFieldsFor(true).map(gyField)}</div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Dor ao toque (pode marcar mais de um)</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {TOQUE_DOR_OPTIONS.map((op) => (
                      <Chip key={op.key} active={form.gyneco.values[op.key] === "1"} onClick={() => toggleDor(op.key)}>
                        {op.label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Section>

        {/* HD */}
        <Section
          defaultOpen={false}
          title="HD (hipótese diagnóstica)"
          contentClassName="space-y-2"
          headerExtra={
            <Button
              type="button"
              size="sm"
              variant="outline"
              title="Copia a HD automática para o campo, para você editar"
              onClick={() => update({ hd: autoHd })}
            >
              Usar automática
            </Button>
          }
        >
          <Textarea
            rows={2}
            placeholder={autoHd}
            value={form.hd}
            onChange={(e) => update({ hd: e.target.value })}
          />
          <p className="text-[11px] text-muted-foreground">
            Em branco, usa a HD automática: <span className="font-medium">{autoHd}</span>
          </p>
        </Section>

        {/* Conduta */}
        <Section defaultOpen={false} title="Conduta" contentClassName="space-y-2">
          <Textarea
            rows={3}
            placeholder="DISCUTIDA&#10;- ORIENTAÇÕES DIETÉTICAS&#10;- RETORNO CONFORME ROTINA"
            value={form.cd}
            onChange={(e) => update({ cd: e.target.value })}
          />
        </Section>
      </div>

      {/* ----- Preview ----- */}
      <div className="lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Stethoscope className="h-4 w-4 text-teal-600" /> Prontuário
              </span>
              <CopyButton text={text} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="prontuario-text max-h-[70vh] overflow-y-auto text-xs">{text}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
