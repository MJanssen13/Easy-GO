"use client";

/**
 * Gráficos de apoio do pré-natal:
 *  - IMC: faixas de classificação (OMS/MS: < 18,5 baixo peso; 18,5–24,9 adequado;
 *    25–29,9 sobrepeso; ≥ 30 obesidade) com o IMC atual marcado.
 *  - Altura uterina × IG: linha de referência da regra prática (AU em cm ≈ IG em
 *    semanas, de ~20 a ~34 sem — MS/Febrasgo) e o ponto medido.
 *
 * Apoio à decisão — validar. A curva gestacional de IMC (Atalah) e a curva de
 * altura uterina P10/P90 (CLAP, usada na Caderneta da Gestante do MS) devem ser
 * inseridas a partir da tabela oficial; não são reproduzidas aqui para não
 * fabricar coeficientes.
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { parseDecimal } from "@/lib/num";

const IMC_ZONES = [
  { label: "Baixo peso", from: 12, to: 18.5, color: "#93c5fd" },
  { label: "Adequado", from: 18.5, to: 25, color: "#86efac" },
  { label: "Sobrepeso", from: 25, to: 30, color: "#fde047" },
  { label: "Obesidade", from: 30, to: 40, color: "#fca5a5" },
];
const IMC_MIN = 12;
const IMC_MAX = 40;

function imcCategory(imc: number): string {
  if (imc < 18.5) return "baixo peso";
  if (imc < 25) return "adequado";
  if (imc < 30) return "sobrepeso";
  return "obesidade";
}

function ImcChart({ imc }: { imc: number }) {
  const pct = (v: number) => `${((Math.min(Math.max(v, IMC_MIN), IMC_MAX) - IMC_MIN) / (IMC_MAX - IMC_MIN)) * 100}%`;
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold">IMC atual</span>
        <span className="text-sm font-bold tabular-nums">
          {imc} <span className="text-xs font-normal text-muted-foreground">kg/m² ({imcCategory(imc)})</span>
        </span>
      </div>
      <div className="relative mt-2 h-4 w-full overflow-hidden rounded-full">
        {IMC_ZONES.map((z) => (
          <div
            key={z.label}
            className="absolute top-0 h-full"
            style={{ left: pct(z.from), width: `${((z.to - z.from) / (IMC_MAX - IMC_MIN)) * 100}%`, background: z.color }}
            title={`${z.label} (${z.from}–${z.to})`}
          />
        ))}
        <div
          className="absolute top-[-2px] h-[20px] w-[2px] bg-foreground"
          style={{ left: pct(imc) }}
          aria-label={`IMC ${imc}`}
        />
      </div>
      <div className="mt-1 flex justify-between text-[9px] text-muted-foreground">
        <span>18,5</span>
        <span>25</span>
        <span>30</span>
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">Faixas OMS/MS · validar (curva de IMC gestacional de Atalah a inserir).</p>
    </div>
  );
}

function AuChart({ au, gaWeeks }: { au: number; gaWeeks: number }) {
  // Linha de referência da regra prática (AU ≈ IG entre 20 e 34 sem).
  const ref = [];
  for (let wk = 20; wk <= 34; wk++) ref.push({ ga: wk, au: wk });
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-semibold">Altura uterina × IG</span>
        <span className="text-sm font-bold tabular-nums">
          {au} <span className="text-xs font-normal text-muted-foreground">cm · {gaWeeks} sem</span>
        </span>
      </div>
      <div className="mt-1 h-[150px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ref} margin={{ top: 6, right: 8, bottom: 0, left: -24 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="ga" type="number" domain={[12, 40]} tick={{ fontSize: 10 }} tickCount={8} />
            <YAxis domain={[0, 40]} tick={{ fontSize: 10 }} />
            <Tooltip
              formatter={(v: number | string) => [`${v} cm`, "AU ≈ IG"]}
              labelFormatter={(l) => `${l} sem`}
              contentStyle={{ fontSize: 11 }}
            />
            <Line dataKey="au" dot={false} stroke="#0d9488" strokeWidth={2} isAnimationActive={false} />
            {gaWeeks >= 12 && gaWeeks <= 40 && (
              <ReferenceDot x={gaWeeks} y={au} r={5} fill="#e11d48" stroke="#fff" strokeWidth={1} />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground">
        Referência: regra prática AU≈IG (20–34 sem, MS/Febrasgo) · validar (curva P10/P90 do CLAP a inserir).
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
  const showAu = auNum != null && auNum > 0 && gaWeeks != null;
  if (!showImc && !showAu) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {showImc && <ImcChart imc={imc} />}
      {showAu && <AuChart au={auNum} gaWeeks={gaWeeks} />}
    </div>
  );
}
