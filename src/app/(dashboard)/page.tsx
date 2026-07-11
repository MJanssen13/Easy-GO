import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MODULES } from "@/lib/modules";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShiftTeamCard } from "@/components/shift-team-card";

export default function HubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plataforma Easy-GO</h1>
        <p className="text-muted-foreground">
          Selecione um módulo para iniciar. Os módulos de geração não armazenam dados; os de
          acompanhamento persistem com segurança.
        </p>
      </div>

      <ShiftTeamCard />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const Icon = m.icon;
          return (
            <Link key={m.slug} href={`/${m.slug}`} className="group">
              <Card className="h-full transition-shadow group-hover:shadow-md">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-muted ring-1 ring-inset ring-border ${m.accent}`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                      {m.stateful ? "Armazena dados" : "Gera prontuário"}
                    </span>
                  </div>
                  <CardTitle className="pt-2 flex items-center gap-1">
                    {m.label}
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription>{m.short}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{m.description}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
