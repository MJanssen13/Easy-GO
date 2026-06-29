import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2, ClipboardList, Plus } from "lucide-react";
import { getPatient } from "@/core/patients/repository";
import { PATIENT_STATUS_LABELS, PATIENT_STATUS_BADGE } from "@/core/patients/status";
import { currentGaLabel } from "@/core/patients/display";
import { renderEvolution } from "@/core/prontuario/preparto";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/copy-button";
import { removePatient } from "../actions";

function formatBR(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

export default async function PatientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const patient = await getPatient(id);
  if (!patient) notFound();

  const ga = currentGaLabel(patient);
  const fields: { label: string; value: string }[] = [
    { label: "Leito", value: patient.bed ?? "—" },
    { label: "Prontuário", value: patient.medicalRecordNumber ?? "—" },
    { label: "Idade", value: patient.age != null ? `${patient.age} anos` : "—" },
    { label: "Paridade", value: patient.parity ?? "—" },
    { label: "Tipo sanguíneo", value: patient.bloodType ?? "—" },
    { label: "IG (hoje)", value: ga ?? "—" },
    { label: "DUM", value: formatBR(patient.lmp) },
    { label: "DPP", value: formatBR(patient.edd) },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/pre-parto"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{patient.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant={PATIENT_STATUS_BADGE[patient.status]}>
              {PATIENT_STATUS_LABELS[patient.status]}
            </Badge>
            {patient.bed && <span className="text-sm text-muted-foreground">Leito {patient.bed}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/pre-parto/${patient.id}/evolucao`}>
            <Button size="sm">
              <Plus className="h-4 w-4" /> Nova evolução
            </Button>
          </Link>
          <form action={removePatient}>
            <input type="hidden" name="id" value={patient.id} />
            <Button type="submit" variant="outline" size="sm" className="text-destructive">
              <Trash2 className="h-4 w-4" /> Remover
            </Button>
          </form>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            {fields.map((f) => (
              <div key={f.label}>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">{f.label}</dt>
                <dd className="text-sm font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
          {patient.riskFactors.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1">
              {patient.riskFactors.map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4" /> Evoluções
            <span className="text-xs font-normal text-muted-foreground">
              ({patient.observations?.length ?? 0})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {patient.observations && patient.observations.length > 0 ? (
            <ul className="space-y-3">
              {patient.observations.map((o) => {
                const text = renderEvolution(patient, o);
                return (
                  <li key={o.id} className="rounded-md border">
                    <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-2">
                      <div>
                        <span className="text-sm font-medium">
                          {new Date(o.recordedAt).toLocaleString("pt-BR")}
                        </span>
                        {o.examinerName && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            {o.examinerName}
                          </span>
                        )}
                      </div>
                      <CopyButton text={text} />
                    </div>
                    <pre className="prontuario-text px-3 py-2 text-sm">{text}</pre>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhuma evolução registrada. Use{" "}
              <Link
                href={`/pre-parto/${patient.id}/evolucao`}
                className="font-medium text-primary hover:underline"
              >
                Nova evolução
              </Link>{" "}
              para registrar sinais vitais, dinâmica, toque e protocolos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
