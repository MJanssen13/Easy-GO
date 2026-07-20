"use client";

import { memo, useMemo, useState } from "react";
import { Plus, Trash2, Pill, Printer } from "lucide-react";
import {
  emptyPrescricaoItem,
  renderReceita,
  receitaBlocos,
  buildPosologia,
  medicamentoLabel,
  TIPO_RECEITA_OPTIONS,
  TIPO_FREQUENCIA_OPTIONS,
  MEDIDA_TEMPO_OPTIONS,
  MOMENTO_OPTIONS,
  VIA_OPTIONS,
  UNIDADE_DOSE_OPTIONS,
  TURNO_OPTIONS,
  type PrescricaoItem,
  type ReceitaHeader,
  type TipoReceita,
  type TipoFrequencia,
  type MedidaTempo,
  type MomentoRefeicao,
} from "@/core/psgo/prescricao";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";
import { CATMAT_MEDS, medCatmatLabel } from "@/core/psgo/medicamentos-catmat";
import { printHtml } from "@/lib/print";

const selectCls =
  "flex h-9 w-full max-w-[11rem] rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

export function ReceitaGenerator({ today }: { today: string }) {
  const [header, setHeader] = useState<ReceitaHeader>({
    paciente: "",
    prontuario: "",
    idade: "",
    prescritor: "",
    crm: "",
    estabelecimento: "HC-UFTM",
    cidade: "Uberaba-MG",
    data: today,
  });
  const [items, setItems] = useState<PrescricaoItem[]>([emptyPrescricaoItem(uid())]);

  const setH = (patch: Partial<ReceitaHeader>) => setHeader((h) => ({ ...h, ...patch }));
  const addItem = () =>
    setItems((s) => [...s, emptyPrescricaoItem(uid(), s[s.length - 1]?.tipoReceita ?? "COMUM")]);
  const removeItem = (id: string) => setItems((s) => s.filter((i) => i.id !== id));
  const setItem = (id: string, patch: Partial<PrescricaoItem>) =>
    setItems((s) => s.map((i) => (i.id === id ? { ...i, ...patch } : i)));
  const toggleTurno = (id: string, value: string) =>
    setItems((s) =>
      s.map((i) =>
        i.id === id
          ? {
              ...i,
              turnos: i.turnos.includes(value)
                ? i.turnos.filter((t) => t !== value)
                : [...i.turnos, value],
            }
          : i,
      ),
    );

  // Preenche princípio ativo/concentração/forma/via/unidade a partir da lista.
  const pickMed = (id: string, label: string) => {
    const m = CATMAT_MEDS.find((x) => medCatmatLabel(x) === label);
    if (m)
      setItem(id, {
        principioAtivo: m.pa,
        concentracao: m.conc,
        formaFarmaceutica: m.forma,
        via: m.via,
        unidadeDose: m.unidade,
      });
  };

  const text = useMemo(() => renderReceita(header, items), [header, items]);

  const handlePrint = () => {
    const blocos = receitaBlocos(header, items);
    if (blocos.length) printHtml(buildPrintHtml(blocos));
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-4">
        {/* Cabeçalho */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Identificação</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Paciente" className="col-span-2 sm:col-span-2">
              <Input value={header.paciente} onChange={(e) => setH({ paciente: e.target.value })} />
            </Field>
            <Field label="Prontuário/RG">
              <Input value={header.prontuario} onChange={(e) => setH({ prontuario: e.target.value })} />
            </Field>
            <Field label="Idade">
              <Input value={header.idade} onChange={(e) => setH({ idade: e.target.value })} />
            </Field>
            <Field label="Prescritor">
              <Input value={header.prescritor} onChange={(e) => setH({ prescritor: e.target.value })} />
            </Field>
            <Field label="CRM">
              <Input value={header.crm} onChange={(e) => setH({ crm: e.target.value })} />
            </Field>
            <Field label="Estabelecimento">
              <Input
                value={header.estabelecimento}
                onChange={(e) => setH({ estabelecimento: e.target.value })}
              />
            </Field>
            <Field label="Cidade">
              <Input value={header.cidade} onChange={(e) => setH({ cidade: e.target.value })} />
            </Field>
            <Field label="Data">
              <Input type="date" value={header.data} onChange={(e) => setH({ data: e.target.value })} />
            </Field>
          </CardContent>
        </Card>

        {/* Itens */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base">Medicamentos</CardTitle>
            <Button type="button" size="sm" variant="outline" onClick={addItem}>
              <Plus className="h-4 w-4" /> Medicamento
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {items.map((it, idx) => (
              <div key={it.id} className="space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-primary">{idx + 1}º medicamento</span>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(it.id)}
                      className="text-destructive"
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Tipo de receita */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Receita:</span>
                  {TIPO_RECEITA_OPTIONS.map((t) => (
                    <Chip
                      key={t.value}
                      active={it.tipoReceita === t.value}
                      onClick={() => setItem(it.id, { tipoReceita: t.value as TipoReceita })}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>

                {/* Busca na lista CATMAT (preenche princípio/concentração/forma) */}
                <Field label="Buscar medicamento (lista CATMAT)">
                  <Input
                    list="catmat-meds"
                    placeholder="digite e escolha para preencher…"
                    onChange={(e) => {
                      pickMed(it.id, e.target.value);
                      if (CATMAT_MEDS.some((m) => medCatmatLabel(m) === e.target.value))
                        e.target.value = "";
                    }}
                  />
                </Field>

                {/* Medicamento */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Field label="Princípio ativo" className="col-span-2">
                    <Input
                      value={it.principioAtivo}
                      onChange={(e) => setItem(it.id, { principioAtivo: e.target.value })}
                    />
                  </Field>
                  <Field label="Concentração">
                    <Input
                      value={it.concentracao}
                      onChange={(e) => setItem(it.id, { concentracao: e.target.value })}
                    />
                  </Field>
                  <Field label="Forma farmac.">
                    <Input
                      value={it.formaFarmaceutica}
                      onChange={(e) => setItem(it.id, { formaFarmaceutica: e.target.value })}
                    />
                  </Field>
                </div>

                {/* Registro: estruturado ou manual */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-muted-foreground">Posologia:</span>
                  <Chip active={!it.registroManual} onClick={() => setItem(it.id, { registroManual: false })}>
                    Estruturada
                  </Chip>
                  <Chip active={it.registroManual} onClick={() => setItem(it.id, { registroManual: true })}>
                    Texto livre
                  </Chip>
                </div>

                {it.registroManual ? (
                  <Field label="Posologia (livre)">
                    <Textarea
                      rows={2}
                      value={it.posologiaManual}
                      onChange={(e) => setItem(it.id, { posologiaManual: e.target.value })}
                      placeholder="ex.: 1 comprimido, via oral, de 8/8h, por 7 dias"
                    />
                  </Field>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Field label="Dose">
                      <Input
                        value={it.qtDose}
                        onChange={(e) => setItem(it.id, { qtDose: e.target.value })}
                        inputMode="decimal"
                      />
                    </Field>
                    <Field label="Unidade">
                      <select
                        className={selectCls}
                        value={it.unidadeDose}
                        onChange={(e) => setItem(it.id, { unidadeDose: e.target.value })}
                      >
                        {UNIDADE_DOSE_OPTIONS.map((u) => (
                          <option key={u.value} value={u.value}>
                            {u.value}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Via">
                      <select
                        className={selectCls}
                        value={it.via}
                        onChange={(e) => setItem(it.id, { via: e.target.value })}
                      >
                        {VIA_OPTIONS.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Frequência">
                      <select
                        className={selectCls}
                        value={it.tipoFrequencia}
                        onChange={(e) =>
                          setItem(it.id, { tipoFrequencia: e.target.value as TipoFrequencia })
                        }
                      >
                        {TIPO_FREQUENCIA_OPTIONS.map((f) => (
                          <option key={f.value} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </Field>

                    {/* Campo condicional da frequência */}
                    {it.tipoFrequencia === "INTERVALO" && (
                      <Field label="A cada (horas)">
                        <Input
                          value={it.intervaloHoras}
                          onChange={(e) => setItem(it.id, { intervaloHoras: e.target.value })}
                          inputMode="numeric"
                        />
                      </Field>
                    )}
                    {it.tipoFrequencia === "FREQUENCIA" && (
                      <Field label="Vezes ao dia">
                        <Input
                          value={it.vezesAoDia}
                          onChange={(e) => setItem(it.id, { vezesAoDia: e.target.value })}
                          inputMode="numeric"
                        />
                      </Field>
                    )}
                    {it.tipoFrequencia === "TURNO" && (
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs text-muted-foreground">Turnos</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {TURNO_OPTIONS.map((t) => (
                            <Chip
                              key={t.value}
                              active={it.turnos.includes(t.value)}
                              onClick={() => toggleTurno(it.id, t.value)}
                            >
                              {t.value}
                            </Chip>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Duração (exceto contínuo/única) */}
                    {it.tipoFrequencia !== "CONTINUO" && it.tipoFrequencia !== "UNICA" && (
                      <>
                        <Field label="Duração">
                          <Input
                            value={it.duracaoQt}
                            onChange={(e) => setItem(it.id, { duracaoQt: e.target.value })}
                            inputMode="numeric"
                          />
                        </Field>
                        <Field label="Período">
                          <select
                            className={selectCls}
                            value={it.duracaoUnidade}
                            onChange={(e) =>
                              setItem(it.id, { duracaoUnidade: e.target.value as MedidaTempo })
                            }
                          >
                            {MEDIDA_TEMPO_OPTIONS.map((m) => (
                              <option key={m.value} value={m.value}>
                                {m.label}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </>
                    )}

                    <Field label="Momento">
                      <select
                        className={selectCls}
                        value={it.momento}
                        onChange={(e) =>
                          setItem(it.id, { momento: e.target.value as MomentoRefeicao })
                        }
                      >
                        {MOMENTO_OPTIONS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}

                {/* Fechamento do item */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Quantidade a dispensar">
                    <Input
                      value={it.quantidadeReceitada}
                      onChange={(e) => setItem(it.id, { quantidadeReceitada: e.target.value })}
                      placeholder="ex.: 20 comprimidos"
                    />
                  </Field>
                  <Field label="Recomendações">
                    <Input
                      value={it.recomendacoes}
                      onChange={(e) => setItem(it.id, { recomendacoes: e.target.value })}
                    />
                  </Field>
                </div>

                {/* Prévia da posologia deste item */}
                <p className="rounded bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
                  {buildPreview(it)}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Prévia */}
      <div className="lg:sticky lg:top-20 lg:h-fit">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4 text-primary" /> Receita
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handlePrint}
                disabled={!text}
              >
                <Printer className="h-4 w-4" /> Imprimir / PDF
              </Button>
              <CopyButton text={text} />
            </div>
          </CardHeader>
          <CardContent>
            <pre className="prontuario-text max-h-[70vh] overflow-y-auto text-xs">
              {text || "Preencha ao menos um medicamento."}
            </pre>
          </CardContent>
        </Card>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Apoio à documentação — a equipe valida medicamento, dose e posologia. Prescrição digital
          assinada (código/validação) não é gerada aqui.
        </p>
      </div>

      {/* Lista compartilhada para busca de medicamentos (CATMAT) */}
      <CatmatDatalist />
    </div>
  );
}

// Datalist do CATMAT (~2,9 mil itens) — memoizada para renderizar só uma vez.
const CatmatDatalist = memo(function CatmatDatalist() {
  return (
    <datalist id="catmat-meds">
      {CATMAT_MEDS.map((m) => (
        <option key={`${m.pa}|${m.conc}|${m.forma}`} value={medCatmatLabel(m)} />
      ))}
    </datalist>
  );
});

// Prévia curta da posologia de um item (usa o mesmo builder do core).
function buildPreview(it: PrescricaoItem): string {
  const med = medicamentoLabel(it);
  const pos = buildPosologia(it);
  if (!med && !pos) return "Comece pelo princípio ativo.";
  return [med, pos].filter(Boolean).join(" — ") || "—";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// HTML paginado para impressão: uma folha por via (controle especial = 2 vias).
function buildPrintHtml(blocos: ReturnType<typeof receitaBlocos>): string {
  const pages: string[] = [];
  for (const b of blocos) {
    for (let via = 1; via <= b.vias; via++) {
      const viaLabel =
        b.vias > 1 ? `${via}ª VIA — ${via === 1 ? "FARMÁCIA" : "PACIENTE"}` : "";
      pages.push(
        `<div class="page">${viaLabel ? `<div class="via">${viaLabel}</div>` : ""}<pre>${escapeHtml(b.text)}</pre></div>`,
      );
    }
  }
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Receita</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { margin: 0; color: #000; font-family: -apple-system, "Segoe UI", Arial, sans-serif; font-size: 12pt; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  .via { font-size: 9pt; font-weight: 700; letter-spacing: .06em; color: #333; border-bottom: 1px solid #999; padding-bottom: 3mm; margin-bottom: 6mm; }
  pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: 12pt; line-height: 1.5; margin: 0; }
</style></head><body>${pages.join("")}</body></html>`;
}
