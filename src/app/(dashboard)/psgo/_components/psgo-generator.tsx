"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Siren, Info } from "lucide-react";
import { emptyPsgoForm, HABITS, COMPANION_RELATIONS, type PsgoForm } from "@/core/psgo/types";
import { renderPsgo, computePsgo } from "@/core/psgo/render";
import { datingDisplay } from "@/core/psgo/dating";
import { abdFieldsFor, toqueFieldsFor, ESP_FIELDS, type GyField } from "@/core/psgo/gyneco-exam";
import { savePsgoAdmission } from "../actions";
import {
  PRIOR_TYPE_LABELS,
  BIRTH_ROUTE_LABELS,
  NO_COMPLICATIONS_LABEL,
  formatParity,
  isBirthType,
  canMarkNoComplications,
  requiredNotePrompt,
  type BirthRoute,
  type PriorPregnancyType,
} from "@/core/psgo/parity";
import { COMMON_COMORBIDITIES, classifyBmi } from "@/core/psgo/comorbidities";
import { COMMON_MEDICATIONS } from "@/core/psgo/medications";
import { EXAM_SYSTEMS, buildNormalLine } from "@/core/psgo/exam";
import { SEROLOGY_ANALYTES } from "@/core/psgo/serology";
import { renderImagingExam, examCpr, examCentiles, type ImagingExam } from "@/core/psgo/imaging";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

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
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/** Ícone "i" com um informativo curto em popover (clique para abrir/fechar). */
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
          {title && <p className="mb-1.5 font-semibold text-foreground">{title}</p>}
          <div className="space-y-1.5 text-muted-foreground">{children}</div>
        </div>
      )}
    </span>
  );
}

