"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { Observation } from "@/core/patients/types";

interface Point {
  time: number;
  bcf?: number;
  dilation?: number;
  systolic?: number;
  diastolic?: number;
  standingSystolic?: number;
  standingDiastolic?: number;
}

function hhmm(t: number): string {
  return new Date(t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded border bg-white p-2 text-xs shadow-md">
      <p className="mb-1 font-bold">{hhmm(label)}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

export function VitalCharts({ observations }: { observations: Observation[] }) {
  const data: Point[] = observations
    .map((o) => ({
      time: new Date(o.recordedAt).getTime(),
      bcf: o.obstetric.bcf,
      dilation: o.obstetric.dilation,
      systolic: o.vitals.paSystolic,
      diastolic: o.vitals.paDiastolic,
      standingSystolic: o.vitals.paStandingSystolic,
      standingDiastolic: o.vitals.paStandingDiastolic,
    }))
    .filter((p) => !Number.isNaN(p.time))
    .sort((a, b) => a.time - b.time);

  const hasBcf = data.some((d) => d.bcf != null || d.dilation != null);
  const hasPa = data.some((d) => d.systolic != null || d.standingSystolic != null);

  if (data.length < 2 || (!hasBcf && !hasPa)) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Dados insuficientes para gráficos (mínimo de 2 registros).
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {hasBcf && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">BCF e dilatação</h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} tickFormatter={hhmm} stroke="#94a3b8" />
                <YAxis yAxisId="l" domain={[60, 200]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <YAxis yAxisId="r" orientation="right" domain={[0, 10]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={110} yAxisId="l" stroke="#ef4444" strokeDasharray="3 3" opacity={0.4} />
                <ReferenceLine y={160} yAxisId="l" stroke="#ef4444" strokeDasharray="3 3" opacity={0.4} />
                <Line
                  yAxisId="l"
                  type="monotone"
                  dataKey="bcf"
                  name="BCF (bpm)"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  yAxisId="r"
                  type="stepAfter"
                  dataKey="dilation"
                  name="Dilatação (cm)"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {hasPa && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Pressão arterial (mmHg)</h4>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 5, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} tickFormatter={hhmm} stroke="#94a3b8" />
                <YAxis domain={[40, 180]} tick={{ fontSize: 10 }} stroke="#94a3b8" />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="plainline" wrapperStyle={{ fontSize: "11px" }} />
                <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" opacity={0.4} />
                <ReferenceLine y={90} stroke="#f59e0b" strokeDasharray="3 3" opacity={0.4} />
                <Line type="monotone" dataKey="systolic" name="PAS" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="diastolic" name="PAD" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line
                  type="monotone"
                  dataKey="standingSystolic"
                  name="PAS em pé"
                  stroke="#d97706"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="standingDiastolic"
                  name="PAD em pé"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ r: 3 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
