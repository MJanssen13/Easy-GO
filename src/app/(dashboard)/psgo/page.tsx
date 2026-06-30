import type { Metadata } from "next";
import { Siren } from "lucide-react";
import { PsgoGenerator } from "./_components/psgo-generator";

export const metadata: Metadata = { title: "PSGO" };

export default function PsgoPage() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-accent text-rose-600">
          <Siren className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">PSGO</h1>
          <p className="text-sm text-muted-foreground">
            Pronto-socorro obstétrico — gerador de prontuário. Apoio à decisão; valide com a equipe.
          </p>
        </div>
      </div>

      <PsgoGenerator />
    </div>
  );
}
