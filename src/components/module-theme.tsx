"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/** Cor principal por módulo (rosa pré-parto/puerpério, vermelho PSGO, roxo onco, teal pré-natal). */
const MODULE_THEME: Record<string, string> = {
  "pre-parto": "theme-pink",
  puerperio: "theme-pink",
  psgo: "theme-red",
  oncogineco: "theme-purple",
  "pre-natal": "theme-teal",
};

export function ModuleTheme({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const segment = usePathname().split("/")[1] ?? "";
  const theme = MODULE_THEME[segment] ?? "theme-pink";
  return <div className={cn(theme, className)}>{children}</div>;
}
