"use client";

import { useEffect, useMemo, useState } from "react";
import { Printer } from "lucide-react";
import type { Observation, Patient } from "@/core/patients/types";
import {
  MODEL_COLUMNS,
  SHEET_MODELS,
  buildSheetLines,
  sheetHeader,
  type SheetModel,
} from "@/core/print/parameter-sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");
const isoDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Folha de parâmetros para impressão (A4), no modelo do HC-UFTM, preenchida
 * com as aferições registradas. Horas sem registro saem em branco para
 * preenchimento à mão à beira-leito.
 */
export function ParameterSheet({
  patient,
  observations,
  unit = "Ginecologia e Obstetrícia",
}: {
  patient: Patient;
  observations: Observation[];
  unit?: string;
}) {
  // Padrão: começa na hora da 1ª aferição de hoje (ou 07h), 24 linhas.
  const today = new Date();
  const todays = observations
    .map((o) => new Date(o.recordedAt))
    .filter((d) => isoDay(d) === isoDay(today))
    .sort((a, b) => a.getTime() - b.getTime());
  const [model, setModel] = useState<SheetModel>(patient.useMagnesiumSulfate ? "mgso4" : "vitais");
  const [day, setDay] = useState(isoDay(today));
  const [startHour, setStartHour] = useState(todays[0]?.getHours() ?? 7);
  const [hours, setHours] = useState(24);

  // Datas só no cliente (fuso do aparelho), evitando diferença de hidratação.
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const start = useMemo(() => {
    const [y, m, d] = day.split("-").map(Number);
    return new Date(y!, (m ?? 1) - 1, d ?? 1, startHour, 0, 0, 0);
  }, [day, startHour]);
  const lines = useMemo(() => buildSheetLines(observations, start, hours, model), [observations, start, hours, model]);
  const head = sheetHeader(patient, start);
  const cols = MODEL_COLUMNS[model];
  const title = SHEET_MODELS.find((m) => m.id === model)!.title;
  const grid = `3.2rem ${cols.map((c) => `${c.w}fr`).join(" ")}`;
  const filled = lines.filter((l) => Object.values(l.cells).some(Boolean)).length;

  return (
    <div className="space-y-4">
      {/* Controles (não imprimem) */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4 print:hidden">
        <label className="space-y-1">
          <span className="field-label block">Modelo</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value as SheetModel)}
            className="h-10 rounded-xl border bg-white px-3 text-sm"
          >
            {SHEET_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="field-label block">Data</span>
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className="h-10 rounded-xl border px-3 text-sm" />
        </label>
        <label className="space-y-1">
          <span className="field-label block">Começa às</span>
          <select
            value={startHour}
            onChange={(e) => setStartHour(Number(e.target.value))}
            className="h-10 rounded-xl border bg-white px-3 text-sm"
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {pad(h)}h
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1">
          <span className="field-label block">Linhas</span>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))} className="h-10 rounded-xl border bg-white px-3 text-sm">
            {[12, 21, 24].map((n) => (
              <option key={n} value={n}>
                {n} horas
              </option>
            ))}
          </select>
        </label>
        <Button type="button" onClick={() => window.print()} className="ml-auto">
          <Printer /> Imprimir
        </Button>
        <p className="w-full text-xs text-muted-foreground">
          {filled} hora(s) com aferição registrada; as demais saem em branco para preencher à mão. Várias aferições na
          mesma hora aparecem separadas por “/”; a hora exata vai em Observações.
        </p>
      </div>

      {/* Folha A4 */}
      <div className="overflow-x-auto print:overflow-visible">
        <article className="param-sheet mx-auto w-[210mm] min-w-[210mm] bg-white p-[8mm] text-[11px] leading-tight text-black shadow-card ring-1 ring-border print:shadow-none print:ring-0">
          {/* Cabeçalho institucional */}
          <header className="grid grid-cols-[5.5rem_1fr_11rem] border border-black">
            <div className="flex items-center justify-center border-r border-black p-1 text-center">
              <span className="text-[15px] font-black tracking-tight">UFTM</span>
            </div>
            <div className="flex items-center justify-center px-2 py-3 text-center text-[16px] font-bold">{title}</div>
            <div className="flex flex-col items-center justify-center border-l border-black px-2 py-1 text-center">
              <span className="text-[12px] font-bold">HOSPITAL DE CLÍNICAS</span>
              <span className="text-[11px]">{unit}</span>
            </div>
          </header>

          {/* Identificação */}
          <section className="mt-2 border border-black">
            <Row cells={[["Paciente", head.name, 3], ["RG", head.rg, 1]]} />
            <Row cells={[["Idade", head.age, 1], ["Paridade", head.parity, 1], ["Tipo Sanguíneo", head.bloodType, 2]]} />
            <Row cells={[["Classificação de Robson", head.robson, 1.5], ["Comorbidades", head.comorbidities, 2.5]]} />
            <Row
              last
              cells={[
                ["Idade Gestacional (US)", head.usGa, 2],
                ["Idade Gestacional (DUM)", head.dumGa, 2],
              ]}
            />
          </section>

          <p className="mt-2 text-center text-[12px] font-semibold">
            Data: {ready ? `${pad(start.getDate())}/${pad(start.getMonth() + 1)}/${String(start.getFullYear()).slice(-2)}` : ""}
            {head.bed && <span className="ml-4">Leito: {head.bed}</span>}
          </p>

          {/* Tabela por hora */}
          <div className="mt-1 border border-black">
            <div className="grid border-b border-black text-center font-semibold" style={{ gridTemplateColumns: grid }}>
              <div className="flex items-center justify-center border-r border-black p-1">Hora</div>
              {cols.map((c, i) => (
                <div
                  key={c.key}
                  className={cn("flex items-center justify-center p-1", i < cols.length - 1 && "border-r border-black")}
                >
                  {c.label}
                </div>
              ))}
            </div>
            {lines.map((l, i) => {
              const nextDay = i > 0 && l.at.getDate() !== lines[i - 1]!.at.getDate();
              return (
                <div
                  key={i}
                  className={cn("grid", i < lines.length - 1 && "border-b border-black", nextDay && "border-t-2")}
                  style={{ gridTemplateColumns: grid, minHeight: hours > 21 ? "7.9mm" : hours > 12 ? "9mm" : "12mm" }}
                >
                  <div className="flex items-center justify-center border-r border-black text-[13px] font-semibold">
                    {pad(l.hour)}h
                  </div>
                  {cols.map((c, j) => (
                    <div
                      key={c.key}
                      className={cn(
                        "flex items-center px-1 py-0.5",
                        c.key === "obs" || c.key === "toque" ? "justify-start text-[10px]" : "justify-center text-center",
                        j < cols.length - 1 && "border-r border-black",
                      )}
                    >
                      {l.cells[c.key]}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </div>
  );
}

function Row({ cells, last }: { cells: [string, string, number][]; last?: boolean }) {
  return (
    <div
      className={cn("grid", !last && "border-b border-black")}
      style={{ gridTemplateColumns: cells.map((c) => `${c[2]}fr`).join(" ") }}
    >
      {cells.map(([label, value], i) => (
        <div key={label} className={cn("flex items-baseline gap-1 px-1.5 py-1", i < cells.length - 1 && "border-r border-black")}>
          <span className="shrink-0 font-semibold">{label}:</span>
          <span className="min-w-0 truncate text-[12px]">{value}</span>
        </div>
      ))}
    </div>
  );
}
