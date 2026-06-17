import Link from "next/link";
import { BedDouble, Baby, Droplet } from "lucide-react";
import type { Patient } from "@/core/patients/types";
import { PATIENT_STATUS_LABELS, PATIENT_STATUS_BADGE } from "@/core/patients/status";
import { currentGaLabel } from "@/core/patients/display";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function PatientCard({ patient }: { patient: Patient }) {
  const ga = currentGaLabel(patient);

  return (
    <Link href={`/pre-parto/${patient.id}`} className="group block">
      <Card className="h-full p-4 transition-shadow group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm font-semibold">
            <BedDouble className="h-4 w-4 text-muted-foreground" />
            {patient.bed ? `Leito ${patient.bed}` : "Sem leito"}
          </div>
          <Badge variant={PATIENT_STATUS_BADGE[patient.status]}>
            {PATIENT_STATUS_LABELS[patient.status]}
          </Badge>
        </div>

        <p className="mt-2 truncate text-base font-bold text-foreground">{patient.name}</p>

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

        {(patient.useMethyldopa || patient.useMagnesiumSulfate) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {patient.useMethyldopa && (
              <Badge variant="outline" className="text-[10px]">
                Metildopa
              </Badge>
            )}
            {patient.useMagnesiumSulfate && (
              <Badge variant="outline" className="text-[10px]">
                MgSO₄
              </Badge>
            )}
          </div>
        )}
      </Card>
    </Link>
  );
}
