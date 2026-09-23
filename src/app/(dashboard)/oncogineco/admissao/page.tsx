import type { Metadata } from "next";
import { PageHero } from "@/components/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { OncoAdmissionForm } from "../_components/onco-admission-form";

export const metadata: Metadata = { title: "Admitir — Onco-Ginecologia" };

export default function OncoAdmissionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHero back={{ href: "/oncogineco", label: "Leitos" }} eyebrow="Onco-Ginecologia" title="Admitir paciente" />
      <OncoAdmissionForm />
    </div>
  );
}
