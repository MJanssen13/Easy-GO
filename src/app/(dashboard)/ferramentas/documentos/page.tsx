import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ArrowLeft } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { toISODateLocal } from "@/core/obstetric/gestational-age";
import { DocumentosGenerator } from "./_components/documentos-generator";

export const metadata: Metadata = { title: "Documentos de apoio" };

export default function DocumentosPage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-primary">
            <FileText className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Documentos de apoio</h1>
            <p className="text-sm text-muted-foreground">
              Curvas, relatórios e cartas para impressão. Apoio à documentação; valide com a equipe.
            </p>
          </div>
        </div>
        <Link href="/ferramentas" className={buttonVariants({ variant: "outline" })}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
      </div>

      <DocumentosGenerator today={toISODateLocal(new Date())} />
    </div>
  );
}
