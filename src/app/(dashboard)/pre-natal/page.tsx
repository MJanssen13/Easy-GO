import type { Metadata } from "next";
import { Stethoscope } from "lucide-react";
import { toISODateLocal } from "@/core/obstetric/gestational-age";
import { PrenatalGenerator } from "./_components/prenatal-generator";

export const metadata: Metadata = { title: "Pré-Natal" };

export default function PreNatalPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
          <Stethoscope className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Consulta de Pré-Natal</h1>
          <p className="text-sm text-muted-foreground">
            Ambulatório de pré-natal (MS/Febrasgo). Gera o texto do prontuário. Apoio à decisão;
            valide com a equipe.
          </p>
        </div>
      </div>

      <PrenatalGenerator today={toISODateLocal(new Date())} />
    </div>
  );
}
