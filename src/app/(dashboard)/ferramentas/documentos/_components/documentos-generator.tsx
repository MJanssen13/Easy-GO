"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { printHtml } from "@/lib/print";
import { letterheadFor } from "@/core/ctg/laudo";
import {
  renderReceitaDocsHtml,
  RECEITA_DOC_LABEL,
  type ReceitaDocId,
  type RelatorioData,
} from "@/core/psgo/receita-relatorios";
import { AtestadoSection } from "./atestado-section";

const CURVAS: ReceitaDocId[] = ["curva-termica", "curva-pressorica", "curva-glicemica"];
const CARTAS: ReceitaDocId[] = [
  "relatorio-toxo",
  "carta-sifilis",
  "carta-sifilis-parceiro",
  "relatorio-dmg",
  "carta-insumos-dmg",
  "carta-noripurum",
  "carta-aplicacao-im",
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

export function DocumentosGenerator({ today }: { today: string }) {
  const [paciente, setPaciente] = useState("");
  const [prontuario, setProntuario] = useState("");
  const [idade, setIdade] = useState("");
  const [cidade, setCidade] = useState("Uberaba-MG");
  const [data, setData] = useState(today);
  const [ig, setIg] = useState("");
  const [numDoses, setNumDoses] = useState("1");
  const [selected, setSelected] = useState<ReceitaDocId[]>([]);

  const toggle = (id: ReceitaDocId) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const temSifilis = selected.some((d) => d === "carta-sifilis" || d === "carta-sifilis-parceiro");

  const handlePrint = () => {
    if (!selected.length) return;
    const d: RelatorioData = {
      paciente,
      prontuario,
      idade,
      cidade,
      dataBR: data ? new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR") : "",
      ig,
      numDoses,
    };
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    printHtml(renderReceitaDocsHtml(selected, d, letterheadFor(origin)));
  };

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-20 -mx-1 flex items-center justify-end gap-2 border-b bg-background/95 px-1 py-2 backdrop-blur">
        <Button type="button" size="sm" onClick={handlePrint} disabled={!selected.length}>
          <Printer className="h-4 w-4" /> Imprimir / PDF ({selected.length})
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Paciente">
            <Input value={paciente} onChange={(e) => setPaciente(e.target.value)} />
          </Field>
          <Field label="Documento (CPF / RG / prontuário)">
            <Input value={prontuario} onChange={(e) => setProntuario(e.target.value)} />
          </Field>
          <Field label="Idade">
            <Input value={idade} onChange={(e) => setIdade(e.target.value)} />
          </Field>
          <Field label="Idade gestacional (IG)">
            <Input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="ex.: 24 sem" />
          </Field>
          <Field label="Cidade">
            <Input value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </Field>
          <Field label="Data">
            <Input type="date" value={data} onChange={(e) => setData(e.target.value)} />
          </Field>
          {temSifilis && (
            <Field label="Nº de doses (sífilis)">
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={numDoses}
                onChange={(e) => setNumDoses(e.target.value)}
              >
                <option value="1">Dose única</option>
                <option value="3">3 doses (1 por semana)</option>
              </select>
            </Field>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Curvas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {CURVAS.map((c) => (
              <Chip key={c} active={selected.includes(c)} onClick={() => toggle(c)}>
                {RECEITA_DOC_LABEL[c]}
              </Chip>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Folha em paisagem, espelhada nas duas metades (para recortar).
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Relatórios e cartas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {CARTAS.map((c) => (
              <Chip key={c} active={selected.includes(c)} onClick={() => toggle(c)}>
                {RECEITA_DOC_LABEL[c]}
              </Chip>
            ))}
          </div>
        </CardContent>
      </Card>

      <AtestadoSection paciente={paciente} documento={prontuario} cidade={cidade} data={data} />
    </div>
  );
}
