import Link from "next/link";
import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, FileText, HeartPulse, Pill, Plus, Stethoscope, Zap } from "lucide-react";
import { getModule } from "@/lib/modules";
import { buttonVariants } from "@/components/ui/button";
import { listPatients } from "@/core/patients/repository";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import type { Patient, PatientModule } from "@/core/patients/types";
import { overdueTasks, upcomingTasks } from "@/core/schedule/planner";
import { readPuerperio } from "@/core/puerperio/types";
import { puerperioPendings } from "@/core/puerperio/checklist";
import { postpartumDay } from "@/core/puerperio/render";
import { readOnco } from "@/core/oncogineco/types";
import { postOpDay } from "@/core/oncogineco/render";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShiftTeamCard } from "@/components/shift-team-card";

export const dynamic = "force-dynamic";

interface Attention {
  href: string;
  who: string;
  what: string;
  level: "danger" | "warning";
}

async function load(module: PatientModule): Promise<Patient[] | null> {
  try {
    return (await listPatients(module)).filter((p) => !RESOLVED_STATUSES.includes(p.status));
  } catch {
    return null;
  }
}

function hhmm(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function who(p: Patient): string {
  return `${p.bed ? `L${p.bed} · ` : ""}${p.name}`;
}

const QUICK = [
  { href: "/pre-natal", label: "Consulta de pré-natal", icon: Stethoscope },
  { href: "/pre-parto/cronograma", label: "Cronograma de aferições", icon: CalendarClock },
  { href: "/ferramentas/receita", label: "Receita", icon: Pill },
  { href: "/ferramentas/cardiotocografia", label: "Cardiotocografia", icon: HeartPulse },
  { href: "/ferramentas/documentos", label: "Documentos de apoio", icon: FileText },
];

export default async function HubPage() {
  const [preParto, puerperio, onco, psgo] = await Promise.all([
    load("pre_parto"),
    load("puerperio"),
    load("oncogineco"),
    load("psgo"),
  ]);
  const offline = [preParto, puerperio, onco, psgo].every((l) => l == null);
  const now = new Date();
  const hour = now.getHours();
  const shiftLabel = hour >= 7 && hour < 19 ? "diurno" : "noturno";
  const dateLabel = now.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const totalActive = (preParto?.length ?? 0) + (puerperio?.length ?? 0) + (onco?.length ?? 0);
  const today = new Date().toDateString();

  // ------------------------- O que precisa de atenção -------------------------
  const attention: Attention[] = [];
  for (const p of preParto ?? []) {
    const late = overdueTasks(p.schedule ?? []);
    if (late.length > 0)
      attention.push({
        href: `/pre-parto/${p.id}/evolucao`,
        who: who(p),
        what: `${late.length} aferição(ões) atrasada(s) desde ${hhmm(late[0]!.timestamp)}`,
        level: "danger",
      });
    else if ((p.schedule ?? []).every((t) => t.status !== "pending"))
      attention.push({ href: `/pre-parto/${p.id}/rotina`, who: who(p), what: "Sem rotina de aferições", level: "warning" });
  }
  for (const p of puerperio ?? []) {
    const s = readPuerperio(p.clinicalSummary);
    for (const pend of puerperioPendings(p, s).filter((x) => x.level === "danger"))
      attention.push({ href: `/puerperio/${p.id}`, who: who(p), what: pend.text, level: "danger" });
    if (!s.evolutions.some((e) => new Date(e.at).toDateString() === today))
      attention.push({ href: `/puerperio/${p.id}`, who: who(p), what: "Evolução de hoje pendente", level: "warning" });
  }
  for (const p of onco ?? []) {
    const s = readOnco(p.clinicalSummary);
    if (!s.evolutions.some((e) => new Date(e.at).toDateString() === today))
      attention.push({ href: `/oncogineco/${p.id}`, who: who(p), what: "Evolução de hoje pendente", level: "warning" });
  }
  attention.sort((a, b) => (a.level === b.level ? 0 : a.level === "danger" ? -1 : 1));

  // ------------------------------- Por módulo -------------------------------
  const nextPreParto = (preParto ?? [])
    .flatMap((p) => upcomingTasks(p.schedule ?? [], 1).map((t) => ({ t, p })))
    .sort((a, b) => new Date(a.t.timestamp).getTime() - new Date(b.t.timestamp).getTime())[0];

  const summaries: { slug: string; count: number | null; line: string }[] = [
    {
      slug: "pre-parto",
      count: preParto?.length ?? null,
      line: nextPreParto
        ? `Próxima aferição ${hhmm(nextPreParto.t.timestamp)} · ${nextPreParto.p.bed ? `L${nextPreParto.p.bed}` : nextPreParto.p.name}`
        : "Sem aferições pendentes",
    },
    {
      slug: "puerperio",
      count: puerperio?.length ?? null,
      line: (() => {
        const list = puerperio ?? [];
        const pending = list.filter(
          (p) => !readPuerperio(p.clinicalSummary).evolutions.some((e) => new Date(e.at).toDateString() === today),
        ).length;
        const altas = list.filter((p) => postpartumDay(readPuerperio(p.clinicalSummary).delivery.at) >= 2).length;
        return list.length === 0
          ? "Nenhuma puérpera"
          : `${pending ? `${pending} sem evolução hoje` : "Todas evoluídas hoje"}${altas ? ` · ${altas} com ≥ 2 DPP` : ""}`;
      })(),
    },
    {
      slug: "oncogineco",
      count: onco?.length ?? null,
      line: (() => {
        const list = onco ?? [];
        const pos = list.filter((p) => postOpDay(readOnco(p.clinicalSummary).history) != null).length;
        return list.length === 0 ? "Nenhuma internada" : `${pos} em pós-operatório`;
      })(),
    },
    { slug: "psgo", count: psgo?.length ?? null, line: "Admissões ativas do PS" },
  ];

  return (
    <div className="space-y-6">
      {/* Turno: data, situação e ações principais */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b pb-4">
        <div>
          <p className="text-sm text-muted-foreground first-letter:uppercase">{dateLabel}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">Plantão {shiftLabel}</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {totalActive} paciente(s) internada(s) ·{" "}
            {attention.length > 0 ? (
              <span className="font-medium text-amber-700">{attention.length} pendência(s)</span>
            ) : (
              "sem pendências"
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/psgo/admissao" className={buttonVariants({ variant: "outline" })}>
            <Plus className="h-4 w-4" /> Admissão no PSGO
          </Link>
          <Link href="/pre-parto/admissao" className={buttonVariants()}>
            <Plus className="h-4 w-4" /> Admitir no Pré-Parto
          </Link>
        </div>
      </header>

      {offline && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Não foi possível carregar as pacientes. Verifique a conexão com o Supabase.
        </div>
      )}

      {/* Resumo por módulo: uma faixa só, números alinhados */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border xl:grid-cols-4">
        {summaries.map((s) => {
          const m = getModule(s.slug)!;
          return (
            <Link key={s.slug} href={`/${s.slug}`} className="group block bg-white p-4 transition-colors hover:bg-slate-50 sm:p-5">
              <p className="flex items-center justify-between text-sm font-medium text-muted-foreground">
                {m.label}
                <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
              <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">{s.count ?? "—"}</p>
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{s.line}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Atenção */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Precisa de atenção
              {attention.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">({attention.length})</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Tudo em dia.
              </p>
            ) : (
              <ul className="divide-y">
                {attention.slice(0, 12).map((a, i) => (
                  <li key={i}>
                    <Link
                      href={a.href}
                      className="flex flex-wrap items-center gap-x-3 gap-y-0.5 rounded px-1 py-2 text-sm hover:bg-muted/50"
                    >
                      <span
                        className={`h-2 w-2 shrink-0 rounded-full ${a.level === "danger" ? "bg-rose-500" : "bg-amber-400"}`}
                      />
                      <span className="min-w-0 flex-1 font-medium">{a.who}</span>
                      <span
                        className={`w-full pl-5 text-xs sm:w-auto sm:pl-0 ${a.level === "danger" ? "font-semibold text-rose-700" : "text-amber-700"}`}
                      >
                        {a.what}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Atalhos */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-4 w-4" /> Atalhos
          </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1">
            {QUICK.map((q) => {
              const Icon = q.icon;
              return (
                <Link
                  key={q.href}
                  href={q.href}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" /> {q.label}
                </Link>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <ShiftTeamCard />

    </div>
  );
}
