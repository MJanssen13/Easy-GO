import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Puerpério" };

export default function PuerperioPage() {
  return <ModulePlaceholder slug="puerperio" phase="Fase 5" />;
}
