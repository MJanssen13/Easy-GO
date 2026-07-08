"use client";

import { useEffect, useState } from "react";
import { Users } from "lucide-react";
import type { TeamInput } from "@/core/prontuario/preparto-evolution";
import { readShiftTeam, writeShiftTeam, EMPTY_TEAM } from "./shift-team-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ROLES: Array<[keyof TeamInput, string]> = [
  ["chefia", "Chefia"],
  ["r3", "R3"],
  ["r2", "R2"],
  ["r1", "R1"],
  ["internos", "Internos"],
];

export function ShiftTeamCard() {
  const [team, setTeam] = useState<TeamInput>(EMPTY_TEAM);
  const [loaded, setLoaded] = useState(false);

  // Carrega do localStorage no cliente (evita mismatch de hidratação).
  useEffect(() => {
    setTeam(readShiftTeam());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeShiftTeam(team);
  }, [team, loaded]);

  const set = (k: keyof TeamInput, v: string) => setTeam((t) => ({ ...t, [k]: v }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-primary" /> Equipe de plantão
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ROLES.map(([k, label]) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input
                value={team[k]}
                onChange={(e) => set(k, e.target.value)}
                placeholder="nomes por vírgula"
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Salva neste dispositivo e usada automaticamente em todas as evoluções de plantão do
          Pré-Parto. Cargos vazios não entram na evolução.
        </p>
      </CardContent>
    </Card>
  );
}
