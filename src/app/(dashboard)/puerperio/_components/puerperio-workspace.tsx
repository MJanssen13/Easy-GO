"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, RefreshCw, Save, Stethoscope } from "lucide-react";
import type { Observation, Patient } from "@/core/patients/types";
import {
  DISCHARGE_ITEMS,
  EVOLUTION_ITEMS,
  PLAN_ITEMS,
  isVaginal,
  nextDayForm,
  type DeliveryInfo,
  type PuerperalEvolutionForm,
  type PuerperalExam,
  type PuerperioSummary,
  type WardHistory,
} from "@/core/puerperio/types";
import {
  draftContext,
  nursingParamsFrom,
  renderPuerperioEvolution,
} from "@/core/puerperio/render";
import { puerperioPendings } from "@/core/puerperio/checklist";
import { vitalAlerts } from "@/core/obstetric/alerts";
import { readShiftTeam } from "@/lib/shift-team";
import { Section, SectionIndex, SectionNavProvider } from "@/components/form-section";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";
import { saveWorkspace, type Basics } from "../actions";
import { Chip, DeliveryFields, Field } from "./delivery-fields";
import { HistoryFields } from "./history-fields";

const PRECEPTOR_KEY = "easygo.preceptor";
const EXAMINER_KEY = "easygo.lastExaminer";

function num(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v.replace(",", "."));
  return Number.isNaN(n) ? null : n;
}

