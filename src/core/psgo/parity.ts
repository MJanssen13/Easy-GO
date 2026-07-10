/**
 * Paridade obstétrica (convenção HC-UFTM), no formato:
 *   G{g}P{p}(N.C.F.A.(E.)  …anotações de gemelaridade)
 *
 * - G: gestações totais (inclui a atual quando gestante).
 * - P: partos = N + C + F + A (nesta convenção o aborto também soma em P).
 * - N/C/F: partos normal / cesárea / fórceps.
 * - A: abortos; E: ectópicas (a ectópica conta como aborto → A inclui E).
 * - Gemelar = 1 gestação. Via vaginal conta 1 parto por feto; via cesárea
 *   conta 1 parto para os dois. Ex.: G3P3(N2C1(GEM2[C1N1])).
 *
 * OBS.: difere do padrão internacional (GPA/GTPAL), em que "Para" exclui
 * abortos e uma gestação múltipla conta como 1 parto. Mantido conforme a
 * convenção do serviço.
 */

export type PriorPregnancyType = "N" | "F" | "C" | "A" | "E";
export type TwinRoute = "N" | "C";

export interface PriorPregnancy {
  id: string;
  type: PriorPregnancyType;
  /** Gestação gemelar (só para partos N/C). */
  twin?: boolean;
  /** Via de parto por feto quando gemelar; padrão ["N","N"]. */
  twinRoutes?: TwinRoute[];
  year?: string;
  note?: string;
}

export const PRIOR_TYPE_LABELS: Record<PriorPregnancyType, string> = {
  N: "Parto normal",
  F: "Fórceps",
  C: "Cesárea",
  A: "Aborto",
  E: "Ectópica",
};

export interface ParityResult {
  /** Ex.: "G5P4(N1C2A1)". */
  summary: string;
  /** Linhas por gestação prévia, ordenadas por ano. */
  lines: string[];
  cesareanCount: number;
  /** true se multípara (≥1 parto: N, F ou C). */
  multipara: boolean;
}

function routesOf(p: PriorPregnancy): TwinRoute[] {
  return p.twinRoutes && p.twinRoutes.length ? p.twinRoutes : ["N", "N"];
}

/**
 * Monta o resumo e as linhas de paridade. `isPregnant` soma a gestação atual
 * ao total de G (padrão true).
 */
export function formatParity(prior: PriorPregnancy[], isPregnant = true): ParityResult {
  let N = 0;
  let C = 0;
  let F = 0;
  let A = 0;
  let E = 0;
  const gems: string[] = [];

  for (const p of prior) {
    if (p.twin && (p.type === "N" || p.type === "C" || p.type === "F")) {
      const routes = routesOf(p);
      const vaginal = routes.filter((r) => r === "N").length;
      const cesarean = routes.filter((r) => r === "C").length;
      N += vaginal;
      if (cesarean > 0) C += 1; // cesárea gemelar = 1 parto para os dois
      const mixed = vaginal > 0 && cesarean > 0;
      gems.push(`(GEM${routes.length}${mixed ? `[C${cesarean}N${vaginal}]` : ""})`);
    } else {
      switch (p.type) {
        case "N":
          N += 1;
          break;
        case "F":
          F += 1;
          break;
        case "C":
          C += 1;
          break;
        case "A":
          A += 1;
          break;
        case "E":
          A += 1;
          E += 1;
          break;
      }
    }
  }

  const P = N + C + F + A;
  const g = prior.length + (isPregnant ? 1 : 0);

  let paren = "";
  if (N) paren += `N${N}`;
  if (C) paren += `C${C}`;
  if (F) paren += `F${F}`;
  if (A) paren += `A${A}${E ? `(E${E})` : ""}`;
  paren += gems.join("");
  const summary = `G${g}P${P}${paren ? `(${paren})` : ""}`;

  // Linhas por gestação, ordenadas por ano.
  const sorted = [...prior].sort((a, b) => {
    const ya = a.year ? Number(a.year) : Infinity;
    const yb = b.year ? Number(b.year) : Infinity;
    return ya - yb;
  });
  const lines = sorted.map((p) => {
    const when = p.year ? ` EM ${p.year}` : "";
    const noteText = p.note ? p.note.trim().replace(/\s*\n+\s*/g, "; ") : "";
    const note = noteText ? `, ${noteText.toUpperCase()}` : "";
    let desc: string;
    if (p.twin && (p.type === "N" || p.type === "C" || p.type === "F")) {
      const routes = routesOf(p);
      const vaginal = routes.filter((r) => r === "N").length;
      const cesarean = routes.filter((r) => r === "C").length;
      const parts: string[] = [];
      if (vaginal) parts.push(`${vaginal} VAGINAL${vaginal > 1 ? "IS" : ""}`);
      if (cesarean) parts.push(`${cesarean} CESÁREA${cesarean > 1 ? "S" : ""}`);
      desc = `GESTAÇÃO GEMELAR (${routes.length} RN: ${parts.join(" + ")})`;
    } else {
      desc = PRIOR_TYPE_LABELS[p.type].toUpperCase();
    }
    return `${desc}${when}${note}`;
  });

  return { summary, lines, cesareanCount: C, multipara: N + C + F > 0 };
}
