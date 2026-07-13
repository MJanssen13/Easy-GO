/**
 * Gestação múltipla: gemelaridade (nº de fetos) + corionicidade/amnionicidade.
 * Alimenta a HD (ex.: "GESTAÇÃO TRIGEMELAR TRICORIÔNICA TRIAMNIÓTICA (TC/TA) DE
 * 33 SEMANAS E 5 DIAS") e o nº de colunas do quadro de USG (uma por feto).
 */

export type Multiplicity = "gemelar" | "trigemelar";

export const MULTIPLICITY_LABEL: Record<Multiplicity, string> = {
  gemelar: "GEMELAR",
  trigemelar: "TRIGEMELAR",
};

/** Nº de fetos (e, portanto, de colunas do USG) por tipo. */
export const MULTIPLICITY_COUNT: Record<Multiplicity, number> = {
  gemelar: 2,
  trigemelar: 3,
};

export interface ChorionOption {
  /** Sigla (ex.: "TC/TA"). Também é o valor guardado no formulário. */
  abbr: string;
  /** Rótulo da UI (ex.: "Tricoriônica e Triamniótica (TC/TA)"). */
  label: string;
  /** Frase para HD/USG, em maiúsculas e sem "E" (ex.: "TRICORIÔNICA TRIAMNIÓTICA"). */
  phrase: string;
}

const opt = (abbr: string, label: string, phrase: string): ChorionOption => ({ abbr, label, phrase });

/** Combinações de corionicidade/amnionicidade possíveis por gemelaridade. */
export const CHORION_OPTIONS: Record<Multiplicity, ChorionOption[]> = {
  gemelar: [
    opt("DC/DA", "Dicoriônica e Diamniótica (DC/DA)", "DICORIÔNICA DIAMNIÓTICA"),
    opt("MC/DA", "Monocoriônica e Diamniótica (MC/DA)", "MONOCORIÔNICA DIAMNIÓTICA"),
    opt("MC/MA", "Monocoriônica e Monoamniótica (MC/MA)", "MONOCORIÔNICA MONOAMNIÓTICA"),
  ],
  trigemelar: [
    opt("TC/TA", "Tricoriônica e Triamniótica (TC/TA)", "TRICORIÔNICA TRIAMNIÓTICA"),
    opt("DC/TA", "Dicoriônica e Triamniótica (DC/TA)", "DICORIÔNICA TRIAMNIÓTICA"),
    opt("DC/DA", "Dicoriônica e Diamniótica (DC/DA)", "DICORIÔNICA DIAMNIÓTICA"),
    opt("MC/TA", "Monocoriônica e Triamniótica (MC/TA)", "MONOCORIÔNICA TRIAMNIÓTICA"),
    opt("MC/DA", "Monocoriônica e Diamniótica (MC/DA)", "MONOCORIÔNICA DIAMNIÓTICA"),
    opt("MC/MA", "Monocoriônica e Monoamniótica (MC/MA)", "MONOCORIÔNICA MONOAMNIÓTICA"),
  ],
};

export function findChorion(m: Multiplicity | "", abbr: string): ChorionOption | undefined {
  if (!m) return undefined;
  return CHORION_OPTIONS[m].find((o) => o.abbr === abbr);
}

/**
 * Frase da gestação múltipla para a HD (com a sigla) ou para o laudo do USG
 * (sem a sigla). Ex.: "TRIGEMELAR TRICORIÔNICA TRIAMNIÓTICA (TC/TA)" (HD) e
 * "TRIGEMELAR TRICORIÔNICA TRIAMNIÓTICA" (USG). Vazio se incompleto.
 */
export function multipleGestationPhrase(
  m: Multiplicity | "",
  chorionAbbr: string,
  opts: { withAbbr: boolean },
): string {
  if (!m) return "";
  const parts = [MULTIPLICITY_LABEL[m]];
  const ch = findChorion(m, chorionAbbr);
  if (ch) {
    parts.push(ch.phrase);
    if (opts.withAbbr) parts.push(`(${ch.abbr})`);
  }
  return parts.join(" ");
}