export function PuerperioWorkspace({
  patient,
  summary,
  observations,
}: {
  patient: Patient;
  summary: PuerperioSummary;
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
  const [delivery, setDelivery] = useState<DeliveryInfo>(summary.delivery);
  const [history, setHistory] = useState<WardHistory>(summary.history);
  const [form, setForm] = useState<PuerperalEvolutionForm>(() => nextDayForm(summary.lastForm));
  const [author, setAuthor] = useState("");

  // Parâmetros da enfermagem (24 h), preceptor e examinador lembrados no aparelho.
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

  const set = (patch: Partial<PuerperalEvolutionForm>) => setForm((f) => ({ ...f, ...patch }));
  const setExam = (patch: Partial<PuerperalExam>) => setForm((f) => ({ ...f, exam: { ...f.exam, ...patch } }));
  const setVital = (k: keyof PuerperalEvolutionForm["vitals"], v: string) =>
    setForm((f) => ({ ...f, vitals: { ...f.vitals, [k]: v } }));

  const headerPatient = {
    ...patient,
    name: basics.name.toUpperCase(),
    medicalRecordNumber: basics.medicalRecordNumber,
    age: num(basics.age),
    parity: basics.parity,
    bloodType: basics.bloodType,
  };
  const text = useMemo(
    () => renderPuerperioEvolution(headerPatient, delivery, history, form),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basics, delivery, history, form, patient.riskFactors],
  );

  const alerts = vitalAlerts({
    paSystolic: num(form.vitals.paSystolic),
    paDiastolic: num(form.vitals.paDiastolic),
    fc: num(form.vitals.fc),
    tax: num(form.vitals.tax),
    spo2: num(form.vitals.spo2),
  });
  const pendings = puerperioPendings({ bloodType: basics.bloodType }, { ...summary, history });

  const via = isVaginal(delivery.type) ? "normal" : "cesarea";
  const dischargeItems = DISCHARGE_ITEMS.filter((d) => d.via === "ambas" || d.via === via);

  function save(evolve: boolean) {
    setMsg(null);
    try {
      if (form.preceptor.trim()) window.localStorage.setItem(PRECEPTOR_KEY, form.preceptor.trim());
    } catch {
      // sem localStorage
    }
    startSaving(async () => {
      const res = await saveWorkspace(patient.id, {
        basics,
        delivery,
        history,
        form,
        text,
        author,
        evolve,
      });
      if (res.error) setMsg({ ok: false, text: res.error });
      else {
        setMsg({ ok: true, text: evolve ? "Evolução salva no histórico." : "Dados salvos." });
        router.refresh();
      }
    });
  }

  const filledHistory = Object.values(history).some((v) => v.trim()) || !!basics.medicalRecordNumber;

  return (
    <SectionNavProvider className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <SectionIndex />

        {pendings.length > 0 && (
          <div className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5">
            {pendings.map((p) => (
              <p
                key={p.text}
                className={`flex items-center gap-2 text-sm ${p.level === "danger" ? "font-semibold text-rose-800" : "text-amber-800"}`}
              >
                <AlertTriangle className="h-4 w-4 shrink-0" /> {p.text}
              </p>
            ))}
          </div>
        )}

        <Section
          title="Paciente e antecedentes"
          navLabel="Antecedentes"
          defaultOpen={!filledHistory}
          filled={filledHistory}
          contentClassName="space-y-3"
        >
          <HistoryFields basics={basics} onBasics={setBasics} history={history} onHistory={setHistory} />
        </Section>

        <Section
          title="Parto e RN"
          navLabel="Parto / RN"
          defaultOpen={false}
          filled={!!delivery.newborn.weight || !!delivery.ga}
          contentClassName="space-y-3"
        >
          <DeliveryFields value={delivery} onChange={setDelivery} />
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Contexto da internação</Label>
              <button
                type="button"
                onClick={() => setHistory((h) => ({ ...h, context: draftContext(delivery) }))}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Regerar a partir do parto
              </button>
            </div>
            <Textarea
              rows={5}
              value={history.context}
              onChange={(e) => setHistory((h) => ({ ...h, context: e.target.value }))}
              placeholder="Toque na admissão, indução/condução, intercorrências…"
            />
            <p className="text-[11px] text-muted-foreground">
              Complete o toque na admissão, a indução e o acompanhante — o resto vem dos dados do parto.
            </p>
          </div>
        </Section>

        <Section title="Evolução (queixas)" navLabel="Evolução" filled={!!form.complaints.trim()} contentClassName="space-y-3">
          <div className="space-y-1.5">
            {EVOLUTION_ITEMS.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center gap-1.5">
                <span className="w-28 shrink-0 text-xs text-muted-foreground">{item.label}</span>
                {item.options.map((o) => (
                  <Chip
                    key={o.label}
                    active={(form.choices[item.id] ?? "") === o.text}
                    onClick={() => set({ choices: { ...form.choices, [item.id]: o.text } })}
                  >
                    {o.label}
                  </Chip>
                ))}
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {(
              [
                ["paSystolic", "PAS"],
                ["paDiastolic", "PAD"],
                ["fc", "FC"],
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
          <ExamLine label="Geral" value={form.exam.general} onChange={(v) => setExam({ general: v })} />
          <ExamLine label="AR" value={form.exam.ar} onChange={(v) => setExam({ ar: v })} hint="+ SatO₂" />
          <ExamLine label="ACV" value={form.exam.acv} onChange={(v) => setExam({ acv: v })} hint="+ PA e FC" />
          <ExamLine label="Mamas" value={form.exam.breasts} onChange={(v) => setExam({ breasts: v })}>
            <Chip
              active={form.exam.breasts.startsWith("SEM INGURGITAMENTO")}
              onClick={() =>
                setExam({ breasts: "SEM INGURGITAMENTO, SEM FISSURAS, SEM SINAIS FLOGÍSTICOS. EXPRESSÃO POSITIVA BILATERALMENTE" })
              }
            >
              Normal
            </Chip>
            <Chip
              active={form.exam.breasts.startsWith("INGURGITADAS")}
              onClick={() => setExam({ breasts: "INGURGITADAS, SEM FISSURAS. EXPRESSÃO POSITIVA BILATERALMENTE" })}
            >
              Ingurgitadas
            </Chip>
            <Chip
              active={form.exam.breasts.includes("FISSURA EM")}
              onClick={() =>
                setExam({ breasts: "SEM INGURGITAMENTO, FISSURA EM MAMILO ___, SEM SINAIS FLOGÍSTICOS. EXPRESSÃO POSITIVA BILATERALMENTE" })
              }
            >
              Fissura
            </Chip>
          </ExamLine>
          <div className="space-y-1.5 rounded-md border p-2">
            <ExamLine label="ABD" value={form.exam.abdomen} onChange={(v) => setExam({ abdomen: v })} />
            <div className="flex flex-wrap items-center gap-1.5 pl-0 sm:pl-16">
              <Chip active={form.exam.uterus === "contraido"} onClick={() => setExam({ uterus: "contraido" })}>
                Útero contraído
              </Chip>
              <Chip active={form.exam.uterus === "hipotonico"} onClick={() => setExam({ uterus: "hipotonico" })}>
                Hipotônico
              </Chip>
              <Input
                className="h-7 w-16 text-xs"
                inputMode="numeric"
                placeholder="cm"
                value={form.exam.fundusCm}
                onChange={(e) => setExam({ fundusCm: e.target.value })}
              />
              {(["abaixo", "cicatriz", "acima"] as const).map((f) => (
                <Chip key={f} active={form.exam.fundus === f} onClick={() => setExam({ fundus: f })}>
                  {f === "abaixo" ? "abaixo da CU" : f === "cicatriz" ? "na CU" : "acima da CU"}
                </Chip>
              ))}
            </div>
          </div>
          {delivery.type === "cesarea" && (
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
              <Chip
                active={form.exam.wound.includes("SAÍDA DE SECREÇÃO")}
                onClick={() => setExam({ wound: "COM SAÍDA DE SECREÇÃO ___ À EXPRESSÃO" })}
              >
                Secreção
              </Chip>
            </ExamLine>
          )}
          <div className="space-y-1.5 rounded-md border p-2">
            <ExamLine label="Gineco" value={form.exam.gyneco} onChange={(v) => setExam({ gyneco: v })} />
            <div className="flex flex-wrap items-center gap-1.5 sm:pl-16">
              <span className="text-xs text-muted-foreground">Loquiação</span>
              {(["rubra", "serossanguinolenta", "serosa", "alba"] as const).map((t) => (
                <Chip key={t} active={form.exam.lochiaType === t} onClick={() => setExam({ lochiaType: t })}>
                  {t}
                </Chip>
              ))}
              <span className="mx-1 text-muted-foreground">·</span>
              {(["pequena", "moderada", "grande"] as const).map((t) => (
                <Chip key={t} active={form.exam.lochiaAmount === t} onClick={() => setExam({ lochiaAmount: t })}>
                  {t}
                </Chip>
              ))}
            </div>
          </div>
          <ExamLine label="Membros" value={form.exam.limbs} onChange={(v) => setExam({ limbs: v })} />
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
              <Label className="text-xs">Parâmetros da enfermagem</Label>
              <button
                type="button"
                onClick={() => set({ nursingParams: nursingParamsFrom(observations) })}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <RefreshCw className="h-3 w-3" /> Faixas das últimas 24 h
              </button>
            </div>
            <Input
              placeholder="PAS: / PAD: / FC: / TAX: ºC"
              value={form.nursingParams}
              onChange={(e) => set({ nursingParams: e.target.value })}
            />
            <p className="text-[11px] text-muted-foreground">
              &quot;Parâmetros da equipe de GO&quot; saem dos sinais vitais do exame físico.
            </p>
          </div>
          <Field label="Exames laboratoriais">
            <Textarea rows={2} value={form.labs} onChange={(e) => set({ labs: e.target.value })} />
          </Field>
        </Section>

        <Section title="HD e orientações" navLabel="HD / plano" filled={!!form.hdExtra.trim()} contentClassName="space-y-3">
          <Field label="Diagnósticos adicionais (um por linha)">
            <Textarea
              rows={2}
              value={form.hdExtra}
              onChange={(e) => set({ hdExtra: e.target.value })}
              placeholder={(patient.riskFactors ?? []).join("\n") || "ex.: DMG A1"}
            />
          </Field>
          <div className="space-y-1">
            {PLAN_ITEMS.map((p) => (
              <label key={p.id} className="flex items-start gap-2 text-sm">
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
          {form.plan.contracepcao && (
            <Input
              placeholder="Complemento: ex.: PACIENTE INFORMA QUE IRÁ DECIDIR QUANTO AO MÉTODO"
              value={form.contraceptionNote}
              onChange={(e) => set({ contraceptionNote: e.target.value })}
            />
          )}
          <Textarea
            rows={2}
            placeholder="Outras orientações (uma por linha)"
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
                placeholder="ex.: DRA FÁRIDA"
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
              placeholder="Uma orientação por linha"
              value={form.conduct}
              onChange={(e) => set({ conduct: e.target.value })}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Modelo de alta — {via === "normal" ? "parto normal" : "cesárea"}. Desmarque o que não se aplica.
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Input placeholder="Método (ex.: IMPLANON)" value={form.method} onChange={(e) => set({ method: e.target.value })} />
                <Input placeholder="ACO (ex.: DESOGESTREL)" value={form.aco} onChange={(e) => set({ aco: e.target.value })} />
                <Input placeholder="Ferro (dose)" value={form.iron} onChange={(e) => set({ iron: e.target.value })} />
              </div>
              <div className="space-y-1">
                {dischargeItems.map((d) => (
                  <label key={d.id} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 rounded border-input"
                      checked={!!form.discharge[d.id]}
                      onChange={(e) => set({ discharge: { ...form.discharge, [d.id]: e.target.checked } })}
                    />
                    <span className="text-xs">
                      {d.text
                        .replace("({METODO})", form.method ? `(${form.method.toUpperCase()})` : "(—)")
                        .replace("({ACO})", form.aco ? `(${form.aco.toUpperCase()})` : "(—)")
                        .replace("({FERRO})", form.iron ? `(${form.iron.toUpperCase()})` : "")}
                    </span>
                  </label>
                ))}
              </div>
              <Textarea
                rows={2}
                placeholder="Outras orientações de alta (uma por linha)"
                value={form.dischargeExtra}
                onChange={(e) => set({ dischargeExtra: e.target.value })}
              />
            </div>
          )}
        </Section>
      </div>

      {/* ----- Prontuário ----- */}
      <div className="lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardHeader className="space-y-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="h-4 w-4 text-primary" /> Prontuário
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
                placeholder="Autor(a) da evolução"
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
            <pre className="prontuario-text max-h-[65vh] overflow-y-auto text-xs">{text}</pre>
          </CardContent>
        </Card>
      </div>
    </SectionNavProvider>
  );
}

function ExamLine({
  label,
  value,
  onChange,
  hint,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
        <span className="w-14 shrink-0 text-xs font-semibold text-muted-foreground">{label}</span>
        <Input className="h-8 text-xs" value={value} onChange={(e) => onChange(e.target.value)} />
        {hint && <span className="shrink-0 text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children && <div className="flex flex-wrap gap-1.5 sm:pl-16">{children}</div>}
    </div>
  );
}
