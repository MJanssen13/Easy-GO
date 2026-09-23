"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Check, Loader2, Printer } from "lucide-react";
import type { Observation } from "@/core/patients/types";
import { emptyLcg, type PartogramData, type PartogramModel, type UftmHeader } from "@/core/partogram/types";
import { deriveLcgFirst, deriveLcgSecond, deriveUftm } from "@/core/partogram/derive";
import { isNulliparous } from "@/core/partogram/lcg";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { savePartogram } from "../partogram-actions";
import { PartogramLcg } from "./partogram-lcg";
import { PartogramUftm, emptyTable, type UftmManual } from "./partogram-uftm";

export interface PartogramPatient {
  id: string;
  name: string;
  medicalRecordNumber?: string | null;
  age?: number | null;
  parity?: string | null;
  bloodType?: string | null;
  babyName?: string | null;
  lmp?: string | null;
  edd?: string | null;
  gaLabel?: string | null;
  usGa?: string | null;
}

function br(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("pt-BR");
}

function bloodTypeLong(v?: string | null): string {
  return (v ?? "").toUpperCase().replace(/\+/g, " POSITIVO").replace(/-/g, " NEGATIVO");
}

export function PartogramWorkspace({
  patient,
  initial,
  observations,
}: {
  patient: PartogramPatient;
  initial: PartogramData;
  observations: Observation[];
}) {
  const openedAt = initial.openedAt!;
  const [model, setModel] = useState<PartogramModel>(initial.model ?? "oms");
  const [lcg, setLcg] = useState(initial.lcg ?? emptyLcg());
  const [uftm, setUftm] = useState<UftmManual>(() => {
    const header: UftmHeader = {
      date: br(openedAt),
      id: patient.medicalRecordNumber ?? "",
      name: patient.name,
      age: patient.age != null ? String(patient.age) : "",
      dum: br(patient.lmp),
      dpp: br(patient.edd),
      ig: patient.gaLabel ?? "",
      us: patient.usGa ?? "",
      parity: patient.parity ?? "",
      bloodType: bloodTypeLong(patient.bloodType),
      babyName: patient.babyName ?? "",
      ...(initial.headerData ?? {}),
    };
    return {
      points: initial.points ?? [],
      contractionBlocks: initial.contractionBlocks ?? [],
      tableData: initial.tableData?.length ? initial.tableData : emptyTable(),
      activePhaseStartIndex: initial.activePhaseStartIndex,
      headerData: header,
      observations: initial.observations ?? "",
    };
  });

  const autoUftm = useMemo(() => deriveUftm(observations, openedAt), [observations, openedAt]);
  const autoFirst = useMemo(() => deriveLcgFirst(observations, openedAt), [observations, openedAt]);
  const autoSecond = useMemo(() => deriveLcgSecond(observations, lcg.secondStageAt), [observations, lcg.secondStageAt]);

  // Salvamento automático (1,5 s após a última alteração).
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [, start] = useTransition();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setState("saving");
    const t = setTimeout(() => {
      start(async () => {
        const res = await savePartogram(patient.id, {
          version: 2,
          model,
          openedAt,
          startTime: openedAt,
          points: uftm.points,
          contractionBlocks: uftm.contractionBlocks,
          tableData: uftm.tableData,
          activePhaseStartIndex: uftm.activePhaseStartIndex,
          headerData: uftm.headerData,
          observations: uftm.observations,
          lcg,
        });
        setState(res.error ? "error" : "saved");
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [model, lcg, uftm, patient.id, openedAt]);

  return (
    <div className="space-y-4">
      <style>{`@media print { @page { size: A4 ${model === "oms" ? "landscape" : "portrait"}; margin: ${model === "oms" ? "8mm" : "0"}; } }`}</style>
      <div className="flex flex-wrap items-center gap-2 print:hidden">
        <div className="inline-flex rounded-lg bg-muted p-1">
          {(
            [
              ["oms", "OMS — Labour Care Guide (2020)"],
              ["uftm", "Ficha HC-UFTM (modelo antigo)"],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setModel(m)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", model === m ? "bg-background shadow-sm" : "text-muted-foreground")}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          Os dois modelos usam as mesmas aferições — troque à vontade.
        </span>
        <span className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {state === "saving" ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Salvando…
              </span>
            ) : state === "saved" ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <Check className="h-3 w-3" /> Salvo
              </span>
            ) : state === "error" ? (
              <span className="text-rose-700">Erro ao salvar</span>
            ) : null}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Imprimir
          </Button>
        </span>
      </div>

      {model === "oms" ? (
        <PartogramLcg
          openedAt={openedAt}
          data={lcg}
          autoFirst={autoFirst}
          autoSecond={autoSecond}
          nulliparous={isNulliparous(patient.parity)}
          onChange={setLcg}
        />
      ) : (
        <PartogramUftm manual={uftm} auto={autoUftm} onChange={setUftm} />
      )}
    </div>
  );
}
