import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Pré-Natal" };

export default function PreNatalPage() {
  return <ModulePlaceholder slug="pre-natal" phase="Fase 3" />;
}
