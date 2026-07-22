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
import { searchCids, cidLabel, CID_LIST } from "@/core/atestado/cid";
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

type AtestadoPdfModule = typeof import("@/core/atestado/atestado-pdf");

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

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

/** Campo de CID: busca na lista (código ou descrição) e aceita texto livre. */
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

function DocumentCard({
  form,
  index,
  canRemove,
  onChange,
  onRemove,
}: {
  form: AtestadoForm;
  index: number;
  canRemove: boolean;
  onChange: (patch: Partial<AtestadoForm>) => void;
  onRemove: () => void;
}) {
  const isAfast = form.tipo === "AFASTAMENTO";
  const isAcomp = form.tipo === "ACOMPANHANTE";
  const showHoras = form.tipo === "COMPARECIMENTO" || isAcomp;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
        <CardTitle className="text-base">Documento {index + 1}</CardTitle>
        {canRemove && (
          <button type="button" onClick={onRemove} className="text-destructive" title="Remover documento">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Tipo:</span>
          {ATESTADO_TIPO_OPTIONS.map((t) => (
            <Chip key={t.value} active={form.tipo === t.value} onClick={() => onChange({ tipo: t.value as AtestadoTipo })}>
              {t.label}
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Paciente" className="col-span-2">
            <Input value={form.paciente} onChange={(e) => onChange({ paciente: e.target.value })} />
          </Field>
          <Field label="Documento CPF/RG (opcional)">
            <Input value={form.documento} onChange={(e) => onChange({ documento: e.target.value })} />
          </Field>
          {isAcomp && (
            <Field label="Acompanhante">
              <Input value={form.acompanhante} onChange={(e) => onChange({ acompanhante: e.target.value })} />
            </Field>
          )}
        </div>

        <Field label="Motivo (opcional)">
          <Input
            value={form.motivo}
            onChange={(e) => onChange({ motivo: e.target.value })}
            placeholder={isAfast ? "ex.: repouso pós-procedimento" : "ex.: consulta médica"}
          />
        </Field>

        {isAfast && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Dias de afastamento">
              <Input
                value={form.dias}
                onChange={(e) => onChange({ dias: e.target.value.replace(/[^\d]/g, "") })}
                inputMode="numeric"
                placeholder="ex.: 3"
              />
            </Field>
            <Field label="A partir de">
              <Input type="date" value={form.inicio} onChange={(e) => onChange({ inicio: e.target.value })} />
            </Field>
          </div>
        )}

        {showHoras && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Horário de entrada">
              <Input type="time" value={form.horaInicio} onChange={(e) => onChange({ horaInicio: e.target.value })} />
            </Field>
            <Field label="Horário de saída">
              <Input type="time" value={form.horaFim} onChange={(e) => onChange({ horaFim: e.target.value })} />
            </Field>
          </div>
        )}

        <div className="space-y-2 rounded-md border p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={form.incluirCid}
              onChange={(e) => onChange({ incluirCid: e.target.checked })}
            />
            Incluir CID (com autorização do paciente)
          </label>
          {form.incluirCid && (
            <>
              <Field label="CID-10">
                <CidCombobox value={form.cid} onChange={(v) => onChange({ cid: v })} />
              </Field>
              <p className="text-[11px] text-muted-foreground">
                O documento registra que o CID foi informado <strong>com autorização da paciente</strong>.
              </p>
            </>
          )}
        </div>

        <Field label="Observações (opcional)">
          <Textarea rows={2} value={form.observacoes} onChange={(e) => onChange({ observacoes: e.target.value })} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Cidade">
            <Input value={form.cidade} onChange={(e) => onChange({ cidade: e.target.value })} />
          </Field>
          <Field label="Data">
            <Input type="date" value={form.data} onChange={(e) => onChange({ data: e.target.value })} />
          </Field>
        </div>
      </CardContent>
    </Card>
  );
}

export function AtestadoGenerator({
  today,
  patients = [],
}: {
  today: string;
  patients?: PacienteLite[];
}) {
  const [docs, setDocs] = useState<AtestadoForm[]>(() => [emptyAtestado(today, uid())]);

  const setDoc = (id: string, patch: Partial<AtestadoForm>) =>
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  const addDoc = () =>
    setDocs((ds) => {
      const last = ds[ds.length - 1];
      const novo = emptyAtestado(today, uid());
      // Herda a identidade e a data do documento anterior (mesma paciente/data).
      return [
        ...ds,
        last
          ? {
              ...novo,
              paciente: last.paciente,
              documento: last.documento,
              cidade: last.cidade,
              data: last.data,
              tipo: "ACOMPANHANTE",
            }
          : novo,
      ];
    });
  const removeDoc = (id: string) => setDocs((ds) => ds.filter((d) => d.id !== id));

  // Preenche a paciente (nome + documento) em todos os documentos.
  const fillFromPatient = (pid: string) => {
    const p = patients.find((x) => x.id === pid);
    if (!p) return;
    setDocs((ds) => ds.map((d) => ({ ...d, paciente: p.name ?? "", documento: p.medicalRecordNumber ?? "" })));
  };

  const text = useMemo(() => buildAtestadosText(docs), [docs]);

  const pdfMod = useRef<AtestadoPdfModule | null>(null);
  useEffect(() => {
    if (isMobile()) import("@/core/atestado/atestado-pdf").then((m) => (pdfMod.current = m));
  }, []);

  const handlePrint = () => {
    if (isMobile()) {
      if (pdfMod.current) pdfMod.current.downloadAtestadoPdf(docs);
      else import("@/core/atestado/atestado-pdf").then((m) => m.downloadAtestadoPdf(docs));
    } else {
      printHtml(buildAtestadoPrintHtml(docs));
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        {/* Ações */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="max-w-md text-xs text-muted-foreground">
            Apoio à documentação — valide e assine. O CID só deve constar com autorização do
            paciente (sigilo). Você pode emitir mais de um documento (ex.: atestado + acompanhante).
          </p>
          <div className="flex items-center gap-2">
            <CopyButton text={text} />
            <Button type="button" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Imprimir / PDF
            </Button>
          </div>
        </div>

        {patients.length > 0 && (
          <Card>
            <CardContent className="pt-4">
              <Field label="Preencher com paciente (opcional)">
                <select className={selectCls} defaultValue="" onChange={(e) => fillFromPatient(e.target.value)}>
                  <option value="">— selecione uma paciente do PSGO —</option>
                  {patients.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.medicalRecordNumber ? ` · ${p.medicalRecordNumber}` : ""}
                    </option>
                  ))}
                </select>
              </Field>
            </CardContent>
          </Card>
        )}

        {docs.map((d, i) => (
          <DocumentCard
            key={d.id}
            form={d}
            index={i}
            canRemove={docs.length > 1}
            onChange={(patch) => setDoc(d.id, patch)}
            onRemove={() => removeDoc(d.id)}
          />
        ))}

        <Button type="button" variant="outline" onClick={addDoc} className="w-full">
          <Plus className="h-4 w-4" /> Adicionar documento
        </Button>
      </div>

      {/* Prévia */}
      <div className="lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Prévia</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap break-words rounded bg-muted/40 p-3 text-sm">{text}</pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
