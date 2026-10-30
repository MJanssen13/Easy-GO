"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowDown01, ArrowDownAZ, CalendarDays, Search, X } from "lucide-react";
import type { Patient } from "@/core/patients/types";
import type { Stats24h } from "@/core/patients/stats";
import { RESOLVED_STATUSES } from "@/core/patients/status";
import { cn } from "@/lib/utils";
import { PatientCard, type LastExam } from "./patient-card";

type Filter = "active" | "resolved" | "all";
type Sort = "bed" | "name" | "admission";
const PREF_KEY = "easygo.preparto.board";

const bedNum = (b?: string | null) => {
  const n = parseInt(b ?? "", 10);
  return Number.isNaN(n) ? Infinity : n;
};

/**
 * Quadro de leitos com busca (nome, leito, prontuário), filtro Ativas /
 * Resolvidas / Todas e ordenação por leito, nome ou internação (lembrados).
 */
export function PrePartoBoard({
  patients,
  stats,
  exams,
}: {
  patients: Patient[];
  stats: Record<string, Stats24h | null>;
  exams: Record<string, LastExam | null>;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("active");
  const [sort, setSort] = useState<Sort>("bed");

  useEffect(() => {
    try {
      const p = JSON.parse(window.localStorage.getItem(PREF_KEY) ?? "{}") as { filter?: Filter; sort?: Sort };
      if (p.filter) setFilter(p.filter);
      if (p.sort) setSort(p.sort);
    } catch {
      // sem localStorage
    }
  }, []);
  const remember = (next: { filter?: Filter; sort?: Sort }) => {
    try {
      window.localStorage.setItem(PREF_KEY, JSON.stringify({ filter, sort, ...next }));
    } catch {
      // sem localStorage
    }
  };

  const list = useMemo(() => {
    const t = q
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
    const fold = (s?: string | null) =>
      (s ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase();
    return patients
      .filter((p) => {
        const resolved = RESOLVED_STATUSES.includes(p.status);
        if (filter === "active" && resolved) return false;
        if (filter === "resolved" && !resolved) return false;
        if (!t) return true;
        return (
          fold(p.name).includes(t) ||
          fold(p.bed) === t.replace(/^l(eito)?\s*/, "") ||
          fold(p.medicalRecordNumber).includes(t)
        );
      })
      .sort((a, b) => {
        if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
        if (sort === "admission")
          return new Date(b.admissionDate ?? 0).getTime() - new Date(a.admissionDate ?? 0).getTime();
        return bedNum(a.bed) - bedNum(b.bed) || a.name.localeCompare(b.name, "pt-BR");
      });
  }, [patients, q, filter, sort]);

  const counts = {
    active: patients.filter((p) => !RESOLVED_STATUSES.includes(p.status)).length,
    resolved: patients.filter((p) => RESOLVED_STATUSES.includes(p.status)).length,
  };

  const seg = (on: boolean) =>
    cn(
      "inline-flex min-h-8 items-center gap-1 rounded-lg px-3 text-xs font-semibold transition-colors",
      on ? "bg-accent text-[hsl(var(--accent-foreground))]" : "text-muted-foreground hover:bg-muted",
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[14rem] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome, leito ou prontuário…"
            aria-label="Buscar paciente"
            className="h-10 w-full rounded-xl border bg-white pl-9 pr-9 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15 [&::-webkit-search-cancel-button]:appearance-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </label>
        <div className="flex rounded-xl border bg-white p-1" role="group" aria-label="Filtrar">
          {(
            [
              ["active", `Ativas (${counts.active})`],
              ["resolved", `Resolvidas (${counts.resolved})`],
              ["all", "Todas"],
            ] as [Filter, string][]
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => (setFilter(f), remember({ filter: f }))}
              className={seg(filter === f)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex rounded-xl border bg-white p-1" role="group" aria-label="Ordenar">
          {(
            [
              ["bed", "Leito", ArrowDown01],
              ["name", "Nome", ArrowDownAZ],
              ["admission", "Internação", CalendarDays],
            ] as [Sort, string, typeof ArrowDown01][]
          ).map(([s, label, Icon]) => (
            <button
              key={s}
              type="button"
              aria-pressed={sort === s}
              onClick={() => (setSort(s), remember({ sort: s }))}
              className={seg(sort === s)}
              title={`Ordenar por ${label.toLowerCase()}`}
            >
              <Icon className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-white py-10 text-center text-sm text-muted-foreground">
          {q ? `Nenhuma paciente encontrada para “${q}”.` : "Nenhuma paciente neste filtro."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {list.map((p) => (
            <div key={p.id} className={cn(RESOLVED_STATUSES.includes(p.status) && "opacity-75")}>
              <PatientCard patient={p} stats={stats[p.id]} lastExam={exams[p.id]} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
