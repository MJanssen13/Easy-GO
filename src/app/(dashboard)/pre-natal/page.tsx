import type { Metadata } from "next";
import { toISODateLocal } from "@/core/obstetric/gestational-age";
import { PrenatalGenerator } from "./_components/prenatal-generator";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = { title: "Pré-Natal" };

export default function PreNatalPage() {
  return (
    <div className="space-y-5">
      <PageHeader module="pre-natal" title="Consulta de Pré-Natal" subtitle="Gera o texto da consulta para o prontuário" />

      <PrenatalGenerator today={toISODateLocal(new Date())} />
    </div>
  );
}