/** Segmented control (chave) para escolher entre valores mutuamente exclusivos. */
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
    <div className="inline-flex w-full rounded-md border bg-background p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 rounded px-2 py-1 text-xs font-medium transition-colors ${
            value === opt.value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function PsgoGenerator({
  initialForm,
  patientId,
}: {
  initialForm?: PsgoForm;
  patientId?: string;
} = {}) {
  const router = useRouter();
  const [form, setForm] = useState<PsgoForm>(initialForm ?? emptyPsgoForm);
  const [saving, startSaving] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (patch: Partial<PsgoForm>) => setForm((f) => ({ ...f, ...patch }));

  function handleSave() {
    setSaveMsg(null);
    startSaving(async () => {
      const res = await savePsgoAdmission(form, patientId);
      if (res.error) {
        setSaveMsg({ ok: false, text: res.error });
        return;
      }
      if (res.patientId) {
        router.push(`/psgo/${res.patientId}`);
        router.refresh();
      }
    });
  }

  const text = useMemo(() => renderPsgo(form), [form]);
  const { robsonMissing } = useMemo(() => computePsgo(form), [form]);
  const imagingCentiles = useMemo(
    () => Object.fromEntries(form.imagingExams.map((e) => [e.id, examCentiles(e)])),
    [form.imagingExams],
  );
  const parityView = useMemo(
    () => formatParity(form.priorPregnancies, form.pregnant),
    [form.priorPregnancies, form.pregnant],
  );
  const datingView = useMemo(
    () =>
      datingDisplay({
        lmp: form.lmp,
        lmpUncertain: form.lmpUncertain,
        usgExams: form.imagingExams,
        preference: form.datingPreference,
      }),
    [form.lmp, form.lmpUncertain, form.imagingExams, form.datingPreference],
  );
  const bmi = classifyBmi(
    form.weight ? Number(form.weight) : null,
    form.height ? Number(form.height) : null,
  );

  function toggleArray(key: "comorbidities" | "habits", value: string) {
    setForm((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  }

  // Paridade
  function addPrior(type: PriorPregnancyType = "N") {
    update({
      priorPregnancies: [...form.priorPregnancies, { id: uid(), type, year: "", note: "" }],
    });
  }
  function updatePrior(id: string, patch: Partial<PsgoForm["priorPregnancies"][number]>) {
    update({
      priorPregnancies: form.priorPregnancies.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }
  function removePrior(id: string) {
    update({ priorPregnancies: form.priorPregnancies.filter((p) => p.id !== id) });
  }

  // Medicamentos
  function addMed(label: string) {
    if (form.medications.some((m) => m.label === label)) return;
    update({ medications: [...form.medications, { id: uid(), label, current: true }] });
  }
  function updateMed(id: string, patch: Partial<PsgoForm["medications"][number]>) {
    update({ medications: form.medications.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
  }
  function removeMed(id: string) {
    update({ medications: form.medications.filter((m) => m.id !== id) });
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
      serologyGrid: {
        columns: form.serologyGrid.columns.filter((c) => c.id !== id),
        values,
      },
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

  // Exames de imagem
  function addImaging() {
    update({ imagingExams: [...form.imagingExams, { id: uid() }] });
  }
  function updateImaging(id: string, patch: Partial<ImagingExam>) {
    update({ imagingExams: form.imagingExams.map((e) => (e.id === id ? { ...e, ...patch } : e)) });
  }
  function removeImaging(id: string) {
    update({ imagingExams: form.imagingExams.filter((e) => e.id !== id) });
  }
  function setDatingImaging(id: string) {
    update({
      imagingExams: form.imagingExams.map((e) => ({ ...e, useForDating: e.id === id })),
    });
  }
  function numOrUndef(v: string): number | undefined {
    return v === "" ? undefined : Number(v);
  }

  // Exame ginecológico
  function setGyneco(patch: Partial<PsgoForm["gyneco"]>) {
    update({ gyneco: { ...form.gyneco, ...patch } });
  }
  function setGynecoValue(fieldId: string, label: string) {
    update({ gyneco: { ...form.gyneco, values: { ...form.gyneco.values, [fieldId]: label } } });
  }
  const gyField = (field: GyField) => (
    <div key={field.id} className="space-y-1">
      <Label className="text-xs text-muted-foreground">{field.label}</Label>
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
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ----- Formulário (2/3) ----- */}
      <div className="space-y-4 lg:col-span-2">
        {/* Identificação (o toggle gestante/não gestante vive no canto sup. esq.) */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-56 max-w-full">
                <Segmented
                  value={form.pregnant ? "sim" : "nao"}
                  onChange={(v) => update({ pregnant: v === "sim" })}
                  options={[
                    { value: "sim", label: "Gestante" },
                    { value: "nao", label: "Não gestante" },
                  ]}
                />
              </div>
              <CardTitle className="text-base">Identificação</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Data · Idade · RG */}
            <div className="flex flex-wrap gap-3">
              <Field label="Data da consulta" className="min-w-[9rem] flex-1">
                <Input type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} />
              </Field>
              <Field label="Idade" className="w-24">
                <Input value={form.age} onChange={(e) => update({ age: e.target.value })} inputMode="numeric" />
              </Field>
              <Field label="RG" className="min-w-[8rem] flex-1">
                <Input value={form.rg} onChange={(e) => update({ rg: e.target.value })} />
              </Field>
            </div>

            {/* Nome (2/3) · Nome social (1/3) */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Nome" className="col-span-2">
                <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
              </Field>
              <Field label="Nome social (opcional)" className="col-span-1">
                <Input value={form.socialName} onChange={(e) => update({ socialName: e.target.value })} />
              </Field>
            </div>

            {/* Procedência · Local do pré-natal · Nº consultas · irregular */}
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Procedente de" className="min-w-[12rem] flex-1">
                <Input value={form.origin} onChange={(e) => update({ origin: e.target.value })} />
              </Field>
              {form.pregnant && (
                <>
                  <Field label="Local do pré-natal" className="min-w-[12rem] flex-1">
                    <Input
                      value={form.prenatalPlace}
                      onChange={(e) => update({ prenatalPlace: e.target.value })}
                    />
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
                </>
              )}
            </div>

            {/* Acompanhante · Parentesco (+ Qual? se OUTRO) */}
            <div className="flex flex-wrap items-end gap-3">
              <Field label="Acompanhante" className="min-w-[12rem] flex-1">
                <Input value={form.companion} onChange={(e) => update({ companion: e.target.value })} />
              </Field>
              <Field label="Parentesco" className="min-w-[10rem] flex-1">
                <select
                  className={selectClass}
                  value={form.companionRelation}
                  onChange={(e) => update({ companionRelation: e.target.value })}
                >
                  <option value="">—</option>
                  {COMPANION_RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </Field>
              {form.companionRelation === "OUTRO" && (
                <Field label="Qual parentesco?" className="min-w-[10rem] flex-1">
                  <Input
                    value={form.companionRelationOther}
                    onChange={(e) => update({ companionRelationOther: e.target.value })}
                  />
                </Field>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Paridade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2 text-base">
              <span className="flex items-center gap-1.5">
                Paridade
                <InfoTip title="Como codificar a paridade (convenção do serviço)">
                  <p>
                    <strong>G</strong> = gestações (gemelar = 1; soma a atual se gestante).{" "}
                    <strong>P</strong> = todos os desfechos: partos <strong>N</strong> (normal),{" "}
                    <strong>C</strong> (cesárea) e <strong>F</strong> (fórceps) e também abortos{" "}
                    <strong>A</strong>, com as ectópicas <strong>E</strong> aninhadas em A.
                  </p>
                  <p>
                    Gemelar: via vaginal conta 1 parto por feto; cesárea conta 1 parto para os dois
                    fetos.
                  </p>
                  <p>
                    Ex.: <strong>G5P4(N1C2A1)</strong> · <strong>G5P5(N2C1A2(E1))</strong> ·{" "}
                    <strong>G2P3(N3(GEM2))</strong> · <strong>G3P3(N2C1(GEM2[N1C1]))</strong>.
                  </p>
                  <p>
                    Difere do GPA/GTPAL clássico (ACOG/Williams), em que abortos não somam em P e
                    gemelar conta 1 parto — validar com a equipe.
                  </p>
                </InfoTip>
              </span>
              {parityView.summary && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-sm font-bold tabular-nums text-primary">
                  {parityView.summary}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {(["N", "C", "F", "A", "E"] as PriorPregnancyType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addPrior(t)}
                >
                  <Plus className="h-3.5 w-3.5" /> {PRIOR_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>

            {form.priorPregnancies.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {form.pregnant
                  ? "Primigesta (G1P0). Use os botões acima para registrar gestações prévias."
                  : "Sem gestações prévias (G0P0). Use os botões acima para registrá-las."}
              </p>
            ) : (
              form.priorPregnancies.map((p, idx) => (
                <div key={p.id} className="space-y-2 rounded-md border p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">
                      {idx + 1}ª gestação
                    </span>
                    <select
                      className={`${selectClass} h-8 w-40`}
                      value={p.type}
                      onChange={(e) => {
                        const type = e.target.value as PriorPregnancyType;
                        // Gemelar só p/ parto (N/F/C); "sem intercorrências" só p/ N e C.
                        updatePrior(p.id, {
                          type,
                          ...(isBirthType(type) ? {} : { twin: false, twinRoute2: undefined }),
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
                    {isBirthType(p.type) && (
                      <label className="flex items-center gap-1.5 text-xs">
                        <input
                          type="checkbox"
                          checked={!!p.twin}
                          onChange={(e) =>
                            updatePrior(p.id, {
                              twin: e.target.checked,
                              twinRoute2:
                                e.target.checked && isBirthType(p.type)
                                  ? (p.twinRoute2 ?? p.type)
                                  : undefined,
                            })
                          }
                          className="h-4 w-4 rounded border-input"
                        />
                        Gemelar
                      </label>
                    )}
                    <div className="ml-auto flex items-center gap-1">
                      {canMarkNoComplications(p.type) && (
                        <Chip
                          active={!!p.noComplications}
                          onClick={() => updatePrior(p.id, { noComplications: !p.noComplications })}
                        >
                          {NO_COMPLICATIONS_LABEL}
                        </Chip>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removePrior(p.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {isBirthType(p.type) && p.twin && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-muted-foreground">Via do 2º gemelar:</span>
                      <div className="w-56">
                        <Segmented
                          value={(p.twinRoute2 ?? p.type) as BirthRoute}
                          onChange={(v) => updatePrior(p.id, { twinRoute2: v })}
                          options={(Object.keys(BIRTH_ROUTE_LABELS) as BirthRoute[]).map((r) => ({
                            value: r,
                            label: BIRTH_ROUTE_LABELS[r],
                          }))}
                        />
                      </div>
                    </div>
                  )}
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
          </CardContent>
        </Card>

        {/* Datação + dados do Robson (não gestante: apenas a DUM) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {form.pregnant ? "Datação e dados obstétricos" : "DUM"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="DUM">
                <Input type="date" value={form.lmp} onChange={(e) => update({ lmp: e.target.value })} />
              </Field>
              {form.pregnant && (
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs">Datação</Label>
                  <InfoTip title="Como é feita a datação">
                    <p>
                      O USG usado é o marcado em <strong>&ldquo;Datar&rdquo;</strong> no quadro de
                      exames de imagem.
                    </p>
                    <p>
                      <strong>DUM</strong> — regra de Naegele (DUM + 280 dias).
                    </p>
                    <p>
                      <strong>USG</strong> — pela IG do exame (data + IG do USG).
                    </p>
                    <p>
                      <strong>Auto (ACOG)</strong> — mantém a DUM, mas <em>redata pela USG</em> se a
                      diferença passar do limite da IG no exame: 5d (≤8s), 7d (até 16s), 10d (até
                      22s), 14d (até 28s), 21d (≥28s). Committee Opinion 700.
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
              )}
            </div>
            {form.pregnant && (
            <>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.lmpUncertain}
                onChange={(e) => update({ lmpUncertain: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              DUM incerta (datar pelo US)
            </label>

            {/* IG pela DUM × pela USG (o usado para a HD fica destacado) */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`rounded-lg border p-2.5 transition-colors ${
                  datingView.chosen === "DUM" ? "border-primary/60 bg-primary/5" : "bg-background"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    IG pela DUM
                  </span>
                  {datingView.chosen === "DUM" && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      usada
                    </span>
                  )}
                </div>
                {datingView.dum ? (
                  <>
                    <p className="mt-1 text-xl font-bold leading-none tabular-nums">
                      {datingView.dum.ga.weeks}
                      <span className="text-sm font-medium text-muted-foreground">s </span>
                      {datingView.dum.ga.days}
                      <span className="text-sm font-medium text-muted-foreground">d</span>
                    </p>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      DPP {datingView.dum.eddBR}
                    </p>
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
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    IG pela USG
                  </span>
                  {datingView.chosen === "US" && (
                    <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      usada
                    </span>
                  )}
                </div>
                {datingView.usg ? (
                  <>
                    <p className="mt-1 text-xl font-bold leading-none tabular-nums">
                      {datingView.usg.currentGa.weeks}
                      <span className="text-sm font-medium text-muted-foreground">s </span>
                      {datingView.usg.currentGa.days}
                      <span className="text-sm font-medium text-muted-foreground">d</span>
                    </p>
                    <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                      Exame {datingView.usg.dateBR} · {datingView.usg.gaAtExam.weeks}s
                      {datingView.usg.gaAtExam.days}d na data
                    </p>
                  </>
                ) : (
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    Marque um USG em &ldquo;Datar&rdquo; no quadro de imagem.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nº de fetos</Label>
                <Segmented
                  value={form.fetuses}
                  onChange={(v) => update({ fetuses: v })}
                  options={[
                    { value: "single", label: "Único" },
                    { value: "multiple", label: "Múltiplos" },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Apresentação</Label>
                <Segmented
                  value={form.presentation}
                  onChange={(v) => update({ presentation: v })}
                  options={[
                    { value: "cephalic", label: "Cefálica" },
                    { value: "breech", label: "Pélvica" },
                    { value: "transverse", label: "Córmica" },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Início do TP</Label>
                <Segmented
                  value={form.laborOnset}
                  onChange={(v) => update({ laborOnset: v })}
                  options={[
                    { value: "spontaneous", label: "Espontâneo" },
                    { value: "induced", label: "Induzido" },
                    { value: "cesarean_before_labor", label: "Cesárea pré-TP" },
                  ]}
                />
              </div>
            </div>
            {robsonMissing.length > 0 && (
              <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Robson incompleto — faltam: {robsonMissing.join(", ")}.
              </p>
            )}
            </>
            )}
          </CardContent>
        </Card>

        {/* Tipo sanguíneo / Coombs */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tipo sanguíneo e Coombs</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3">
            <Field label="Tipo sanguíneo">
              <select
                className={selectClass}
                value={form.bloodType}
                onChange={(e) => update({ bloodType: e.target.value })}
              >
                <option value="">—</option>
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => (
                  <option key={bt} value={bt}>
                    {bt}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Coombs indireto">
              <select
                className={selectClass}
                value={form.coombs}
                onChange={(e) => update({ coombs: e.target.value as PsgoForm["coombs"] })}
              >
                <option value="">—</option>
                <option value="neg">Negativo</option>
                <option value="pos">Positivo</option>
              </select>
            </Field>
            <Field label="Data do CI">
              <Input type="date" value={form.coombsDate} onChange={(e) => update({ coombsDate: e.target.value })} />
            </Field>
          </CardContent>
        </Card>

        {/* Comorbidades */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Comorbidades (CMB)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
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
            {bmi?.label && (
              <p className="text-xs text-muted-foreground">Automático: {bmi.label}</p>
            )}
          </CardContent>
        </Card>

        {/* Medicamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Medicamentos em uso (MEU)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex flex-wrap gap-1.5">
              {COMMON_MEDICATIONS.map((m) => (
                <Chip key={m} active={form.medications.some((x) => x.label === m)} onClick={() => addMed(m)}>
                  {m}
                </Chip>
              ))}
            </div>
            {form.medications.map((m) => (
              <div key={m.id} className="flex flex-wrap items-center gap-2 rounded-md border p-2 text-sm">
                <span className="flex-1 font-medium">{m.label}</span>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={m.current}
                    onChange={(e) => updateMed(m.id, { current: e.target.checked })}
                  />
                  Em uso
                </label>
                {!m.current && (
                  <>
                    <Input
                      className="w-24"
                      placeholder="Início"
                      value={m.pastStart ?? ""}
                      onChange={(e) => updateMed(m.id, { pastStart: e.target.value })}
                    />
                    <Input
                      className="w-24"
                      placeholder="Fim"
                      value={m.pastEnd ?? ""}
                      onChange={(e) => updateMed(m.id, { pastEnd: e.target.value })}
                    />
                  </>
                )}
                <Button type="button" variant="ghost" size="icon" onClick={() => removeMed(m.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
            <Input
              placeholder="Outros medicamentos (separados por vírgula)"
              value={form.medicationsOther}
              onChange={(e) => update({ medicationsOther: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Cirurgias / alergias / hábitos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cirurgias, alergias e hábitos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Cirurgias prévias">
              <Input value={form.surgeries} onChange={(e) => update({ surgeries: e.target.value })} />
            </Field>
            <Field label="Alergias">
              <Input value={form.allergies} onChange={(e) => update({ allergies: e.target.value })} />
            </Field>
            <Field label="Hábitos de vida (HCV)">
              <div className="flex flex-wrap gap-1.5">
                {HABITS.map((h) => (
                  <Chip key={h} active={form.habits.includes(h)} onClick={() => toggleArray("habits", h)}>
                    {h}
                  </Chip>
                ))}
              </div>
            </Field>
            <Input
              placeholder="Outros hábitos"
              value={form.habitsOther}
              onChange={(e) => update({ habitsOther: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Sorologias */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Sorologias
              <Button type="button" size="sm" variant="outline" onClick={addSerologyColumn}>
                <Plus className="h-4 w-4" /> Coleta externa
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Colar sorologias do hospital">
              <Textarea
                rows={3}
                placeholder="-(dd/mm/aaaa): TOXO SUSCETÍVEL / HBSAG NR / ..."
                value={form.serologyPasted}
                onChange={(e) => update({ serologyPasted: e.target.value })}
              />
            </Field>

            {form.serologyGrid.columns.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border-b p-1 text-left font-medium text-muted-foreground">
                        Externas (EXT)
                      </th>
                      {form.serologyGrid.columns.map((c) => (
                        <th key={c.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <Input
                              type="date"
                              className="h-7 w-32 text-xs"
                              value={c.date}
                              onChange={(e) => updateSerologyColumn(c.id, e.target.value)}
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
                                <Input
                                  className="h-7 w-24 text-xs"
                                  placeholder="NR / 1:..."
                                  value={val}
                                  onChange={(e) => setSerologyValue(a, c.id, e.target.value)}
                                />
                              </td>
                            );
                          }
                          return (
                            <td key={c.id} className="border-b p-1">
                              <div className="inline-flex rounded-md border p-0.5">
                                {[
                                  { v: "", label: "—", title: "Não realizado" },
                                  { v: "NR", label: "NR", title: "Não reagente" },
                                  { v: "REAG", label: "REAG", title: "Reagente" },
                                ].map((o) => {
                                  const active = val === o.v;
                                  return (
                                    <button
                                      key={o.v || "nd"}
                                      type="button"
                                      title={o.title}
                                      onClick={() => setSerologyValue(a, c.id, o.v)}
                                      className={`rounded px-1.5 py-0.5 text-[11px] font-semibold transition-colors ${
                                        active
                                          ? o.v === "REAG"
                                            ? "bg-rose-600 text-white"
                                            : o.v === "NR"
                                              ? "bg-emerald-600 text-white"
                                              : "bg-muted text-foreground"
                                          : "text-muted-foreground hover:bg-muted"
                                      }`}
                                    >
                                      {o.label}
                                    </button>
                                  );
                                })}
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
          </CardContent>
        </Card>

        {/* QP / HPMA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Queixa e história</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="Queixa principal (QP)">
              <Input value={form.qp} onChange={(e) => update({ qp: e.target.value })} />
            </Field>
            <Field label="HPMA">
              <Textarea rows={3} value={form.hpma} onChange={(e) => update({ hpma: e.target.value })} />
            </Field>
          </CardContent>
        </Card>

        {/* Exame físico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exame físico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <Field label="Peso (kg)">
                <Input value={form.weight} onChange={(e) => update({ weight: e.target.value })} inputMode="decimal" />
              </Field>
              <Field label="Altura (m)">
                <Input value={form.height} onChange={(e) => update({ height: e.target.value })} inputMode="decimal" />
              </Field>
              <Field label="Temp (°C)">
                <Input
                  value={form.vitals.temp ?? ""}
                  onChange={(e) => update({ vitals: { ...form.vitals, temp: e.target.value } })}
                />
              </Field>
              <Field label="FR (irpm)">
                <Input
                  value={form.vitals.fr ?? ""}
                  onChange={(e) => update({ vitals: { ...form.vitals, fr: e.target.value } })}
                />
              </Field>
              <Field label="Sat (%)">
                <Input
                  value={form.vitals.sat ?? ""}
                  onChange={(e) => update({ vitals: { ...form.vitals, sat: e.target.value } })}
                />
              </Field>
              <Field label="PAS">
                <Input
                  value={form.vitals.pas ?? ""}
                  onChange={(e) => update({ vitals: { ...form.vitals, pas: e.target.value } })}
                />
              </Field>
              <Field label="PAD">
                <Input
                  value={form.vitals.pad ?? ""}
                  onChange={(e) => update({ vitals: { ...form.vitals, pad: e.target.value } })}
                />
              </Field>
              <Field label="FC (bpm)">
                <Input
                  value={form.vitals.fc ?? ""}
                  onChange={(e) => update({ vitals: { ...form.vitals, fc: e.target.value } })}
                />
              </Field>
              {form.pregnant && (
                <>
                  <Field label="AU (cm)">
                    <Input
                      value={form.vitals.au ?? ""}
                      onChange={(e) => update({ vitals: { ...form.vitals, au: e.target.value } })}
                    />
                  </Field>
                  <Field label="BCF (bpm)">
                    <Input
                      value={form.vitals.bcf ?? ""}
                      onChange={(e) => update({ vitals: { ...form.vitals, bcf: e.target.value } })}
                    />
                  </Field>
                </>
              )}
            </div>

            {EXAM_SYSTEMS.map((s) => {
              const st = form.exam[s.id];
              return (
                <div key={s.id} className="rounded-md border p-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{s.label}</span>
                    <div className="flex gap-1">
                      <Chip
                        active={st.mode === "normal"}
                        onClick={() => update({ exam: { ...form.exam, [s.id]: { ...st, mode: "normal" } } })}
                      >
                        Normal
                      </Chip>
                      <Chip
                        active={st.mode === "altered"}
                        onClick={() => update({ exam: { ...form.exam, [s.id]: { ...st, mode: "altered" } } })}
                      >
                        Alterado
                      </Chip>
                    </div>
                  </div>
                  {st.mode === "altered" ? (
                    <Textarea
                      className="mt-2"
                      rows={2}
                      value={st.text}
                      placeholder={buildNormalLine(s.id, form.vitals)}
                      onChange={(e) => update({ exam: { ...form.exam, [s.id]: { ...st, text: e.target.value } } })}
                    />
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{buildNormalLine(s.id, form.vitals)}</p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Exame ginecológico e obstétrico */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {form.pregnant ? "Exame ginecológico e obstétrico" : "Exame ginecológico"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Abdome */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">{form.pregnant ? "Abdome (gravídico)" : "Abdome"}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {abdFieldsFor(form.pregnant).map(gyField)}
              </div>
              {form.pregnant && (
                <p className="text-xs text-muted-foreground">
                  AU e BCF vêm dos sinais vitais do exame físico.
                </p>
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
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={form.gyneco.toqueAutorizado}
                      onChange={(e) => setGyneco({ toqueAutorizado: e.target.checked })}
                      className="h-4 w-4 rounded border-input"
                    />
                    Autorizado pela paciente
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {toqueFieldsFor(form.pregnant).map(gyField)}
                  </div>
                </>
              )}
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
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{ESP_FIELDS.map(gyField)}</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exames laboratoriais */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Exames laboratoriais</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              rows={3}
              placeholder="Cole os exames laboratoriais..."
              value={form.labs}
              onChange={(e) => update({ labs: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* Exames de imagem (USG obstétrico) — seção própria, em quadro */}
        {form.pregnant && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Exames de imagem (USG)
              <Button type="button" size="sm" variant="outline" onClick={addImaging}>
                <Plus className="h-4 w-4" /> USG
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.imagingExams.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Adicione um USG. Percentis de PESO/CIRC. ABDOMINAL pela Hadlock; IP-AUmb, IP-ACM e
                RCP pela FMF (Ciobanu 2019).
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="border-b p-1 text-left font-medium text-muted-foreground">
                        USG
                      </th>
                      {form.imagingExams.map((e) => (
                        <th key={e.id} className="border-b p-1 align-top">
                          <div className="flex items-center gap-1">
                            <Input
                              type="date"
                              className="h-7 w-32 text-xs"
                              value={e.date ?? ""}
                              onChange={(ev) => updateImaging(e.id, { date: ev.target.value })}
                            />
                            <button
                              type="button"
                              onClick={() => removeImaging(e.id)}
                              className="text-destructive"
                              title="Remover USG"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border-b p-1 font-medium">IG (sem / d)</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <div className="flex gap-1">
                            <Input
                              type="number"
                              className="h-7 w-14 text-xs"
                              placeholder="sem"
                              value={e.gaWeeks ?? ""}
                              onChange={(ev) => updateImaging(e.id, { gaWeeks: numOrUndef(ev.target.value) })}
                            />
                            <Input
                              type="number"
                              className="h-7 w-14 text-xs"
                              placeholder="d"
                              value={e.gaDays ?? ""}
                              onChange={(ev) => updateImaging(e.id, { gaDays: numOrUndef(ev.target.value) })}
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">Datar</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <label className="flex items-center gap-1 text-xs text-muted-foreground">
                            <input
                              type="radio"
                              name="imgDating"
                              checked={!!e.useForDating}
                              onChange={() => setDatingImaging(e.id)}
                            />
                            usar p/ datação
                          </label>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">Apresentação</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <select
                            className={`${selectClass} h-7 w-28 text-xs`}
                            value={e.presentation ?? ""}
                            onChange={(ev) => updateImaging(e.id, { presentation: ev.target.value })}
                          >
                            <option value="">—</option>
                            <option value="CEFÁLICA">Cefálica</option>
                            <option value="PÉLVICA">Pélvica</option>
                            <option value="CÓRMICA">Córmica</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">Peso (g)</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-16 text-xs"
                              inputMode="numeric"
                              value={e.efw ?? ""}
                              onChange={(ev) => updateImaging(e.id, { efw: ev.target.value })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {imagingCentiles[e.id]?.efw}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">Circ. abd. (mm)</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-16 text-xs"
                              inputMode="numeric"
                              value={e.ac ?? ""}
                              onChange={(ev) => updateImaging(e.id, { ac: ev.target.value })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {imagingCentiles[e.id]?.ac}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">Placenta (inserção)</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <select
                            className={`${selectClass} h-7 w-28 text-xs`}
                            value={e.placentaSite ?? ""}
                            onChange={(ev) => updateImaging(e.id, { placentaSite: ev.target.value })}
                          >
                            <option value="">—</option>
                            <option value="ANTERIOR">Anterior</option>
                            <option value="POSTERIOR">Posterior</option>
                            <option value="FÚNDICA">Fúndica</option>
                            <option value="LATERAL DIREITA">Lateral D</option>
                            <option value="LATERAL ESQUERDA">Lateral E</option>
                            <option value="PRÉVIA">Prévia</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">Grau placentário</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <select
                            className={`${selectClass} h-7 w-14 text-xs`}
                            value={e.placentaGrade ?? ""}
                            onChange={(ev) => updateImaging(e.id, { placentaGrade: ev.target.value })}
                          >
                            <option value="">—</option>
                            <option value="0">0</option>
                            <option value="I">I</option>
                            <option value="II">II</option>
                            <option value="III">III</option>
                          </select>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">MBV (cm)</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <Input
                            className="h-7 w-16 text-xs"
                            inputMode="decimal"
                            value={e.mbv ?? ""}
                            onChange={(ev) => updateImaging(e.id, { mbv: ev.target.value })}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">IP AUmb</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-16 text-xs"
                              inputMode="decimal"
                              value={e.uaPi ?? ""}
                              onChange={(ev) => updateImaging(e.id, { uaPi: ev.target.value })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {imagingCentiles[e.id]?.uaPi}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">IP ACM</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-16 text-xs"
                              inputMode="decimal"
                              value={e.mcaPi ?? ""}
                              onChange={(ev) => updateImaging(e.id, { mcaPi: ev.target.value })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {imagingCentiles[e.id]?.mcaPi}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">RCP</td>
                      {form.imagingExams.map((e) => {
                        const rcp = examCpr(e);
                        return (
                          <td key={e.id} className="border-b p-1">
                            <div className="flex items-center gap-1">
                              <span className="font-medium tabular-nums">
                                {rcp != null ? rcp.toFixed(2) : "—"}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {imagingCentiles[e.id]?.cpr}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {form.imagingExams.map((e) => (
              <p key={e.id} className="prontuario-text rounded bg-muted/40 px-2 py-1 text-[11px]">
                {renderImagingExam(e)}
              </p>
            ))}
          </CardContent>
        </Card>
        )}

        {/* CTG / Conduta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{form.pregnant ? "CTG e conduta" : "Conduta"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.pregnant && (
              <Field label="CTG">
                <Input value={form.ctg} onChange={(e) => update({ ctg: e.target.value })} />
              </Field>
            )}
            <Field label="Conduta (CD)">
              <Textarea rows={2} value={form.cd} onChange={(e) => update({ cd: e.target.value })} />
            </Field>
          </CardContent>
        </Card>
      </div>

      {/* ----- Preview ----- */}
      <div className="lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Siren className="h-4 w-4 text-rose-600" /> Prontuário
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSave}
                  disabled={saving || !form.name.trim()}
                  title={!form.name.trim() ? "Informe o nome para salvar" : "Salvar admissão"}
                >
                  {saving ? "Salvando…" : patientId ? "Salvar alterações" : "Salvar admissão"}
                </Button>
                <CopyButton text={text} />
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {saveMsg && (
              <p
                className={`mb-2 rounded px-2 py-1 text-xs ${
                  saveMsg.ok
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {saveMsg.text}
              </p>
            )}
            <pre className="prontuario-text max-h-[70vh] overflow-y-auto text-xs">{text}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
