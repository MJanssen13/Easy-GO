import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { toISODateLocal } from "@/core/obstetric/gestational-age";
import { DocumentosGenerator } from "./_components/documentos-generator";

export const metadata: Metadata = { title: "Documentos de apoio" };

export default function DocumentosPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        module="ferramentas"
        title="Documentos de apoio"
        subtitle="Ferramentas · curvas, cartas e relatórios"
        actions={
          <Link href="/ferramentas" className={buttonVariants({ variant: "outline" })}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Link>
        }
      />

      <DocumentosGenerator today={toISODateLocal(new Date())} />
    </div>
  );
}
