"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Siren, Info, ChevronDown, FlaskConical, ExternalLink, Printer } from "lucide-react";
import {
  emptyPsgoForm,
  HABITS,
  COMPANION_RELATIONS,
  type PsgoForm,
  type CoombsEntry,
} from "@/core/psgo/types";
import { renderPsgo, computePsgo, psgoHd } from "@/core/psgo/render";
import { renderCtgLaudoHtml, letterheadFor } from "@/core/ctg/laudo";
import { printHtml } from "@/lib/print";
import { datingDisplay } from "@/core/psgo/dating";
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
import { psgoCtgScore, psgoCtgConclusion, emptyPsgoCtg, type PsgoCtg } from "@/core/psgo/ctg";
import {
  HPMA_TEMPLATES,
  REVISION_QUESTIONS,
  assembleHpma,
  type HpmaNode,
  type RevSub,
  type ArrivalMode,
} from "@/core/psgo/hpma";
import { savePsgoAdmission } from "../actions";
import {
  PRIOR_TYPE_LABELS,
  NO_COMPLICATIONS_LABEL,
  formatParity,
  canMarkNoComplications,
  requiredNotePrompt,
  type PriorPregnancyType,
} from "@/core/psgo/parity";
import { COMMON_COMORBIDITIES, classifyBmi } from "@/core/psgo/comorbidities";
import { COMMON_MEDICATIONS } from "@/core/psgo/medications";
import { EXAM_SYSTEMS, buildNormalLine } from "@/core/psgo/exam";
import { SEROLOGY_ANALYTES, VDRL_TITERS } from "@/core/psgo/serology";
import { renderImagingExam, examCpr, examCentiles, type ImagingExam } from "@/core/psgo/imaging";
import { parseDecimal } from "@/lib/num";
import { readShiftTeam, formatShiftTeamBlock, formatShiftTeamInline, EMPTY_TEAM } from "@/lib/shift-team";
import type { TeamInput } from "@/core/prontuario/preparto-evolution";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/copy-button";

// Largura padronizada das listas suspensas (~ tamanho de um campo de data).
const selectClass =
  "flex h-9 w-full max-w-[11rem] rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const CTG_CONCLUSIONS = [
  "Feto ativo",
  "Feto hipoativo",
  "Feto inativo",
  "Reativo",
  "Hiporreativo",
  "Não reativo",
  "Bifásico",
];

