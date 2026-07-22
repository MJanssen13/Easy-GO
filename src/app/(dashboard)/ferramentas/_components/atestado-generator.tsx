"use client";

import { useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import {
  emptyAtestado,
  buildAtestadoText,
  ATESTADO_TIPO_OPTIONS,
  type AtestadoForm,
  type AtestadoTipo,
} from "@/core/atestado/atestado";
import { buildAtestadoPrintHtml } from "@/core/atestado/atestado-print";
import { printHtml, isMobile } from "@/lib/print";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

/** Paciente do sistema para preenchimento automático. */
export interface PacienteLite {
  id: string;
  name: string;
  medicalRecordNumber?: string | null;
}

// jsPDF é pesado e só é usado no mobile → carregado sob demanda (code-split).
type AtestadoPdfModule = typeof import("@/core/atestado/atestado-pdf");

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

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
      className={`rounded-full border px-3 py-0.5 text-sm font-medium transition-colors ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

export function AtestadoGenerator({
  today,
  patients = [],
}: {
  today: string;
  patients?: PacienteLite[];
}) {
  const [form, setForm] = useState<AtestadoForm>(() => emptyAtestado(today));
  const set = (patch: Partial<AtestadoForm>) => setForm((f) => ({ ...f, ...patch }));

  const fillFromPatient = (id: string) => {
    const p = patients.find((x) => x.id === id);
    if (!p) return;
    set({ paciente: p.name ?? "", documento: p.medicalRecordNumber ?? "" });
  };

  const text = useMemo(() => buildAtestadoText(form), [form]);

  const pdfMod = useRef<AtestadoPdfModule | null>(null);
  const handlePrint = () => {
    if (isMobile()) {
      if (pdfMod.current) pdfMod.current.downloadAtestadoPdf(form);
      else import("@/core/atestado/atestado-pdf").then((m) => m.downloadAtestadoPdf(form));
    } else {
      printHtml(buildAtestadoPrintHtml(form));
    }
  };

  const isAfast = form.tipo === "AFASTAMENTO";
  const isAcomp = form.tipo === "ACOMPANHANTE";
  const showHoras = form.tipo === "COMPARECIMENTO" || isAcomp;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        {/* Ações */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Apoio à documentação — valide e assine. O CID só deve constar com autorização do
            paciente (sigilo).
          </p>
          <div className="flex items-center gap-2">
            <CopyButton text={text} />
            <Button type="button" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados do documento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Tipo:</span>
              {ATESTADO_TIPO_OPTIONS.map((t) => (
                <Chip
                  key={t.value}
                  active={form.tipo === t.value}
                  onClick={() => set({ tipo: t.value as AtestadoTipo })}
                >
                  {t.label}
                </Chip>
              ))}
            </div>

            {patients.length > 0 && (
              <Field label="Preencher com paciente (opcional)">
                <select
                  className={selectCls}
                  defaultValue=""
                  onChange={(e) => fillFromPatient(e.target.value)}
                >
                  <option value="">— selecione uma paciente do PSGO —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.medicalRecordNumber ? ` · ${p.medicalRecordNumber}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Field label="Paciente" className="col-span-2">
                <Input value={form.paciente} onChange={(e) => set({ paciente: e.target.value })} />
              </Field>
              <Field label="Documento (RG/prontuário)">
                <Input value={form.documento} onChange={(e) => set({ documento: e.target.value })} />
              </Field>
              {isAcomp && (
                <Field label="Acompanhante">
                  <Input
                    value={form.acompanhante}
                    onChange={(e) => set({ acompanhante: e.target.value })}
                  />
                </Field>
              )}
            </div>

            {isAfast && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dias de afastamento">
                  <Input
                    value={form.dias}
                    onChange={(e) => set({ dias: e.target.value.replace(/[^\d]/g, "") })}
                    inputMode="numeric"
                    placeholder="ex.: 3"
                  />
                </Field>
                <Field label="A partir de">
                  <Input
                    type="date"
                    value={form.inicio}
                    onChange={(e) => set({ inicio: e.target.value })}
                  />
                </Field>
              </div>
            )}

            {showHoras && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Horário de entrada">
                  <Input
                    type="time"
                    value={form.horaInicio}
                    onChange={(e) => set({ horaInicio: e.target.value })}
                  />
                </Field>
                <Field label="Horário de saída">
                  <Input
                    type="time"
                    value={form.horaFim}
                    onChange={(e) => set({ horaFim: e.target.value })}
                  />
                </Field>
              </div>
            )}

            <div className="space-y-2 rounded-md border p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={form.incluirCid}
                  onChange={(e) => set({ incluirCid: e.target.checked })}
                />
                Incluir CID (com autorização do paciente)
              </label>
              {form.incluirCid && (
                <Field label="CID-10">
                  <Input
                    value={form.cid}
                    onChange={(e) => set({ cid: e.target.value })}
                    placeholder="ex.: O26.9"
                  />
                </Field>
              )}
            </div>

            <Field label="Observações (opcional)">
              <Textarea
                rows={2}
                value={form.observacoes}
                onChange={(e) => set({ observacoes: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Cidade">
                <Input value={form.cidade} onChange={(e) => set({ cidade: e.target.value })} />
              </Field>
              <Field label="Data">
                <Input type="date" value={form.data} onChange={(e) => set({ data: e.target.value })} />
              </Field>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Prévia */}
      <div className="lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prévia</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-words rounded bg-muted/40 p-3 text-sm">
              {text}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
