import Link from "next/link";
import { User } from "lucide-react";
import type { Patient } from "@/core/patients/types";
import { Card, CardContent } from "@/components/ui/card";
import { patientToPsgoForm } from "@/core/psgo/patient-mapper";
import { buildPassagemBlock } from "@/core/psgo/passagem";

function gaLabel(p: Patient): string | null {
  if (p.gaWeeks == null) return null;
  return `${p.gaWeeks}s${p.gaDays ? ` ${p.gaDays}d` : ""}`;
}

/** Linha estruturada (rótulo + valor) da passagem, no card. */
function Row({ label, value, clamp = 2 }: { label: string; value: string; clamp?: 1 | 2 }) {
  return (
    <p className={`text-xs text-muted-foreground ${clamp === 1 ? "line-clamp-1" : "line-clamp-2"}`}>
      <span className="font-semibold text-foreground/70">{label}:</span> {value}
    </p>
  );
}

export function PsgoPatientCard({ patient }: { patient: Patient }) {
  const robson = (patient.clinicalSummary as { robsonGroup?: number | null } | null)?.robsonGroup;
  const ga = gaLabel(patient);
  // Passagem estruturada (mesma fonte da colagem) para exibir no card.
  const form = patientToPsgoForm(patient);
  const bloco = form ? buildPassagemBlock(form) : null;
  const c = bloco?.campos;

  return (
    <Link href={`/psgo/${patient.id}`} className="block">
      <Card className="transition-colors hover:border-primary/50">
        <CardContent className="space-y-2 p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-primary">
              <User className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">{patient.name}</p>
              {patient.medicalRecordNumber && (
                <p className="text-xs text-muted-foreground">RG {patient.medicalRecordNumber}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {patient.age != null && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{patient.age} anos</span>
            )}
            {ga && <span className="rounded-full bg-muted px-2 py-0.5 font-medium">IG {ga}</span>}
            {robson != null && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary">
                Robson {robson}
              </span>
            )}
            {patient.parity && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{patient.parity}</span>
            )}
            {patient.bloodType && (
              <span className="rounded-full bg-muted px-2 py-0.5 font-medium">{patient.bloodType}</span>
            )}
          </div>

          {/* Passagem estruturada (hipóteses, último USG/lab/CTG/toque) */}
          {c && (c.hd || c.usg || c.lab || c.ctg || c.toque) ? (
            <div className="space-y-1 border-t pt-2">
              {c.hd && <Row label="HD" value={c.hd} />}
              {c.usg && <Row label="USG" value={c.usg} />}
              {c.lab && <Row label="Lab" value={c.lab} />}
              {c.ctg && <Row label="CTG" value={c.ctg} clamp={1} />}
              {c.toque && <Row label="Toque" value={c.toque} />}
            </div>
          ) : (
            patient.riskFactors.length > 0 && (
              <p className="line-clamp-2 border-t pt-2 text-xs text-muted-foreground">
                {patient.riskFactors.join(" · ")}
              </p>
            )
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
