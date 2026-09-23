import Link from "next/link";
import { Baby, Droplet, HeartPulse, Gauge, CalendarClock, AlertTriangle } from "lucide-react";
import type { Patient } from "@/core/patients/types";
import type { Stats24h } from "@/core/patients/stats";
import { PATIENT_STATUS_LABELS, PATIENT_STATUS_BADGE, RESOLVED_STATUSES } from "@/core/patients/status";
import { overdueTasks, upcomingTasks } from "@/core/schedule/planner";
import { currentGaLabel } from "@/core/patients/display";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BedAvatar, CardStrip } from "@/components/bed-avatar";

export function PatientCard({ patient, stats }: { patient: Patient; stats?: Stats24h | null }) {
  const ga = currentGaLabel(patient);
  const active = !RESOLVED_STATUSES.includes(patient.status);
  const overdue = active ? overdueTasks(patient.schedule ?? []) : [];
  const next = active ? upcomingTasks(patient.schedule ?? [], 1)[0] : undefined;
  const hhmm = (iso: string) =>
    new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <Link href={`/pre-parto/${patient.id}`} className="group block">
      <Card className="relative flex h-full flex-col overflow-hidden p-4 pt-5 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-lift">
        <CardStrip alert={overdue.length > 0} />
        <div className="flex items-center gap-3">
          <BedAvatar bed={patient.bed} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-slate-900 tracking-tight text-foreground">{patient.name}</p>
            <Badge variant={PATIENT_STATUS_BADGE[patient.status]} className="mt-1">
              {PATIENT_STATUS_LABELS[patient.status]}
            </Badge>
          </div>
        </div>

        {(patient.babyName || patient.babyName2) && (
          <p className="mt-2 truncate text-sm text-muted-foreground">
            <span className="text-amber-500">★</span>{" "}
            {[patient.babyName, patient.babyName2].filter(Boolean).join(" · ")}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {ga && (
            <span className="inline-flex items-center gap-1">
              <Baby className="h-3.5 w-3.5" />
              IG {ga}
            </span>
          )}
          {patient.bloodType && (
            <span className="inline-flex items-center gap-1">
              <Droplet className="h-3.5 w-3.5" />
              {patient.bloodType}
            </span>
          )}
          {patient.age != null && <span>{patient.age} anos</span>}
          {patient.parity && <span>{patient.parity}</span>}
        </div>

        {stats && (stats.hasBcf || stats.hasPa) && (
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 rounded-md bg-muted/50 px-2 py-1 text-xs">
            {stats.hasBcf && (
              <span className="inline-flex items-center gap-1">
                <HeartPulse className="h-3.5 w-3.5 text-rose-500" />
                BCF 24h: <strong>{stats.bcf}</strong>
              </span>
            )}
            {stats.hasPa && (
              <span className="inline-flex items-center gap-1">
                <Gauge className="h-3.5 w-3.5 text-indigo-500" />
                PA 24h: <strong>{stats.pas}/{stats.pad}</strong>
              </span>
            )}
          </div>
        )}

        {(patient.useMethyldopa || patient.useMagnesiumSulfate) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {patient.useMethyldopa && (
              <Badge variant="outline" className="text-[11px]">
                Metildopa
              </Badge>
            )}
            {patient.useMagnesiumSulfate && (
              <Badge variant="outline" className="text-[11px]">
                MgSO₄
              </Badge>
            )}
          </div>
        )}
        <div className="flex-1" />
        {active && (
          <div
            className={`mt-3 flex items-center gap-1.5 border-t pt-2 text-xs ${
              overdue.length > 0 ? "font-semibold text-rose-700" : next ? "text-muted-foreground" : "text-amber-700"
            }`}
          >
            {overdue.length > 0 ? (
              <>
                <AlertTriangle className="h-3.5 w-3.5" />
                {overdue.length} aferição(ões) atrasada(s) · desde {hhmm(overdue[0]!.timestamp)}
              </>
            ) : next ? (
              <>
                <CalendarClock className="h-3.5 w-3.5" />
                Próxima: <strong className="text-foreground">{hhmm(next.timestamp)}</strong>{" "}
                {next.focus.join(" · ")}
              </>
            ) : (
              <>
                <CalendarClock className="h-3.5 w-3.5" /> Sem rotina de aferições
              </>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}
