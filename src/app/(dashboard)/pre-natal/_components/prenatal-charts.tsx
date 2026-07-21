"use client";

/**
 * Gráficos do pré-natal, com as curvas oficiais/publicadas (ver `ms-curves.ts`):
 *  - IMC × IG: curva de Atalah (MS/SISVAN) — faixas baixo peso/adequado/
 *    sobrepeso/obesidade por semana gestacional, com o IMC atual plotado.
 *  - Altura uterina × IG: percentis 10 e 90 (Freire et al., RBGO 2006), com a
 *    AU medida plotada.
 *
 * Apoio à decisão — validar.
 */
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { parseDecimal } from "@/lib/num";
import { ATALAH_IMC, AU_PERCENTILES, classifyAtalah } from "@/core/prenatal/ms-curves";

const IMC_TOP = 36;
const imcData = ATALAH_IMC.map((r) => ({
  wk: r.wk,
  bp: r.aLow, // baixo peso: 0 → aLow
  a: Math.round((r.sLow - r.aLow) * 10) / 10, // adequado
  s: Math.round((r.o - r.sLow) * 10) / 10, // sobrepeso
  ob: Math.round((IMC_TOP - r.o) * 10) / 10, // obesidade (até o topo)
}));

const auData = AU_PERCENTILES.map((r) => ({
  wk: r.wk,
  p10: r.p10,
  band: Math.round((r.p90 - r.p10) * 10) / 10,
  p90: r.p90,
}));

function ImcChart({ imc, gaWeeks }: { imc: number; gaWeeks: number | null }) {
  const cat = classifyAtalah(imc, gaWeeks);
  const inRange = gaWeeks != null && gaWeeks >= 6 && gaWeeks <= 42;
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold">IMC × IG (Atalah)</span>
        <span className="text-sm font-bold tabular-nums">
          {imc}
          <span className="text-xs font-normal text-muted-foreground"> kg/m²{cat ? ` · ${cat}` : ""}</span>
        </span>
      </div>
      <div className="mt-1 h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={imcData} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="wk" type="number" domain={[6, 42]} tick={{ fontSize: 10 }} tickCount={7} />
            <YAxis domain={[16, IMC_TOP]} tick={{ fontSize: 10 }} allowDataOverflow />
            <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(l) => `${l} sem`} />
            <Area dataKey="bp" stackId="z" stroke="none" fill="#bfdbfe" fillOpacity={0.7} name="baixo peso" isAnimationActive={false} />
            <Area dataKey="a" stackId="z" stroke="none" fill="#bbf7d0" fillOpacity={0.7} name="adequado" isAnimationActive={false} />
            <Area dataKey="s" stackId="z" stroke="none" fill="#fef08a" fillOpacity={0.7} name="sobrepeso" isAnimationActive={false} />
            <Area dataKey="ob" stackId="z" stroke="none" fill="#fecaca" fillOpacity={0.7} name="obesidade" isAnimationActive={false} />
            {inRange && <ReferenceDot x={Math.round(gaWeeks!)} y={imc} r={5} fill="#1e293b" stroke="#fff" strokeWidth={1.5} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Faixas: baixo peso / adequado / sobrepeso / obesidade. Fonte: MS/SISVAN (Atalah 1997) · validar.
        {!inRange && " Informe a IG (6–42 sem) para plotar o ponto."}
      </p>
    </div>
  );
}

function AuChart({ au, gaWeeks }: { au: number; gaWeeks: number | null }) {
  const inRange = gaWeeks != null && gaWeeks >= 13 && gaWeeks <= 39;
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold">Altura uterina × IG</span>
        <span className="text-sm font-bold tabular-nums">
          {au} <span className="text-xs font-normal text-muted-foreground">cm{gaWeeks != null ? ` · ${gaWeeks} sem` : ""}</span>
        </span>
      </div>
      <div className="mt-1 h-[160px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={auData} margin={{ top: 6, right: 8, bottom: 0, left: -22 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="wk" type="number" domain={[13, 40]} tick={{ fontSize: 10 }} tickCount={7} />
            <YAxis domain={[0, 40]} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ fontSize: 11 }} labelFormatter={(l) => `${l} sem`} />
            <Area dataKey="p10" stackId="b" stroke="none" fill="transparent" isAnimationActive={false} />
            <Area dataKey="band" stackId="b" stroke="none" fill="#99f6e4" fillOpacity={0.6} name="P10–P90" isAnimationActive={false} />
            <Line dataKey="p10" dot={false} stroke="#0d9488" strokeWidth={1.5} name="P10" isAnimationActive={false} />
            <Line dataKey="p90" dot={false} stroke="#0d9488" strokeWidth={1.5} name="P90" isAnimationActive={false} />
            {inRange && <ReferenceDot x={Math.round(gaWeeks!)} y={au} r={5} fill="#e11d48" stroke="#fff" strokeWidth={1.5} />}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Banda P10–P90 (baixo risco). Fonte: Freire et al., RBGO 2006 · validar.
        {!inRange && " Ponto plotado entre 13–39 sem."}
      </p>
    </div>
  );
}

export function PrenatalCharts({
  weight,
  height,
  au,
  gaWeeks,
}: {
  weight: string;
  height: string;
  au: string;
  gaWeeks: number | null;
}) {
  const w = parseDecimal(weight);
  const h = parseDecimal(height);
  const imc = w && h && h > 0 ? Math.round((w / (h * h)) * 10) / 10 : null;
  const auNum = parseDecimal(au);

  const showImc = imc != null;
  const showAu = auNum != null && auNum > 0;
  if (!showImc && !showAu) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {showImc && <ImcChart imc={imc} gaWeeks={gaWeeks} />}
      {showAu && <AuChart au={auNum} gaWeeks={gaWeeks} />}
    </div>
  );
}
