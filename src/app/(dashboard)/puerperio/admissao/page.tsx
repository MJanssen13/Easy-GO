import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdmissionForm } from "../_components/admission-form";

export const metadata: Metadata = { title: "Admitir puérpera" };

export default function PuerperioAdmissionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/puerperio"
        className="-my-1.5 inline-flex min-h-9 items-center gap-1 py-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos leitos
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">Admitir puérpera</h1>
      <AdmissionForm />
    </div>
  );
}
