import Link from "next/link";
import { ArrowRight, HeartPulse, Pill, FileText } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Tool {
  slug: string;
  label: string;
  short: string;
  icon: typeof HeartPulse;
}

const TOOLS: Tool[] = [
  {
    slug: "receita",
    label: "Receita",
    short: "Prescrição médica estruturada",
    icon: Pill,
  },
  {
    slug: "documentos",
    label: "Documentos de apoio",
    short: "Curvas, relatórios e cartas",
    icon: FileText,
  },
  {
    slug: "cardiotocografia",
    label: "Cardiotocografia",
    short: "Leitor de arquivo .trc do Edan",
    icon: HeartPulse,
  },
];

export default function FerramentasPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ferramentas</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.slug} href={`/ferramentas/${t.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-slate-600 ring-1 ring-inset ring-border">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      Utilitário
                    </span>
                  </div>
                  <CardTitle className="pt-2 flex items-center gap-1">
                    {t.label}
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription>{t.short}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