function uid(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/** Data ISO → DD/MM/AAAA (para o cabeçalho do laudo). */
function formatDateBR(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("pt-BR");
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
    <div className="inline-flex w-full overflow-hidden rounded-full border bg-background text-xs font-medium">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 whitespace-nowrap px-3 py-1.5 text-center transition-colors ${i > 0 ? "border-l" : ""} ${
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

/** Textarea cuja altura acompanha o conteúdo (sem barra de rolagem interna). */
function AutoGrowTextarea({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <Textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`resize-none overflow-hidden ${className ?? ""}`}
    />
  );
}

/** Card de seção colapsável. `headerExtra` recebe ações/badges (fora do toggle). */
function Section({
  title,
  children,
  headerExtra,
  defaultOpen = true,
  id,
  contentClassName,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
  headerExtra?: React.ReactNode;
  defaultOpen?: boolean;
  id?: string;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card id={id}>
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
      {open && <div className={`px-6 pb-6 ${contentClassName ?? ""}`}>{children}</div>}
    </Card>
  );
}

/** Rola a página até o quadro de exames de imagem (USG). */
function scrollToUsg() {
  document.getElementById("psgo-usg")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Botão para abrir o LabFlow (laboratório) em nova aba — teal da marca LabFlow. */
function LabflowButton() {
  return (
    <a
      href="https://labflowai.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl bg-[#039a8a] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#0a7b71] active:scale-[0.98]"
    >
      <FlaskConical className="h-4 w-4" />
      Acessar LabFlow
      <ExternalLink className="h-3.5 w-3.5 opacity-80" />
    </a>
  );
}

export function PsgoGenerator({
  initialForm,
  patientId,
  today,
}: {
  initialForm?: PsgoForm;
  patientId?: string;
  /** Data de hoje (ISO) calculada no servidor — evita mismatch de hidratação. */
  today?: string;
} = {}) {
  const router = useRouter();
  const [form, setForm] = useState<PsgoForm>(() => initialForm ?? emptyPsgoForm(today));
  const [saving, startSaving] = useTransition();
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [medInput, setMedInput] = useState("");
  // Montador de HPMA (estado transitório; só o texto final vai para form.hpma)
  const [hpmaSel, setHpmaSel] = useState<string[]>([]);
  const [hpmaVals, setHpmaVals] = useState<Record<string, string>>({});
  const [hpmaArrival, setHpmaArrival] = useState<ArrivalMode>("espontanea");
  const [hpmaFrom, setHpmaFrom] = useState("");
  const [hpmaReferrer, setHpmaReferrer] = useState("");
  const [hpmaReason, setHpmaReason] = useState("");

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

  // Equipe de plantão compartilhada (definida na página inicial) — vai ao final.
  const [shiftTeam, setShiftTeam] = useState<TeamInput>(EMPTY_TEAM);
  useEffect(() => setShiftTeam(readShiftTeam()), []);

  const text = useMemo(() => {
    const base = renderPsgo(form);
    const team = formatShiftTeamBlock(shiftTeam);
    return team ? `${base}\n\n${team.toUpperCase()}` : base;
  }, [form, shiftTeam]);
  const hpmaPreview = useMemo(
    () =>
      assembleHpma({
        selectedIds: hpmaSel,
        vals: hpmaVals,
        pregnant: form.pregnant,
        arrival: {
          mode: hpmaArrival,
          from: hpmaFrom,
          referrer: hpmaReferrer,
          reason: hpmaReason,
          hasCompanion: !!form.companion.trim(),
          companion: form.companion,
          companionRelation:
            form.companionRelation === "OUTRO"
              ? form.companionRelationOther
              : form.companionRelation,
        },
      }),
    [
      hpmaSel,
      hpmaVals,
      hpmaArrival,
      hpmaFrom,
      hpmaReferrer,
      hpmaReason,
      form.pregnant,
      form.companion,
      form.companionRelation,
      form.companionRelationOther,
    ],
  );
  const hpmaCovered = useMemo(() => {
    const s = new Set<string>();
    for (const t of HPMA_TEMPLATES) {
      if (hpmaSel.includes(t.id)) for (const c of t.covers ?? []) s.add(c);
    }
    return s;
  }, [hpmaSel]);
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
  const bmi = classifyBmi(parseDecimal(form.weight), parseDecimal(form.height));

  function toggleArray(key: "comorbidities" | "habits", value: string) {
    setForm((f) => {
      const arr = f[key];
      return { ...f, [key]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value] };
    });
  }

  // Hábitos: "NEGA" é exclusivo dos demais (que podem ser cumulativos).
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

  // Coombs indireto (lista)
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
  function toggleGyneco(key: string) {
    setGynecoValue(key, form.gyneco.values[key] === "1" ? "" : "1");
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
  function addCtg() {
    update({ ctgLaudos: [...form.ctgLaudos, { ...emptyPsgoCtg(), id: uid() }] });
  }
  function updateCtgAt(id: string, patch: Partial<PsgoCtg>) {
    update({ ctgLaudos: form.ctgLaudos.map((c) => (c.id === id ? { ...c, ...patch } : c)) });
  }
  function removeCtg(id: string) {
    update({ ctgLaudos: form.ctgLaudos.filter((c) => c.id !== id) });
  }
  // Gera e imprime o laudo da CTG no modelo em papel timbrado do HC-UFTM.
  function printCtgLaudo(c: PsgoCtg) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const html = renderCtgLaudoHtml(
      {
        name: form.socialName.trim() ? `${form.name} (${form.socialName})` : form.name,
        rg: form.rg,
        date: formatDateBR(form.date),
        time: c.time,
        hd: psgoHd(form),
        baseline: c.baseline,
        variability: c.variability,
        accelerations: c.accelerations,
        atMfRatio: c.atMfRatio,
        movements: c.movements,
        decelerations: c.decelerations,
        decelerationType: c.decelerationType,
        decelerationCount: c.decelerationCount,
        contractions: c.contractions,
        soundStimulus: c.soundStimulus,
        stimulusCount: c.stimulusCount,
        mechanicalStimulus: c.mechanicalStimulus,
        mechanicalStimulusCount: c.mechanicalStimulusCount,
        conclusion: c.conclusion,
        notes: c.notes,
        cd: c.cd,
        equipe: formatShiftTeamInline(shiftTeam),
      },
      letterheadFor(origin),
    );
    printHtml(html);
  }
  // Montador de HPMA
  function toggleHpmaQp(id: string) {
    setHpmaSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function setHpmaVal(key: string, value: string) {
    setHpmaVals((v) => ({ ...v, [key]: value }));
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
  // Linha de chips de seleção única (especular).
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
  // Botões de teste (Não realizado / Positivo / Negativo).
  const gyTestToggle = (label: string, fieldId: string) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-24 text-xs text-muted-foreground">{label}</span>
      {TEST_OPTIONS.map((t) => (
        <Chip
          key={t}
          active={form.gyneco.values[fieldId] === t}
          onClick={() => setGynecoValue(fieldId, t)}
        >
          {t}
        </Chip>
      ))}
    </div>
  );
  // Chip inline pequeno (para o montador de HPMA).
  const hpmaChipCls = (active: boolean) =>
    `rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
      active
        ? "border-primary bg-primary text-primary-foreground"
        : "bg-background text-muted-foreground hover:bg-muted"
    }`;
  const hpmaInputCls =
    "mx-0.5 inline-block h-6 w-14 rounded border border-input bg-background px-1 align-middle text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring";

  // Renderiza os nós de um modelo de HPMA (texto, campo, escolha, multi).
  const renderNodes = (nodes: HpmaNode[], prefix: string): React.ReactNode =>
    nodes.map((n, k) => {
      if (n.k === "t") return <span key={k}>{n.v}</span>;
      if (n.k === "cond") {
        return hpmaVals[`${prefix}.${n.ref}`] === n.eq ? (
          <span key={k}>{renderNodes(n.nodes, prefix)}</span>
        ) : null;
      }
      if (n.k === "blank") {
        const key = `${prefix}.${n.id}`;
        return (
          <input
            key={k}
            value={hpmaVals[key] ?? ""}
            onChange={(e) => setHpmaVal(key, e.target.value)}
            className={hpmaInputCls}
          />
        );
      }
      if (n.k === "single") {
        const key = `${prefix}.${n.id}`;
        const cur = hpmaVals[key];
        const selOpt = n.opts.find((x) => x.label === cur);
        return (
          <span key={k} className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-middle">
            {n.opts.map((op) => (
              <button
                key={op.label}
                type="button"
                onClick={() => setHpmaVal(key, cur === op.label ? "" : op.label)}
                className={hpmaChipCls(cur === op.label)}
              >
                {op.label}
              </button>
            ))}
            {selOpt?.reveal && renderNodes(selOpt.reveal, prefix)}
          </span>
        );
      }
      // multi
      const base = `${prefix}.${n.id}`;
      return (
        <span key={k} className="mx-0.5 inline-flex flex-wrap items-center gap-1 align-middle">
          {n.opts.map((op) => {
            const key = `${base}#${op.label}`;
            const on = hpmaVals[key] === "1";
            return (
              <button
                key={op.label}
                type="button"
                onClick={() => setHpmaVal(key, on ? "" : "1")}
                className={hpmaChipCls(on)}
              >
                {op.label}
              </button>
            );
          })}
        </span>
      );
    });

  // Renderiza um modelo de HPMA como formulário (campos rotulados, em grade).
  const hpmaFormFields = (nodes: HpmaNode[], prefix: string): React.ReactNode[] => {
    const items: React.ReactNode[] = [];
    for (const n of nodes) {
      if (n.k === "t") continue;
      if (n.k === "cond") {
        if (hpmaVals[`${prefix}.${n.ref}`] === n.eq) items.push(...hpmaFormFields(n.nodes, prefix));
        continue;
      }
      if (n.k === "blank") {
        const key = `${prefix}.${n.id}`;
        items.push(
          <Field key={key} label={n.q ?? n.id}>
            <Input
              className={n.wide ? undefined : "w-24"}
              value={hpmaVals[key] ?? ""}
              onChange={(e) => setHpmaVal(key, e.target.value)}
            />
          </Field>,
        );
        continue;
      }
      if (n.k === "single") {
        const key = `${prefix}.${n.id}`;
        const cur = hpmaVals[key];
        const selOpt = n.opts.find((x) => x.label === cur);
        items.push(
          <Field key={key} label={n.q ?? n.id}>
            <div className="flex flex-wrap gap-1.5">
              {n.opts.map((op) => (
                <Chip
                  key={op.label}
                  active={cur === op.label}
                  onClick={() => setHpmaVal(key, cur === op.label ? "" : op.label)}
                >
                  {op.label}
                </Chip>
              ))}
            </div>
          </Field>,
        );
        if (selOpt?.reveal) items.push(...hpmaFormFields(selOpt.reveal, prefix));
        continue;
      }
      // multi
      const base = `${prefix}.${n.id}`;
      items.push(
        <Field key={base} label={n.q ?? n.id}>
          <div className="flex flex-wrap gap-1.5">
            {n.opts.map((op) => {
              const key = `${base}#${op.label}`;
              const on = hpmaVals[key] === "1";
              return (
                <Chip key={op.label} active={on} onClick={() => setHpmaVal(key, on ? "" : "1")}>
                  {op.label}
                </Chip>
              );
            })}
          </div>
        </Field>,
      );
    }
    return items;
  };

  // Sub-campo de uma pergunta da revisão dirigida.
  const renderRevSub = (qid: string, sub: RevSub) => {
    const base = `rev.${qid}.${sub.id}`;
    if (sub.kind === "blank") {
      return (
        <span key={sub.id} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          {sub.label}
          <input
            value={hpmaVals[base] ?? ""}
            onChange={(e) => setHpmaVal(base, e.target.value)}
            className={hpmaInputCls}
          />
        </span>
      );
    }
    return (
      <span key={sub.id} className="inline-flex flex-wrap items-center gap-1">
        <span className="text-xs text-muted-foreground">{sub.label}:</span>
        {(sub.opts ?? []).map((op) => {
          const key = sub.kind === "multi" ? `${base}#${op}` : base;
          const active = sub.kind === "multi" ? hpmaVals[key] === "1" : hpmaVals[key] === op;
          return (
            <button
              key={op}
              type="button"
              onClick={() =>
                setHpmaVal(key, sub.kind === "multi" ? (active ? "" : "1") : active ? "" : op)
              }
              className={hpmaChipCls(active)}
            >
              {op}
            </button>
          );
        })}
      </span>
    );
  };

  // Formulário de uma CTG (a admissão pode ter várias).
  const renderCtgCard = (c: PsgoCtg, idx: number) => {
    const set = (patch: Partial<PsgoCtg>) => updateCtgAt(c.id, patch);
    return (
      <div key={c.id} className="space-y-3 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">CTG {idx + 1}</p>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Horário</Label>
            <Input type="time" className="h-8 w-28" value={c.time} onChange={(e) => set({ time: e.target.value })} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => printCtgLaudo(c)}
              title="Imprimir laudo no modelo do HC-UFTM"
            >
              <Printer className="h-4 w-4" /> Imprimir laudo
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => removeCtg(c.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Linha de base (bpm)">
            <Input inputMode="numeric" value={c.baseline} onChange={(e) => set({ baseline: e.target.value })} />
          </Field>
          <Field label="Variabilidade">
            <select
              className={selectClass}
              value={c.variability}
              onChange={(e) => set({ variability: e.target.value as PsgoCtg["variability"] })}
            >
              <option value="absent">Ausente (0)</option>
              <option value="lt5">&lt; 5 (0)</option>
              <option value="6-25">6-25 (1)</option>
              <option value="gt25">&gt; 25 (0)</option>
              <option value="sinusoidal">Sinusoidal (0)</option>
            </select>
          </Field>
          <Field label="Acelerações (AT)">
            <select
              className={selectClass}
              value={c.accelerations}
              onChange={(e) => set({ accelerations: e.target.value as PsgoCtg["accelerations"] })}
            >
              <option value="present">Presentes</option>
              <option value="absent">Ausentes</option>
            </select>
          </Field>
          <Field label="Relação AT/MF">
            <select
              className={selectClass}
              value={c.atMfRatio}
              onChange={(e) => set({ atMfRatio: e.target.value as PsgoCtg["atMfRatio"] })}
            >
              <option value="lt60">&lt; 60% (0)</option>
              <option value="gte60">&gt; 60% ou 2 AT/20min (2)</option>
            </select>
          </Field>
          <Field label="Movimentação fetal">
            <select
              className={selectClass}
              value={c.movements}
              onChange={(e) => set({ movements: e.target.value as PsgoCtg["movements"] })}
            >
              <option value="present">Presentes</option>
              <option value="absent">Ausentes</option>
            </select>
          </Field>
          <Field label="Desacelerações">
            <select
              className={selectClass}
              value={c.decelerations}
              onChange={(e) => set({ decelerations: e.target.value as PsgoCtg["decelerations"] })}
            >
              <option value="absent">Ausentes (1)</option>
              <option value="present">Presentes (0)</option>
            </select>
          </Field>
        </div>
        {c.decelerations === "present" && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo de desaceleração">
              <select
                className={selectClass}
                value={c.decelerationType}
                onChange={(e) => set({ decelerationType: e.target.value as PsgoCtg["decelerationType"] })}
              >
                <option value="">—</option>
                <option value="early">Precoce</option>
                <option value="late">Tardia</option>
                <option value="variable">Variável</option>
              </select>
            </Field>
            <Field label="Número">
              <Input value={c.decelerationCount} onChange={(e) => set({ decelerationCount: e.target.value })} />
            </Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Contrações">
            <select
              className={selectClass}
              value={c.contractions}
              onChange={(e) => set({ contractions: e.target.value as PsgoCtg["contractions"] })}
            >
              <option value="absent">Ausentes</option>
              <option value="present">Presentes</option>
            </select>
          </Field>
          <Field label="Estímulo sonoro">
            <select
              className={selectClass}
              value={c.soundStimulus}
              onChange={(e) => set({ soundStimulus: e.target.value as PsgoCtg["soundStimulus"] })}
            >
              <option value="not_done">Não realizado</option>
              <option value="done">Realizado</option>
            </select>
          </Field>
          {c.soundStimulus === "done" && (
            <Field label="Nº de estímulos">
              <Input value={c.stimulusCount} onChange={(e) => set({ stimulusCount: e.target.value })} />
            </Field>
          )}
          <Field label="Estímulo mecânico">
            <select
              className={selectClass}
              value={c.mechanicalStimulus}
              onChange={(e) => set({ mechanicalStimulus: e.target.value as PsgoCtg["mechanicalStimulus"] })}
            >
              <option value="not_done">Não realizado</option>
              <option value="done">Realizado</option>
            </select>
          </Field>
          {c.mechanicalStimulus === "done" && (
            <Field label="Nº de estímulos">
              <Input
                value={c.mechanicalStimulusCount}
                onChange={(e) => set({ mechanicalStimulusCount: e.target.value })}
              />
            </Field>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-2">
          <span className="text-sm">
            Pontuação: <strong className="text-primary">{psgoCtgScore(c)}/5</strong>
          </span>
          <div className="flex items-center gap-2">
            <Label className="text-xs">Conclusão</Label>
            <select
              className={`${selectClass} h-8 w-44 font-semibold`}
              value={psgoCtgConclusion(c)}
              onChange={(e) => set({ conclusion: e.target.value })}
            >
              {CTG_CONCLUSIONS.map((cc) => (
                <option key={cc} value={cc}>
                  {cc}
                </option>
              ))}
            </select>
          </div>
        </div>
        <Field label="Observações">
          <Textarea rows={2} value={c.notes} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
        <Field label="Conduta (CD)">
          <Textarea
            rows={2}
            value={c.cd}
            onChange={(e) => set({ cd: e.target.value })}
            placeholder="Preenche o 'QUE ORIENTA:' no laudo; em branco = vazio na exportação"
          />
        </Field>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* ----- Formulário (2/3) ----- */}
      <div className="space-y-4 lg:col-span-2">
        {/* Identificação (toggle gestante/não gestante no cabeçalho, à direita) */}
        <Section
          title="Identificação"
          contentClassName="space-y-3"
          headerExtra={
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
          }
        >
            {/* Data · Idade · RG */}
            <div className="flex flex-wrap gap-3">
              <Field label="Data da consulta" className="w-44">
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
        </Section>

        {/* Paridade */}
        <Section
          title="Paridade"
          contentClassName="space-y-3"
          headerExtra={
            <>
              <InfoTip title="Como codificar a paridade">
                  <p>
                    <strong>G</strong> = gestações (soma a atual se gestante).{" "}
                    <strong>P</strong> = partos: <strong>N</strong> normal, <strong>C</strong> cesárea,{" "}
                    <strong>F</strong> fórceps. <strong>A</strong> = abortos (ectópicas contam como
                    aborto, aninhadas: <strong>A2(E1)</strong>).
                  </p>
                  <p>Abortos não entram em P. Ex.: <strong>G5P3(N1C2A1)</strong>.</p>
                  <p>Modelo em calibração — validar com a equipe.</p>
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
                        // "sem intercorrências" só p/ parto normal e cesárea.
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

        {/* Datação + dados do Robson (não gestante: apenas a DUM) */}
        <Section
          title={form.pregnant ? "Datação e dados obstétricos" : "DUM"}
          contentClassName="space-y-3"
        >
            {/* DUM · DUM incerta · datação na mesma linha */}
            <div className="flex flex-wrap items-end gap-3">
              <Field label="DUM" className="w-40">
                <Input type="date" value={form.lmp} onChange={(e) => update({ lmp: e.target.value })} />
              </Field>
              {form.pregnant && (
                <label className="flex items-center gap-2 whitespace-nowrap pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.lmpUncertain}
                    onChange={(e) => update({ lmpUncertain: e.target.checked })}
                    className="h-4 w-4 rounded border-input"
                  />
                  DUM incerta
                </label>
              )}
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
                <button
                  type="button"
                  onClick={scrollToUsg}
                  className="mt-2 text-[11px] font-medium text-primary hover:underline"
                >
                  ir aos USGs ↓
                </button>
              </div>
            </div>

            {/* Nº de fetos · Apresentação · Início do TP na mesma linha */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                <Label className="text-xs">Início do TP (Atual ou predição)</Label>
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
        </Section>

        {/* Tipo sanguíneo / Coombs */}
        <Section
          title="Tipo sanguíneo e Coombs"
          contentClassName="space-y-3"
          headerExtra={
            <Button type="button" size="sm" variant="outline" onClick={addCoombs}>
              <Plus className="h-4 w-4" /> CI
            </Button>
          }
        >
            <Field label="Tipo sanguíneo" className="w-40">
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
                        value={c.result as "neg" | "pos"}
                        onChange={(v) => updateCoombs(c.id, { result: v })}
                        options={[
                          { value: "neg", label: "Negativo" },
                          { value: "pos", label: "Positivo" },
                        ]}
                      />
                    </div>
                    <Input
                      type="date"
                      className="h-8 w-40"
                      value={c.date}
                      onChange={(e) => updateCoombs(c.id, { date: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCoombs(c.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
        </Section>

        {/* Comorbidades */}
        <Section title="Comorbidades (CMB)" contentClassName="space-y-2">
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
        </Section>

        {/* Medicamentos */}
        <Section title="Medicamentos (MEU / fez uso)" contentClassName="space-y-2">
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
              ))
            )}
        </Section>

        {/* Cirurgias / alergias / hábitos */}
        <Section title="Cirurgias, alergias e hábitos" contentClassName="space-y-3">
            <Field label="Cirurgias prévias">
              <Input value={form.surgeries} onChange={(e) => update({ surgeries: e.target.value })} />
            </Field>
            <Field label="Alergias">
              <Input value={form.allergies} onChange={(e) => update({ allergies: e.target.value })} />
            </Field>
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

        {/* Sorologias */}
        <Section
          title="Sorologias"
          contentClassName="space-y-3"
          headerExtra={
            <Button type="button" size="sm" variant="outline" onClick={addSerologyColumn}>
              <Plus className="h-4 w-4" /> Coleta externa
            </Button>
          }
        >
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">Colar sorologias do hospital</Label>
                <LabflowButton />
              </div>
              <Textarea
                rows={3}
                placeholder="-(dd/mm/aaaa): TOXO SUSCETÍVEL / HBSAG NR / ..."
                value={form.serologyPasted}
                onChange={(e) => update({ serologyPasted: e.target.value })}
              />
            </div>

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
                                <select
                                  className={`${selectClass} h-7 w-32 px-2 text-xs`}
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
                                  <Chip
                                    key={o.v || "nd"}
                                    active={val === o.v}
                                    onClick={() => setSerologyValue(a, c.id, o.v)}
                                  >
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
        </Section>

        {/* QP / HPMA */}
        <Section title="Queixa e história" contentClassName="space-y-3">
            <Field label="Queixa principal (QP)">
              <Input value={form.qp} onChange={(e) => update({ qp: e.target.value })} />
            </Field>

            {/* Montador de HPMA padronizada */}
            <div className="space-y-3 rounded-md border p-3">
              {/* Chegada da paciente */}
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">Chegada</Label>
                  <Segmented
                    value={hpmaArrival}
                    onChange={setHpmaArrival}
                    options={[
                      { value: "espontanea", label: "Demanda espontânea" },
                      { value: "ambulancia", label: "Ambulância" },
                      { value: "carta", label: "Encaminhamento com carta" },
                    ]}
                  />
                </div>
                {hpmaArrival === "ambulancia" && (
                  <Field label="Ambulância — de onde?" className="max-w-md">
                    <Input value={hpmaFrom} onChange={(e) => setHpmaFrom(e.target.value)} />
                  </Field>
                )}
                {hpmaArrival === "carta" && (
                  <div className="flex flex-wrap items-end gap-3">
                    <Field label="Quem encaminhou?" className="min-w-[10rem] flex-1">
                      <Input value={hpmaReferrer} onChange={(e) => setHpmaReferrer(e.target.value)} />
                    </Field>
                    <Field label="Motivo do encaminhamento" className="min-w-[10rem] flex-1">
                      <Input value={hpmaReason} onChange={(e) => setHpmaReason(e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold">Gerador de HPMA</p>
                <p className="text-xs text-muted-foreground">
                  Possível selecionar vários.
                  <br />
                  É possível escrever/editar manualmente em HPMA (edição final).
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {HPMA_TEMPLATES.filter((t) => form.pregnant || !t.gestanteOnly).map((t) => (
                  <Chip key={t.id} active={hpmaSel.includes(t.id)} onClick={() => toggleHpmaQp(t.id)}>
                    {t.label}
                  </Chip>
                ))}
              </div>

              {hpmaSel.length > 0 && (
                <div className="space-y-2">
                  {HPMA_TEMPLATES.filter((t) => hpmaSel.includes(t.id)).map((tpl, i) => (
                    <div key={tpl.id} className="space-y-1 rounded-md border p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-primary">
                          {i === 0 ? "Refere" : "Relata ainda"}: {tpl.label}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleHpmaQp(tpl.id)}
                          className="text-xs text-destructive hover:underline"
                        >
                          remover
                        </button>
                      </div>
                      {tpl.mode === "form" ? (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          {hpmaFormFields(tpl.nodes, tpl.id)}
                        </div>
                      ) : (
                        <div className="text-sm leading-8">{renderNodes(tpl.nodes, tpl.id)}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Revisão dirigida (perguntas obrigatórias; omite as cobertas pela QP) */}
              <div className="space-y-1.5 border-t pt-2">
                <p className="text-xs font-semibold text-muted-foreground">
                  Revisão dirigida (sempre respondida)
                </p>
                {REVISION_QUESTIONS.filter(
                  (q) => (form.pregnant || !q.gestanteOnly) && !hpmaCovered.has(q.id),
                ).map((q) => {
                  const key = `rev.${q.id}`;
                  const cur = hpmaVals[key] ?? q.options[0].value;
                  const curOpt = q.options.find((op) => op.value === cur);
                  return (
                    <div key={q.id} className="space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="w-36 text-xs text-muted-foreground">{q.label}</span>
                        {q.options.map((op) => (
                          <Chip
                            key={op.value}
                            active={cur === op.value}
                            onClick={() => setHpmaVal(key, op.value)}
                          >
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

              {/* Prévia + inserir na HPMA */}
              <div className="space-y-1 border-t pt-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-muted-foreground">Prévia</span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => hpmaPreview.trim() && update({ hpma: hpmaPreview })}
                    disabled={!hpmaPreview.trim()}
                  >
                    Usar no HPMA ↓
                  </Button>
                </div>
                <p className="prontuario-text rounded bg-muted/40 px-2 py-1 text-[11px] text-justify">
                  {hpmaPreview || "Selecione uma QP/HD e responda a revisão dirigida."}
                </p>
              </div>
            </div>

            <Field label="HPMA (edição final)">
              <AutoGrowTextarea
                value={form.hpma}
                onChange={(v) => update({ hpma: v })}
                className="text-justify"
              />
            </Field>
        </Section>

        {/* Exame físico */}
        <Section title="Exame físico" contentClassName="space-y-3">
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
                                // Ao alterar, mantém o exame padrão na caixa para edição.
                                ...(v === "altered" && !st.text.trim()
                                  ? { text: buildNormalLine(s.id, form.vitals) }
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
                      placeholder={buildNormalLine(s.id, form.vitals)}
                      onChange={(e) => update({ exam: { ...form.exam, [s.id]: { ...st, text: e.target.value } } })}
                    />
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">{buildNormalLine(s.id, form.vitals)}</p>
                  )}
                </div>
              );
            })}
        </Section>

        {/* Exame ginecológico e obstétrico */}
        <Section
          title={form.pregnant ? "Exame ginecológico e obstétrico" : "Exame ginecológico"}
          contentClassName="space-y-4"
        >
            {/* Abdome */}
            <div className="space-y-2">
              <p className="text-sm font-semibold">{form.pregnant ? "Abdome (gravídico)" : "Abdome"}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {abdFieldsFor(form.pregnant).map(gyField)}
              </div>
              {form.pregnant && form.gyneco.values["abdDu"] === "Presente" && (
                <Field label="Dinâmica uterina (descrição)" className="max-w-md">
                  <Input
                    value={form.gyneco.values[ABD_DU_DETALHE_KEY] ?? ""}
                    onChange={(e) => setGynecoValue(ABD_DU_DETALHE_KEY, e.target.value)}
                    placeholder="ex.: 2 em 10 minutos"
                  />
                </Field>
              )}
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
                  <p className="text-xs text-muted-foreground">
                    Toque realizado é sempre autorizado pela paciente.
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {toqueFieldsFor(form.pregnant).map(gyField)}
                  </div>
                  {/* Dor ao toque (multi; "Indolor" exclusivo) */}
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Dor ao toque (pode marcar mais de um)
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {TOQUE_DOR_OPTIONS.map((op) => (
                        <Chip
                          key={op.key}
                          active={form.gyneco.values[op.key] === "1"}
                          onClick={() => toggleDor(op.key)}
                        >
                          {op.label}
                        </Chip>
                      ))}
                    </div>
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
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {ESP_FIELDS.map(gyField)}
                  {/* Secreção (local; características se patológica) */}
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
                  {/* Sangramento (+ tipo se pelo OE, + quantidade se ≠ ausente) */}
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
                  {/* Perdas líquidas via colo (+ tipo, AmniSure/cristalização se ≠ ausente) */}
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
        </Section>

        {/* Exames laboratoriais */}
        <Section title="Exames laboratoriais" headerExtra={<LabflowButton />}>
            <Textarea
              rows={3}
              placeholder="Cole os exames laboratoriais..."
              value={form.labs}
              onChange={(e) => update({ labs: e.target.value })}
            />
        </Section>

        {/* Exames de imagem (USG obstétrico) — seção própria, em quadro */}
        {form.pregnant && (
        <Section
          id="psgo-usg"
          title="Exames de imagem (USG)"
          contentClassName="space-y-3"
          headerExtra={
            <Button type="button" size="sm" variant="outline" onClick={addImaging}>
              <Plus className="h-4 w-4" /> USG
            </Button>
          }
        >
            {form.imagingExams.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Adicione um USG. Percentis de PESO/CIRC. ABDOMINAL/DBP pela Hadlock; IP-AUmb,
                IP-ACM, RCP, TN (pelo CCN) e IP da a. uterina pela FMF (fetalmedicine.org).
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
                      <td className="border-b p-1 font-medium">CCN (mm)</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <Input
                            className="h-7 w-16 text-xs"
                            inputMode="decimal"
                            value={e.crl ?? ""}
                            onChange={(ev) => updateImaging(e.id, { crl: ev.target.value })}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">DBP (mm)</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-16 text-xs"
                              inputMode="decimal"
                              value={e.bpd ?? ""}
                              onChange={(ev) => updateImaging(e.id, { bpd: ev.target.value })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {imagingCentiles[e.id]?.bpd}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">TN (mm)</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-16 text-xs"
                              inputMode="decimal"
                              value={e.nt ?? ""}
                              onChange={(ev) => updateImaging(e.id, { nt: ev.target.value })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {imagingCentiles[e.id]?.nt}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="border-b p-1 font-medium">Osso nasal</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <select
                            className={`${selectClass} h-7 w-28 text-xs`}
                            value={e.nasalBone ?? ""}
                            onChange={(ev) => updateImaging(e.id, { nasalBone: ev.target.value })}
                          >
                            <option value="">—</option>
                            <option value="PRESENTE">Presente</option>
                            <option value="AUSENTE">Ausente</option>
                          </select>
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
                    <tr>
                      <td className="border-b p-1 font-medium">IP A. uterina</td>
                      {form.imagingExams.map((e) => (
                        <td key={e.id} className="border-b p-1">
                          <div className="flex items-center gap-1">
                            <Input
                              className="h-7 w-16 text-xs"
                              inputMode="decimal"
                              value={e.utPi ?? ""}
                              onChange={(ev) => updateImaging(e.id, { utPi: ev.target.value })}
                            />
                            <span className="text-[10px] text-muted-foreground">
                              {imagingCentiles[e.id]?.utPi}
                            </span>
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {form.imagingExams.length > 0 && (
              <p className="text-[11px] text-muted-foreground">
                Preencha apenas o que constar no laudo — nem todos os aspectos (CCN, DBP, TN,
                osso nasal, biometria, Doppler, IP da a. uterina) aparecem no mesmo US. Percentis
                de TN e IP da a. uterina seguem os padrões FMF.
              </p>
            )}

            {form.imagingExams.map((e) => (
              <p key={e.id} className="prontuario-text rounded bg-muted/40 px-2 py-1 text-[11px]">
                {renderImagingExam(e)}
              </p>
            ))}
        </Section>
        )}

        {/* CTG (só gestantes) — card próprio, com uma ou mais CTGs */}
        {form.pregnant && (
          <Section
            title="CTG"
            contentClassName="space-y-3"
            headerExtra={
              <Button type="button" size="sm" variant="outline" onClick={addCtg}>
                <Plus className="h-4 w-4" /> CTG
              </Button>
            }
          >
            {form.ctgLaudos.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Nenhuma CTG realizada. Use &ldquo;+ CTG&rdquo; para adicionar (não aparece no
                prontuário se nenhuma for feita).
              </p>
            ) : (
              form.ctgLaudos.map(renderCtgCard)
            )}
          </Section>
        )}

        {/* Conduta — card próprio */}
        <Section title="Conduta" contentClassName="space-y-3">
            <Field label="Conduta (CD)">
              <Textarea rows={2} value={form.cd} onChange={(e) => update({ cd: e.target.value })} />
            </Field>
        </Section>
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
