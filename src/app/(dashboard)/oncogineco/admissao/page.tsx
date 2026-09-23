import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OncoAdmissionForm } from "../_components/onco-admission-form";

export const metadata: Metadata = { title: "Admitir — Onco-Ginecologia" };

export default function OncoAdmissionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/oncogineco"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Admitir paciente</h1>
      <OncoAdmissionForm />
    </div>
  );
}
