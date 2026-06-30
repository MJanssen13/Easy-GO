"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, Siren } from "lucide-react";
import { emptyPsgoForm, HABITS, COMPANION_RELATIONS, type PsgoForm } from "@/core/psgo/types";
import { renderPsgo, computePsgo } from "@/core/psgo/render";
import { PRIOR_TYPE_LABELS, type PriorPregnancyType } from "@/core/psgo/parity";
import { COMMON_COMORBIDITIES, classifyBmi } from "@/core/psgo/comorbidities";
import { COMMON_MEDICATIONS } from "@/core/psgo/medications";
import { EXAM_SYSTEMS, buildNormalLine } from "@/core/psgo/exam";
import { SEROLOGY_ANALYTES } from "@/core/psgo/serology";
import { renderImagingExam, type ImagingExam } from "@/core/psgo/imaging";
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

export function PsgoGenerator() {
  const [form, setForm] = useState<PsgoForm>(emptyPsgoForm);

  const update = (patch: Partial<PsgoForm>) => setForm((f) => ({ ...f, ...patch }));

  const text = useMemo(() => renderPsgo(form), [form]);
  const { robsonMissing } = useMemo(() => computePsgo(form), [form]);
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
  function addPrior() {
    update({
      priorPregnancies: [...form.priorPregnancies, { id: uid(), type: "N", year: "", note: "" }],
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

  // USGs
  function addUsg() {
    update({
      usgExams: [
        ...form.usgExams,
        { id: uid(), date: "", gaWeeks: undefined, gaDays: undefined, useForDating: form.usgExams.length === 0 },
      ],
    });
  }
  function updateUsg(id: string, patch: Partial<PsgoForm["usgExams"][number]>) {
    update({ usgExams: form.usgExams.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
  }
  function removeUsg(id: string) {
    update({ usgExams: form.usgExams.filter((u) => u.id !== id) });
  }
  function setDatingUsg(id: string) {
    update({ usgExams: form.usgExams.map((u) => ({ ...u, useForDating: u.id === id })) });
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
  function numOrUndef(v: string): number | undefined {
    return v === "" ? undefined : Number(v);
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* ----- Formulário ----- */}
      <div className="space-y-4">
        {/* Identificação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <Field label="Data da consulta">
              <Input type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} />
            </Field>
            <Field label="Idade">
              <Input value={form.age} onChange={(e) => update({ age: e.target.value })} inputMode="numeric" />
            </Field>
            <Field label="Nome" className="col-span-2">
              <Input value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </Field>
            <Field label="Nome social (opcional)">
              <Input value={form.socialName} onChange={(e) => update({ socialName: e.target.value })} />
            </Field>
            <Field label="RG">
              <Input value={form.rg} onChange={(e) => update({ rg: e.target.value })} />
            </Field>
            <Field label="Procedente de">
              <Input value={form.origin} onChange={(e) => update({ origin: e.target.value })} />
            </Field>
            <Field label="Acompanhante">
              <Input value={form.companion} onChange={(e) => update({ companion: e.target.value })} />
            </Field>
            <Field label="Parentesco do acompanhante">
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
            <Field label="Consultas pré-natal (nº)">
              <Input
                value={form.prenatalCount}
                onChange={(e) => update({ prenatalCount: e.target.value })}
                inputMode="numeric"
              />
            </Field>
            <Field label="Local do pré-natal">
              <Input value={form.prenatalPlace} onChange={(e) => update({ prenatalPlace: e.target.value })} />
            </Field>
          </CardContent>
        </Card>

        {/* Paridade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Paridade
              <Button type="button" size="sm" variant="outline" onClick={addPrior}>
                <Plus className="h-4 w-4" /> Gestação
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {form.priorPregnancies.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Primigesta (G1). Adicione gestações prévias se houver.
              </p>
            )}
            {form.priorPregnancies.map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <select
                  className={`${selectClass} w-28`}
                  value={p.type}
                  onChange={(e) => updatePrior(p.id, { type: e.target.value as PriorPregnancyType })}
                >
                  {(Object.keys(PRIOR_TYPE_LABELS) as PriorPregnancyType[]).map((t) => (
                    <option key={t} value={t}>
                      {t} — {PRIOR_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
                <Input
                  className="w-24"
                  placeholder="Ano"
                  value={p.year ?? ""}
                  inputMode="numeric"
                  onChange={(e) => updatePrior(p.id, { year: e.target.value })}
                />
                <Input
                  className="flex-1"
                  placeholder="Intercorrência"
                  value={p.note ?? ""}
                  onChange={(e) => updatePrior(p.id, { note: e.target.value })}
                />
                <Button type="button" variant="ghost" size="icon" onClick={() => removePrior(p.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Datação + dados do Robson */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Datação e dados obstétricos
              <Button type="button" size="sm" variant="outline" onClick={addUsg}>
                <Plus className="h-4 w-4" /> USG
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="DUM">
                <Input type="date" value={form.lmp} onChange={(e) => update({ lmp: e.target.value })} />
              </Field>
              <Field label="Datação">
                <select
                  className={selectClass}
                  value={form.datingPreference}
                  onChange={(e) => update({ datingPreference: e.target.value as PsgoForm["datingPreference"] })}
                >
                  <option value="auto">Automática (ACOG)</option>
                  <option value="lmp">Pela DUM</option>
                  <option value="us">Pelo US</option>
                </select>
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.lmpUncertain}
                onChange={(e) => update({ lmpUncertain: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              DUM incerta (datar pelo US)
            </label>

            {form.usgExams.map((u) => (
              <div key={u.id} className="flex flex-wrap items-end gap-2 rounded-md border p-2">
                <Field label="Data do US">
                  <Input
                    type="date"
                    className="w-40"
                    value={u.date ?? ""}
                    onChange={(e) => updateUsg(u.id, { date: e.target.value })}
                  />
                </Field>
                <Field label="IG sem">
                  <Input
                    type="number"
                    className="w-20"
                    value={u.gaWeeks ?? ""}
                    onChange={(e) => updateUsg(u.id, { gaWeeks: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </Field>
                <Field label="IG dias">
                  <Input
                    type="number"
                    className="w-20"
                    value={u.gaDays ?? ""}
                    onChange={(e) => updateUsg(u.id, { gaDays: e.target.value ? Number(e.target.value) : undefined })}
                  />
                </Field>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="datingUsg"
                    checked={!!u.useForDating}
                    onChange={() => setDatingUsg(u.id)}
                  />
                  Datar
                </label>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeUsg(u.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}

            <div className="grid grid-cols-3 gap-3">
              <Field label="Nº de fetos">
                <select
                  className={selectClass}
                  value={form.fetuses}
                  onChange={(e) => update({ fetuses: e.target.value as PsgoForm["fetuses"] })}
                >
                  <option value="">—</option>
                  <option value="single">Único</option>
                  <option value="multiple">Múltiplos</option>
                </select>
              </Field>
              <Field label="Apresentação">
                <select
                  className={selectClass}
                  value={form.presentation}
                  onChange={(e) => update({ presentation: e.target.value as PsgoForm["presentation"] })}
                >
                  <option value="">—</option>
                  <option value="cephalic">Cefálica</option>
                  <option value="breech">Pélvica</option>
                  <option value="transverse">Córmica</option>
                </select>
              </Field>
              <Field label="Início do TP">
                <select
                  className={selectClass}
                  value={form.laborOnset}
                  onChange={(e) => update({ laborOnset: e.target.value as PsgoForm["laborOnset"] })}
                >
                  <option value="">—</option>
                  <option value="spontaneous">Espontâneo</option>
                  <option value="induced">Induzido</option>
                  <option value="cesarean_before_labor">Cesárea antes do TP</option>
                </select>
              </Field>
            </div>
            {robsonMissing.length > 0 && (
              <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
                Robson incompleto — faltam: {robsonMissing.join(", ")}.
              </p>
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
                              <select
                                className={`${selectClass} h-7 w-20 text-xs`}
                                value={val}
                                onChange={(e) => setSerologyValue(a, c.id, e.target.value)}
                              >
                                <option value="">—</option>
                                <option value="NR">NR</option>
                                <option value="REAG">REAG</option>
                              </select>
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

        {/* Exames de imagem */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              Exames de imagem (USG)
              <Button type="button" size="sm" variant="outline" onClick={addImaging}>
                <Plus className="h-4 w-4" /> Exame
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {form.imagingExams.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Adicione um USG para calcular percentis (PFE/CA por Hadlock; Doppler pela FMF).
              </p>
            )}
            {form.imagingExams.map((e) => (
              <div key={e.id} className="space-y-2 rounded-md border p-2">
                <div className="flex items-end gap-2">
                  <Field label="Data">
                    <Input
                      type="date"
                      className="w-36"
                      value={e.date ?? ""}
                      onChange={(ev) => updateImaging(e.id, { date: ev.target.value })}
                    />
                  </Field>
                  <Field label="IG sem">
                    <Input
                      type="number"
                      className="w-20"
                      value={e.gaWeeks ?? ""}
                      onChange={(ev) => updateImaging(e.id, { gaWeeks: numOrUndef(ev.target.value) })}
                    />
                  </Field>
                  <Field label="IG dias">
                    <Input
                      type="number"
                      className="w-20"
                      value={e.gaDays ?? ""}
                      onChange={(ev) => updateImaging(e.id, { gaDays: numOrUndef(ev.target.value) })}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="ml-auto"
                    onClick={() => removeImaging(e.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Field label="PFE (g)">
                    <Input value={e.efw ?? ""} onChange={(ev) => updateImaging(e.id, { efw: ev.target.value })} inputMode="numeric" />
                  </Field>
                  <Field label="CA (mm)">
                    <Input value={e.ac ?? ""} onChange={(ev) => updateImaging(e.id, { ac: ev.target.value })} inputMode="numeric" />
                  </Field>
                  <Field label="IP-AUt (médio)">
                    <Input value={e.utpi ?? ""} onChange={(ev) => updateImaging(e.id, { utpi: ev.target.value })} inputMode="decimal" />
                  </Field>
                  <Field label="ACM-PSV (cm/s)">
                    <Input value={e.mcaPsv ?? ""} onChange={(ev) => updateImaging(e.id, { mcaPsv: ev.target.value })} inputMode="decimal" />
                  </Field>
                  <Field label="DV-IP">
                    <Input value={e.dvpi ?? ""} onChange={(ev) => updateImaging(e.id, { dvpi: ev.target.value })} inputMode="decimal" />
                  </Field>
                  <Field label="ILA / maior bolsão">
                    <Input value={e.ila ?? ""} onChange={(ev) => updateImaging(e.id, { ila: ev.target.value })} />
                  </Field>
                  <Field label="Placenta">
                    <Input value={e.placenta ?? ""} onChange={(ev) => updateImaging(e.id, { placenta: ev.target.value })} />
                  </Field>
                  <Field label="Apresentação">
                    <Input value={e.presentation ?? ""} onChange={(ev) => updateImaging(e.id, { presentation: ev.target.value })} />
                  </Field>
                  <Field label="Obs.">
                    <Input value={e.notes ?? ""} onChange={(ev) => updateImaging(e.id, { notes: ev.target.value })} />
                  </Field>
                </div>
                <p className="prontuario-text rounded bg-muted/40 px-2 py-1 text-[11px]">
                  {renderImagingExam(e)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* CTG / Conduta */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">CTG e conduta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Field label="CTG">
              <Input value={form.ctg} onChange={(e) => update({ ctg: e.target.value })} />
            </Field>
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
