"use client";

import { JumpToOutput } from "@/components/jump-to-output";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, RefreshCw, Save, Microscope } from "lucide-react";
import type { Observation, Patient } from "@/core/patients/types";
import {
  ONCO_DISCHARGE_ITEMS,
  ONCO_EVOLUTION_ITEMS,
  ONCO_PLAN_ITEMS,
  nextOncoForm,
  type OncoEvolutionForm,
  type OncoExam,
  type OncoHistory,
  type OncoSummary,
} from "@/core/oncogineco/types";
import { ECOG_LABELS, draftOncoContext, renderOncoEvolution } from "@/core/oncogineco/render";
import { nursingParamsFrom } from "@/core/prontuario/ward";
import { vitalAlerts } from "@/core/obstetric/alerts";
import { readShiftTeam } from "@/lib/shift-team";
import { Section, SectionIndex, SectionNavProvider } from "@/components/form-section";
import { Chip, ExamLine, Field } from "@/components/form-controls";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import { saveOncoWorkspace, type Basics } from "../actions";
import { BasicsFields, ContextField, OncoDiagnosisFields, OncoHistoryFields } from "./onco-fields";

const PRECEPTOR_KEY = "easygo.preceptor";
const EXAMINER_KEY = "easygo.lastExaminer";

function num(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export function OncoWorkspace({
  patient,
  summary,
  observations,
}: {
  patient: Patient;
  summary: OncoSummary;
  observations: Observation[];
}) {
  const router = useRouter();
  const [saving, startSaving] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [basics, setBasics] = useState<Basics>({
    name: patient.name,
    medicalRecordNumber: patient.medicalRecordNumber ?? "",
    bed: patient.bed ?? "",
    age: patient.age != null ? String(patient.age) : "",
    parity: patient.parity ?? "",
    bloodType: patient.bloodType ?? "",
  });
  const [history, setHistory] = useState<OncoHistory>(summary.history);
  const [form, setForm] = useState<OncoEvolutionForm>(() => nextOncoForm(summary.lastForm));
  const [author, setAuthor] = useState("");

  useEffect(() => {
    setForm((f) => ({
      ...f,
      date: new Date().toISOString(),
      nursingParams: f.nursingParams || nursingParamsFrom(observations),
    }));
    try {
      const pre = window.localStorage.getItem(PRECEPTOR_KEY) || readShiftTeam().chefia.split(",")[0]?.trim() || "";
      setForm((f) => ({ ...f, preceptor: f.preceptor || pre }));
      setAuthor(window.localStorage.getItem(EXAMINER_KEY) ?? "");
    } catch {
      // sem localStorage
    }
  }, [observations]);

  const set = (patch: Partial<OncoEvolutionForm>) => setForm((f) => ({ ...f, ...patch }));
  const setExam = (patch: Partial<OncoExam>) => setForm((f) => ({ ...f, exam: { ...f.exam, ...patch } }));
  const setVital = (k: keyof OncoEvolutionForm["vitals"], v: string) =>
    setForm((f) => ({ ...f, vitals: { ...f.vitals, [k]: v } }));

  const text = useMemo(
    () =>
      renderOncoEvolution(
        {
          ...patient,
          name: basics.name.toUpperCase(),
          medicalRecordNumber: basics.medicalRecordNumber,
          age: num(basics.age),
          parity: basics.parity,
          bloodType: basics.bloodType,
        },
        history,
        form,
      ),
    [patient, basics, history, form],
  );

  const alerts = vitalAlerts({
    paSystolic: num(form.vitals.paSystolic),
    paDiastolic: num(form.vitals.paDiastolic),
    fc: num(form.vitals.fc),
    tax: num(form.vitals.tax),
    spo2: num(form.vitals.spo2),
  });

  function save(evolve: boolean) {
    setMsg(null);
    try {
      if (form.preceptor.trim()) window.localStorage.setItem(PRECEPTOR_KEY, form.preceptor.trim());
    } catch {
      // sem localStorage
    }
    startSaving(async () => {
      const res = await saveOncoWorkspace(patient.id, { basics, history, form, text, author, evolve });
      if (res.error) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: evolve ? "Evolução salva no histórico." : "Dados salvos." });
        router.refresh();
      }
    });
  }

  const hasDx = !!history.diagnosis.trim();
  const hasHistory = [history.cmb, history.meu, history.surgeries, history.allergies, history.hcv].some((v) => v.trim());

  return (
    <SectionNavProvider className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <SectionIndex />

        <Section
          title="Diagnóstico e internação"
          navLabel="Diagnóstico"
          defaultOpen={!hasDx}
          filled={hasDx}
          contentClassName="space-y-3"
        >
          <OncoDiagnosisFields value={history} onChange={setHistory} />
          <ContextField
            value={history.context}
            onChange={(v) => setHistory((h) => ({ ...h, context: v }))}
            onDraft={() => setHistory((h) => ({ ...h, context: draftOncoContext(h) }))}
          />
        </Section>

        <Section
          title="Paciente e antecedentes"
          navLabel="Antecedentes"
          defaultOpen={false}
          filled={hasHistory}
          contentClassName="space-y-3"
        >
          <BasicsFields basics={basics} onChange={setBasics} />
          <OncoHistoryFields value={history} onChange={setHistory} />
        </Section>

        <Section title="Evolução (queixas)" navLabel="Evolução" filled={!!form.complaints.trim()} contentClassName="space-y-3">
          <div className="space-y-1.5">
            {ONCO_EVOLUTION_ITEMS.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-1.5">
                <span className="w-32 shrink-0 text-xs text-muted-foreground">{item.label}</span>
                {item.options.map((o) => (
                  <Chip
                    key={o.label}
                    active={(form.choices[item.id] ?? "") === o.text}
                    onClick={() => set({ choices: { ...form.choices, [item.id]: o.text } })}
                  >
                    {o.label}
                  </Chip>
                ))}
                {item.id === "pain" && (form.choices.pain ?? "") !== "NEGA DOR" && (
                  <Input
                    className="h-7 w-20 text-xs"
                    inputMode="numeric"
                    placeholder="EVA 0-10"
                    value={form.painScore}
                    onChange={(e) => set({ painScore: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <Field label="Outras queixas / intercorrências">
            <Textarea rows={2} value={form.complaints} onChange={(e) => set({ complaints: e.target.value })} />
          </Field>
        </Section>

        <Section
          title="Exame físico e sinais vitais"
          navLabel="Exame físico"
          filled={!!(form.vitals.paSystolic || form.vitals.fc)}
          contentClassName="space-y-3"
        >
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {(
              [
                ["paSystolic", "PAS"],
                ["paDiastolic", "PAD"],
                ["fc", "FC"],
                ["fr", "FR"],
                ["tax", "TAX (°C)"],
                ["spo2", "SatO₂ (%)"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label}>
                <Input inputMode="decimal" value={form.vitals[k]} onChange={(e) => setVital(k, e.target.value)} />
              </Field>
            ))}
          </div>
          {alerts.length > 0 && (
            <div className="space-y-0.5 rounded-md bg-rose-50 px-3 py-2">
              {alerts.map((a) => (
                <p key={a.text} className="flex items-center gap-1.5 text-xs font-medium text-rose-800">
                  <AlertTriangle className="h-3.5 w-3.5" /> {a.text}
                </p>
              ))}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="w-14 text-xs font-semibold text-muted-foreground">ECOG</span>
            {Object.entries(ECOG_LABELS).map(([k, label]) => (
              <Chip key={k} active={form.ecog === k} onClick={() => set({ ecog: form.ecog === k ? "" : k })}>
                <span title={label}>{k}</span>
              </Chip>
            ))}
            {form.ecog && <span className="text-[11px] text-muted-foreground">{ECOG_LABELS[form.ecog]}</span>}
          </div>
          <ExamLine label="Geral" value={form.exam.general} onChange={(v) => setExam({ general: v })} />
          <ExamLine label="AR" value={form.exam.ar} onChange={(v) => setExam({ ar: v })} hint="+ FR e SatO₂" />
          <ExamLine label="ACV" value={form.exam.acv} onChange={(v) => setExam({ acv: v })} hint="+ PA e FC" />
          <ExamLine label="ABD" value={form.exam.abdomen} onChange={(v) => setExam({ abdomen: v })} />
          <ExamLine label="FO" value={form.exam.wound} onChange={(v) => setExam({ wound: v })}>
            <Chip
              active={form.exam.wound.startsWith("EM BOM ASPECTO")}
              onClick={() =>
                setExam({ wound: "EM BOM ASPECTO DE CICATRIZAÇÃO, SEM SINAIS FLOGÍSTICOS. SUTURA ÍNTEGRA. SEM SAÍDA DE SECREÇÕES" })
              }
            >
              Bom aspecto
            </Chip>
            <Chip
              active={form.exam.wound.includes("HIPEREMIA")}
              onClick={() => setExam({ wound: "COM HIPEREMIA PERIINCISIONAL, SUTURA ÍNTEGRA, SEM SAÍDA DE SECREÇÕES" })}
            >
              Hiperemia
            </Chip>
            <Chip active={form.exam.wound === ""} onClick={() => setExam({ wound: "" })}>
              Sem FO
            </Chip>
          </ExamLine>
          <ExamLine label="Gineco" value={form.exam.gyneco} onChange={(v) => setExam({ gyneco: v })} />
          <ExamLine label="Membros" value={form.exam.limbs} onChange={(v) => setExam({ limbs: v })} />
          <Field label="Dispositivos / débitos (um por linha)">
            <Textarea
              rows={2}
              placeholder={"ex.: DRENO DE BLAKE COM DÉBITO DE 50 ML SEROSSANGUINOLENTO\nSVD COM DIURESE CLARA"}
              value={form.devices}
              onChange={(e) => set({ devices: e.target.value })}
            />
          </Field>
        </Section>

        <Section
          title="Parâmetros e exames"
          navLabel="Parâmetros / labs"
          defaultOpen={false}
          filled={!!form.nursingParams || !!form.labs}
          contentClassName="space-y-3"
        >
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Parâmetros da enfermagem</span>
              <button
                type="button"
                onClick={() => set({ nursingParams: nursingParamsFrom(observations) })}
                className="-my-1.5 inline-flex min-h-8 items-center gap-1 py-1.5 text-xs text-primary hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Faixas das últimas 24 h
              </button>
            </div>
            <Input
              placeholder="PAS: / PAD: / FC: / TAX: ºC" aria-label="Parâmetros da enfermagem"
              value={form.nursingParams}
              onChange={(e) => set({ nursingParams: e.target.value })}
            />
          </div>
          <Field label="Exames laboratoriais">
            <Textarea rows={2} value={form.labs} onChange={(e) => set({ labs: e.target.value })} />
          </Field>
        </Section>

        <Section title="HD e plano" navLabel="HD / plano" filled={!!form.hdExtra.trim()} contentClassName="space-y-3">
          <Field label="Diagnósticos adicionais (um por linha)">
            <Textarea rows={2} value={form.hdExtra} onChange={(e) => set({ hdExtra: e.target.value })} />
          </Field>
          <div className="space-y-1">
            {ONCO_PLAN_ITEMS.map((p) => (
              <label key={p.id} className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-input"
                  checked={!!form.plan[p.id]}
                  onChange={(e) => set({ plan: { ...form.plan, [p.id]: e.target.checked } })}
                />
                <span className="text-xs">{p.text}</span>
              </label>
            ))}
          </div>
          <Textarea
            rows={2}
            placeholder="Outras orientações (uma por linha)" aria-label="Outras orientações"
            value={form.planExtra}
            onChange={(e) => set({ planExtra: e.target.value })}
          />
        </Section>

        <Section
          title="Conduta"
          navLabel="Conduta"
          filled={form.mode === "alta" || !!form.conduct.trim()}
          contentClassName="space-y-3"
        >
          <div className="flex flex-wrap items-end gap-3">
            <Field label="Discutida com">
              <Input
                className="w-56"
                placeholder="ex.: DR. FULANO"
                value={form.preceptor}
                onChange={(e) => set({ preceptor: e.target.value })}
              />
            </Field>
            <div className="flex gap-1.5">
              <Chip active={form.mode === "internacao"} onClick={() => set({ mode: "internacao" })}>
                Mantém internação
              </Chip>
              <Chip active={form.mode === "alta"} onClick={() => set({ mode: "alta" })}>
                Alta hospitalar
              </Chip>
            </div>
          </div>
          {form.mode === "internacao" ? (
            <Textarea
              rows={3}
              placeholder="Uma orientação por linha" aria-label="Orientações"
              value={form.conduct}
              onChange={(e) => set({ conduct: e.target.value })}
            />
          ) : (
            <div className="space-y-2">
              {ONCO_DISCHARGE_ITEMS.map((d) => (
                <label key={d.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-input"
                    checked={!!form.discharge[d.id]}
                    onChange={(e) => set({ discharge: { ...form.discharge, [d.id]: e.target.checked } })}
                  />
                  <span className="text-xs">{d.text}</span>
                </label>
              ))}
              <Textarea
                rows={2}
                placeholder="Outras orientações de alta (uma por linha)" aria-label="Outras orientações de alta"
                value={form.dischargeExtra}
                onChange={(e) => set({ dischargeExtra: e.target.value })}
              />
            </div>
          )}
        </Section>
      </div>

      <div className="lg:sticky lg:top-6 lg:h-fit">
        <JumpToOutput />
        <Card id="prontuario" className="scroll-mt-20">
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Microscope className="h-4 w-4 text-primary" /> Prontuário
            </CardTitle>
            <div className="grid grid-cols-2 gap-2">
              <Button type="button" onClick={() => save(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Salvar evolução
              </Button>
              <CopyButton text={text} className="h-9 px-4 text-sm" />
            </div>
            <div className="flex items-center justify-between gap-2 border-t pt-3">
              <Input
                className="h-8 text-xs"
                placeholder="Autor(a) da evolução" aria-label="Autor(a) da evolução"
                value={author}
                onChange={(e) => {
                  setAuthor(e.target.value);
                  try {
                    window.localStorage.setItem(EXAMINER_KEY, e.target.value);
                  } catch {
                    // sem localStorage
                  }
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={() => save(false)} disabled={saving}>
                Só salvar dados
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {msg && (
              <p
                className={`mb-2 flex items-center gap-1 rounded px-2 py-1 text-xs ${msg.ok ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}
              >
                {msg.ok && <Check className="h-3.5 w-3.5" />} {msg.text}
              </p>
            )}
            <pre className="prontuario-text max-h-[65vh] overflow-y-auto rounded-xl bg-slate-50 p-4 text-xs ring-1 ring-inset ring-border/60">{text}</pre>
          </CardContent>
        </Card>
      </div>
    </SectionNavProvider>
  );
}
