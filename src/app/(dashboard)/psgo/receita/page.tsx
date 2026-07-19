import type { Metadata } from "next";
import Link from "next/link";
import { Pill, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { toISODateLocal } from "@/core/obstetric/gestational-age";
import { ReceitaGenerator } from "../_components/receita-generator";

export const metadata: Metadata = { title: "Receita — PSGO" };

export default function PsgoReceitaPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <Pill className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Receita — PSGO</h1>
            <p className="text-sm text-muted-foreground">
              Prescrição médica estruturada. Apoio à documentação; valide com a equipe.
            </p>
          </div>
        </div>
        <Link href="/psgo" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <ReceitaGenerator today={toISODateLocal(new Date())} />
    </div>
  );
}
