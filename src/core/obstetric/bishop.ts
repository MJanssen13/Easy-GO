/**
 * Índice de Bishop — avaliação da maturidade cervical para indução do parto.
 *
 * Pontuação (0–13), somando 5 componentes:
 *   Dilatação (cm):  0 → 0 | 1–2 → 1 | 3–4 → 2 | ≥5 → 3
 *   Esvaecimento (%):≤30 → 0 | 40–50 → 1 | 60–70 → 2 | ≥80 → 3
 *   Altura (De Lee): ≤-3 → 0 | -2 → 1 | -1/0 → 2 | ≥+1 → 3
 *   Consistência:    firme → 0 | média → 1 | amolecida → 2
 *   Posição:         posterior → 0 | intermediária → 1 | anterior → 2
 *
 * Interpretação: ≥7 colo favorável · 5–6 intermediário · ≤4 desfavorável.
 * APOIO À DECISÃO — validar com a equipe.
 */

export type CervixConsistency = "nasal" | "nasolabial" | "labial";
export type CervixPosition = "posterior" | "intermediate" | "central";

export interface BishopInput {
  dilation?: number | null; // cm
  effacement?: number | null; // %
  station?: number | null; // De Lee
  consistency?: CervixConsistency | null;
  position?: CervixPosition | null;
}

export interface BishopResult {
  total: number;
  components: {
    dilation: number;
    effacement: number;
    station: number;
    consistency: number;
    position: number;
  };
  /** True quando os 5 componentes foram informados. */
  complete: boolean;
}

function dilationPts(cm: number): number {
  if (cm >= 5) return 3;
  if (cm >= 3) return 2;
  if (cm >= 1) return 1;
  return 0;
}

function effacementPts(pct: number): number {
  if (pct >= 80) return 3;
  if (pct >= 60) return 2;
  if (pct >= 40) return 1;
  return 0;
}

function stationPts(deLee: number): number {
  if (deLee >= 1) return 3; // +1 / +2
  if (deLee >= -1) return 2; // -1 / 0
  if (deLee === -2) return 1;
  return 0; // ≤ -3
}

function consistencyPts(c: CervixConsistency): number {
  if (c === "labial") return 2; // amolecida
  if (c === "nasolabial") return 1; // média
  return 0; // nasal / firme
}

function positionPts(p: CervixPosition): number {
  if (p === "central") return 2; // anterior / centralizado
  if (p === "intermediate") return 1;
  return 0; // posterior
}

export function bishopScore(input: BishopInput): BishopResult {
  const dilation = input.dilation != null ? dilationPts(input.dilation) : 0;
  const effacement = input.effacement != null ? effacementPts(input.effacement) : 0;
  const station = input.station != null ? stationPts(input.station) : 0;
  const consistency = input.consistency ? consistencyPts(input.consistency) : 0;
  const position = input.position ? positionPts(input.position) : 0;

  const complete =
    input.dilation != null &&
    input.effacement != null &&
    input.station != null &&
    !!input.consistency &&
    !!input.position;

  return {
    total: dilation + effacement + station + consistency + position,
    components: { dilation, effacement, station, consistency, position },
    complete,
  };
}

export function bishopInterpretation(total: number): string {
  if (total >= 7) return "colo favorável";
  if (total >= 5) return "intermediário";
  return "colo desfavorável";
}
