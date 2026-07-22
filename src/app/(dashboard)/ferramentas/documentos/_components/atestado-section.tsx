"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, Plus, Trash2, Search } from "lucide-react";
import {
  emptyAtestado,
  buildAtestadosText,
  ATESTADO_TIPO_OPTIONS,
  type AtestadoForm,
  type AtestadoTipo,
} from "@/core/atestado/atestado";
import { buildAtestadoPrintHtml } from "@/core/atestado/atestado-print";
import { searchCids, CID_LIST } from "@/core/atestado/cid";
import { printHtml, isMobile } from "@/lib/print";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type AtestadoPdfModule = typeof import("@/core/atestado/atestado-pdf");

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

/** Campo de CID: busca por código/descrição e aceita texto livre. */
function CidCombobox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const results = useMemo(() => searchCids(value, 40), [value]);
  const desc = useMemo(
    () => CID_LIST.find((c) => c.code.toLowerCase() === value.trim().toLowerCase())?.desc ?? "",
    [value],
  );

  useEffect(() => {
    function onDoc(ev: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(ev.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const choose = (code: string) => {
    onChange(code);
    setOpen(false);
    setHi(0);
  };

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          value={value}
          placeholder="busque por código ou descrição…"
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setHi(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!open || results.length === 0) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHi((h) => Math.min(h + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHi((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              choose(results[hi].code);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
        />
      </div>
      {desc && !open && <p className="mt-1 text-[11px] text-muted-foreground">{desc}</p>}
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-background shadow-md">
          {results.map((c, i) => (
            <li key={c.code}>
              <button
                type="button"
                onMouseEnter={() => setHi(i)}
                onClick={() => choose(c.code)}
                className={`block w-full px-2.5 py-1.5 text-left text-sm ${i === hi ? "bg-muted" : ""}`}
              >
                <span className="font-medium">{c.code}</span>
                <span className="text-muted-foreground"> — {c.desc}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Seção de **atestados e declarações** dentro de Documentos de apoio. Usa a
 * identificação compartilhada da página; permite **mais de um documento** (ex.:
 * atestado + acompanhante), impressos no modelo da receita (A4 paisagem, um por
 * lado). Desktop → diálogo do navegador; mobile → PDF nativo.
 */
export function AtestadoSection({
  paciente,
  documento,
  cidade,
  data,
}: {
  paciente: string;
  documento: string;
  cidade: string;
  data: string;
}) {
  const [rows, setRows] = useState<AtestadoForm[]>(() => [emptyAtestado(data, uid())]);

  const setRow = (id: string, patch: Partial<AtestadoForm>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const addRow = () =>
    setRows((rs) => [...rs, { ...emptyAtestado(data, uid()), tipo: "ACOMPANHANTE" as AtestadoTipo }]);
  const removeRow = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));

  // Injeta a identificação compartilhada em cada documento.
  const forms = useMemo(
    () =>
      rows.map((r) => ({
        ...r,
        paciente,
        documento,
        cidade,
        data,
        inicio: r.inicio || data,
      })),
    [rows, paciente, documento, cidade, data],
  );
  const previa = useMemo(() => buildAtestadosText(forms), [forms]);

  const pdfMod = useRef<AtestadoPdfModule | null>(null);
  useEffect(() => {
    if (isMobile()) import("@/core/atestado/atestado-pdf").then((m) => (pdfMod.current = m));
  }, []);
  const handlePrint = () => {
    if (isMobile()) {
      if (pdfMod.current) pdfMod.current.downloadAtestadoPdf(forms);
      else import("@/core/atestado/atestado-pdf").then((m) => m.downloadAtestadoPdf(forms));
    } else {
      printHtml(buildAtestadoPrintHtml(forms));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Atestados e declarações</CardTitle>
        <Button type="button" size="sm" onClick={handlePrint}>
          <Printer className="h-4 w-4" /> Imprimir ({forms.length})
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-[11px] text-muted-foreground">
          Usa a identificação acima. Você pode emitir <strong>mais de um documento</strong> (ex.:
          atestado + acompanhante) — cada um ocupa um lado da folha (A4 paisagem, como a receita).
          O CID só entra <strong>com autorização da paciente</strong>.
        </p>

        {rows.map((r, i) => {
          const isAfast = r.tipo === "AFASTAMENTO";
          const isAcomp = r.tipo === "ACOMPANHANTE";
          const showHoras = r.tipo === "COMPARECIMENTO" || isAcomp;
          return (
            <div key={r.id} className="space-y-3 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-primary">Documento {i + 1}</span>
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(r.id)} className="text-destructive" title="Remover">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Tipo:</span>
                {ATESTADO_TIPO_OPTIONS.map((t) => (
                  <Chip key={t.value} active={r.tipo === t.value} onClick={() => setRow(r.id, { tipo: t.value as AtestadoTipo })}>
                    {t.label}
                  </Chip>
                ))}
              </div>

              {isAcomp && (
                <Field label="Acompanhante">
                  <Input value={r.acompanhante} onChange={(e) => setRow(r.id, { acompanhante: e.target.value })} />
                </Field>
              )}

              <Field label="Motivo (opcional)">
                <Input
                  value={r.motivo}
                  onChange={(e) => setRow(r.id, { motivo: e.target.value })}
                  placeholder={isAfast ? "ex.: repouso pós-procedimento" : "ex.: consulta médica"}
                />
              </Field>

              {isAfast && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Dias de afastamento">
                    <Input
                      value={r.dias}
                      onChange={(e) => setRow(r.id, { dias: e.target.value.replace(/[^\d]/g, "") })}
                      inputMode="numeric"
                      placeholder="ex.: 3"
                    />
                  </Field>
                  <Field label="A partir de">
                    <Input type="date" value={r.inicio} onChange={(e) => setRow(r.id, { inicio: e.target.value })} />
                  </Field>
                </div>
              )}

              {showHoras && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Horário de entrada">
                    <Input type="time" value={r.horaInicio} onChange={(e) => setRow(r.id, { horaInicio: e.target.value })} />
                  </Field>
                  <Field label="Horário de saída">
                    <Input type="time" value={r.horaFim} onChange={(e) => setRow(r.id, { horaFim: e.target.value })} />
                  </Field>
                </div>
              )}

              <div className="space-y-2 rounded-md border p-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={r.incluirCid}
                    onChange={(e) => setRow(r.id, { incluirCid: e.target.checked })}
                  />
                  Incluir CID (com autorização da paciente)
                </label>
                {r.incluirCid && (
                  <Field label="CID-10">
                    <CidCombobox value={r.cid} onChange={(v) => setRow(r.id, { cid: v })} />
                  </Field>
                )}
              </div>

              <Field label="Observações (opcional)">
                <Textarea rows={2} value={r.observacoes} onChange={(e) => setRow(r.id, { observacoes: e.target.value })} />
              </Field>
            </div>
          );
        })}

        <Button type="button" variant="outline" onClick={addRow} className="w-full">
          <Plus className="h-4 w-4" /> Adicionar documento
        </Button>

        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Prévia</Label>
          <pre className="whitespace-pre-wrap break-words rounded bg-muted/40 p-3 text-xs">{previa}</pre>
        </div>
      </CardContent>
    </Card>
  );
}
