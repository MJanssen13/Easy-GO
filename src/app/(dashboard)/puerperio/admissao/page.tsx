import type { Metadata } from "next";
import { PageHero } from "@/components/page-header";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdmissionForm } from "../_components/admission-form";

export const metadata: Metadata = { title: "Admitir puérpera" };

export default function PuerperioAdmissionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHero back={{ href: "/puerperio", label: "Leitos" }} eyebrow="Puerpério" title="Admitir puérpera" />
      <AdmissionForm />
    </div>
  );
}
