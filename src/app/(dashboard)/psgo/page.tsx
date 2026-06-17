import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "PSGO" };

export default function PsgoPage() {
  return <ModulePlaceholder slug="psgo" phase="Fase 4" />;
}
