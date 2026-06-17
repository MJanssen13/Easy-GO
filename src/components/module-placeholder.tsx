import { getModule } from "@/lib/modules";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ModulePlaceholder({ slug, phase }: { slug: string; phase: string }) {
  const m = getModule(slug);
  if (!m) return null;
  const Icon = m.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-lg bg-accent ${m.accent}`}>
          <Icon className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{m.label}</h1>
          <p className="text-sm text-muted-foreground">{m.short}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{m.description}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{phase}</span>
            <span>— módulo em construção. A fundação está pronta e este eixo será implementado a seguir.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
