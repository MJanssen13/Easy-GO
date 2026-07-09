/**
 * Exame ginecológico/obstétrico do PSGO, esmiuçado em botões clicáveis:
 * abdome (gravídico), toque vaginal e exame especular. Cada campo é uma
 * escolha única (chip); o módulo monta as linhas ABD / TOQUE / ESPECULAR do
 * prontuário. AU e BCF vêm dos sinais vitais do exame físico.
 */
import type { ExamVitals } from "./exam";

export interface GyOption {
  /** Rótulo do botão. */
  label: string;
  /** Texto que vai para o prontuário. */
  text: string;
}
export interface GyField {
  id: string;
  label: string;
  options: GyOption[];
  /** Forma de entrada: "chips" (padrão) ou "select" (lista suspensa). */
  render?: "chips" | "select";
}

const o = (label: string, text?: string): GyOption => ({ label, text: text ?? label });

// --- Abdome (gravídico) ---
export const ABD_FIELDS: GyField[] = [
  {
    id: "abdRha",
    label: "RHA",
    options: [o("Presentes", "RHA+"), o("Diminuídos", "RHA DIMINUÍDOS"), o("Ausentes", "RHA AUSENTES")],
  },
  {
    id: "abdDor",
    label: "Palpação",
    options: [
      o("Indolor", "S/ DOR À PALPAÇÃO"),
      o("Doloroso", "DOLOROSO À PALPAÇÃO"),
      o("Dor hipogástrio", "DOR EM HIPOGÁSTRIO"),
      o("Dor HD", "DOR EM HIPOCÔNDRIO DIREITO"),
    ],
  },
  {
    id: "abdIrritacao",
    label: "Irritação peritoneal",
    options: [o("Ausente", "SEM SINAIS DE IRRITAÇÃO PERITONEAL"), o("Presente", "COM SINAIS DE IRRITAÇÃO PERITONEAL")],
  },
  {
    id: "abdDu",
    label: "Dinâmica uterina",
    options: [o("Ausente", "SEM DU"), o("Presente", "COM DINÂMICA UTERINA")],
  },
  {
    id: "abdTonus",
    label: "Tônus uterino",
    options: [o("Habitual", "TONUS HABITUAL"), o("Hipertônico", "HIPERTÔNICO"), o("Hipotônico", "HIPOTÔNICO")],
  },
];

// --- Toque vaginal (notação do pré-parto) ---
const cmOptions: GyOption[] = [
  o("Impérvio", "OE IMPÉRVIO"),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => o(`${n} cm`, `DILATAÇÃO ${n} CM`)),
];
const deLeeOptions: GyOption[] = [
  o("Alto e móvel", "ALTO E MÓVEL"),
  ...[-3, -2, -1, 0, 1, 2, 3, 4].map((n) => o(`${n > 0 ? `+${n}` : n}`, `DE LEE ${n > 0 ? `+${n}` : n}`)),
];
// Apagamento: grosso → "G"; demais em passos de 10% → "APAG X%".
const apagamentoOptions: GyOption[] = [
  o("Grosso", "G"),
  ...[10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => o(`${n}%`, `APAG ${n}%`)),
];

/** Chaves das opções OEEA/OII (substituem a dilatação no prontuário). */
export const OEEA_KEY = "toqueOeea";
export const OII_KEY = "toqueOii";

export const TOQUE_FIELDS: GyField[] = [
  {
    id: "toquePosicao",
    label: "Posição do colo",
    options: [o("Posterior (P)", "P"), o("Médio-Posterior (MP)", "MP"), o("Centralizado (C)", "C")],
  },
  {
    id: "toqueConsistencia",
    label: "Consistência do colo",
    options: [o("Nasal (N)", "N"), o("Nasolabial (NL)", "NL"), o("Labial (L)", "L")],
  },
  {
    id: "toqueApagamento",
    label: "Apagamento",
    render: "select",
    options: apagamentoOptions,
  },
  { id: "toqueDilatacao", label: "Dilatação", render: "select", options: cmOptions },
  { id: "toqueDeLee", label: "Altura (De Lee)", render: "select", options: deLeeOptions },
  {
    id: "toqueApresentacao",
    label: "Apresentação",
    options: [
      o("Cefálica", "APRESENTAÇÃO CEFÁLICA"),
      o("Pélvica", "APRESENTAÇÃO PÉLVICA"),
      o("Córmica", "APRESENTAÇÃO CÓRMICA"),
    ],
  },
  {
    id: "toqueBolsa",
    label: "Bolsa",
    options: [
      o("Íntegra", "BOLSA ÍNTEGRA"),
      o("Rota, claro", "BOLSA ROTA, LÍQUIDO CLARO"),
      o("Rota, meconial", "BOLSA ROTA, LÍQUIDO MECONIAL"),
    ],
  },
  {
    id: "toqueSangramento",
    label: "Sangue na luva",
    options: [o("Sem sangue", "SEM SANGUE NA LUVA"), o("Com sangue", "COM SANGUE NA LUVA")],
  },
];

// --- Exame especular ---
export const ESP_FIELDS: GyField[] = [
  {
    id: "espColo",
    label: "Colo",
    options: [o("Epitelizado", "COLO EPITELIZADO"), o("Ectopia", "COLO COM ECTOPIA"), o("Friável", "COLO FRIÁVEL")],
  },
];

/** Secreção — multisseleção; "Ausente" é exclusivo dos demais. */
export const SEC_AUSENTE_KEY = "secAusente";
export const SECRECAO_OPTIONS: { key: string; label: string; text: string }[] = [
  { key: SEC_AUSENTE_KEY, label: "Ausente", text: "SEM SECREÇÃO" },
  { key: "secFisiologica", label: "Fisiológica", text: "SECREÇÃO FISIOLÓGICA" },
  { key: "secBolhoso", label: "Bolhoso", text: "SECREÇÃO BOLHOSA" },
  { key: "secEsverdeado", label: "Esverdeado", text: "SECREÇÃO ESVERDEADA" },
  { key: "secPurulento", label: "Purulento", text: "SECREÇÃO PURULENTA" },
  { key: "secFetido", label: "Fétido", text: "SECREÇÃO FÉTIDA" },
];

/** Sangramento (+ quantidade quando ≠ ausente). */
export const ESP_SANGRAMENTO_KEY = "espSangramento";
export const ESP_SANGRAMENTO_QTD_KEY = "espSangramentoQtd";
export const ESP_SANGRAMENTO_OPTIONS: GyOption[] = [
  o("Ausente", "SEM SANGRAMENTO ATIVO"),
  o("Pelo OE", "SANGRAMENTO PELO OE"),
  o("De parede vaginal", "SANGRAMENTO DE PAREDE VAGINAL"),
];
export const ESP_SANGRAMENTO_QTD_OPTIONS: GyOption[] = [
  o("Pequena", "EM PEQUENA QUANTIDADE"),
  o("Moderada", "EM MODERADA QUANTIDADE"),
  o("Grande", "EM GRANDE QUANTIDADE"),
];

/** Saídas via colo (+ Amniosure/cristalização quando ≠ ausente). */
export const ESP_SAIDA_COLO_KEY = "espSaidaColo";
export const ESP_AMNIOSURE_KEY = "espAmniosure";
export const ESP_CRISTALIZACAO_KEY = "espCristalizacao";
export const ESP_SAIDA_COLO_OPTIONS: GyOption[] = [
  o("Ausente", "SEM SAÍDA VIA COLO"),
  o("Líquido claro", "SAÍDA DE LÍQUIDO CLARO VIA COLO"),
  o("Purulento", "SAÍDA PURULENTA VIA COLO"),
];
/** Testes (Amniosure/cristalização): "Não realizado" não vai ao prontuário. */
export const TEST_OPTIONS = ["Não realizado", "Positivo", "Negativo"];

export const GYNECO_SECTIONS = [
  { id: "abd", title: "Abdome (gravídico)", fields: ABD_FIELDS },
  { id: "toque", title: "Toque vaginal", fields: TOQUE_FIELDS },
  { id: "especular", title: "Exame especular", fields: ESP_FIELDS },
] as const;

// Campos que só fazem sentido na gestação (escondidos para não gestantes).
const OBSTETRIC_ABD_IDS = new Set(["abdDu", "abdTonus"]);
const OBSTETRIC_TOQUE_IDS = new Set([
  "toqueApagamento",
  "toqueDeLee",
  "toqueApresentacao",
  "toqueBolsa",
]);

/** Campos do abdome conforme a pessoa está gestante ou não. */
export function abdFieldsFor(pregnant: boolean): GyField[] {
  return pregnant ? ABD_FIELDS : ABD_FIELDS.filter((f) => !OBSTETRIC_ABD_IDS.has(f.id));
}

/** Campos do toque vaginal conforme a pessoa está gestante ou não. */
export function toqueFieldsFor(pregnant: boolean): GyField[] {
  return pregnant ? TOQUE_FIELDS : TOQUE_FIELDS.filter((f) => !OBSTETRIC_TOQUE_IDS.has(f.id));
}

export interface GynecoState {
  /** fieldId → rótulo da opção selecionada. */
  values: Record<string, string>;
  toqueRealizado: boolean;
  toqueAutorizado: boolean;
  espRealizado: boolean;
}

export function emptyGynecoState(): GynecoState {
  const values: Record<string, string> = {};
  for (const f of [...ABD_FIELDS, ...TOQUE_FIELDS, ...ESP_FIELDS]) {
    values[f.id] = f.options[0].label;
  }
  // Especular: campos personalizados (secreção multi, sangramento, saída via colo)
  values[SEC_AUSENTE_KEY] = "1";
  values[ESP_SANGRAMENTO_KEY] = "Ausente";
  values[ESP_SAIDA_COLO_KEY] = "Ausente";
  values[ESP_AMNIOSURE_KEY] = "Não realizado";
  values[ESP_CRISTALIZACAO_KEY] = "Não realizado";
  return { values, toqueRealizado: true, toqueAutorizado: true, espRealizado: false };
}

function pick(field: GyField, values: Record<string, string>): string {
  const label = values[field.id] ?? field.options[0].label;
  return (field.options.find((op) => op.label === label) ?? field.options[0]).text;
}

function pickText(options: GyOption[], label: string | undefined): string {
  return (options.find((op) => op.label === label) ?? options[0]).text;
}

/** Linhas ABD / TOQUE VAGINAL / EXAME ESPECULAR do prontuário. */
export function renderGyneco(st: GynecoState, vitals: ExamVitals, pregnant = true): string[] {
  const v = st.values;
  const lines: string[] = [];

  const abd = (id: string) => pick(ABD_FIELDS.find((f) => f.id === id)!, v);
  const abdBase = `ABD: ${abd("abdRha")}, ${abd("abdDor")}, ${abd("abdIrritacao")}`;
  lines.push(
    pregnant
      ? `${abdBase}. GRAVÍDICO, ${abd("abdDu")}, ${abd("abdTonus")}, AU: ${vitals.au ?? ""} CM, BCF: ${vitals.bcf ?? ""} BPM`
      : `${abdBase}.`,
  );

  if (!st.toqueRealizado) {
    lines.push("TOQUE VAGINAL: NÃO REALIZADO");
  } else {
    const t = (id: string) => pick(TOQUE_FIELDS.find((f) => f.id === id)!, v);
    const auth = st.toqueAutorizado ? " (AUTORIZADO PELA PACIENTE)" : "";
    // OEEA/OII (cumulativos) substituem a dilatação em cm quando marcados.
    const oeea = v[OEEA_KEY] === "1";
    const oii = v[OII_KEY] === "1";
    const dilat =
      oeea || oii
        ? [oeea ? "OEEA" : "", oii ? "OII" : ""].filter(Boolean).join(" ")
        : t("toqueDilatacao");
    if (pregnant) {
      const colo = `COLO ${t("toquePosicao")}, ${t("toqueConsistencia")}, ${t("toqueApagamento")}`;
      lines.push(
        `TOQUE VAGINAL${auth}: ${colo}, ${dilat}, ${t("toqueDeLee")}, ${t("toqueApresentacao")}, ${t("toqueBolsa")}, ${t("toqueSangramento")}`,
      );
    } else {
      lines.push(
        `TOQUE VAGINAL${auth}: COLO ${t("toquePosicao")}, ${t("toqueConsistencia")}, ${dilat}, ${t("toqueSangramento")}`,
      );
    }
  }

  if (!st.espRealizado) {
    lines.push("EXAME ESPECULAR: NÃO REALIZADO");
  } else {
    const parts: string[] = [pick(ESP_FIELDS.find((f) => f.id === "espColo")!, v)];
    // Secreção (multisseleção)
    const secSel = SECRECAO_OPTIONS.filter((op) => v[op.key] === "1");
    if (secSel.length) parts.push(secSel.map((op) => op.text).join(", "));
    // Sangramento (+ quantidade quando ≠ ausente)
    const sang = v[ESP_SANGRAMENTO_KEY] ?? "Ausente";
    let sangText = pickText(ESP_SANGRAMENTO_OPTIONS, sang);
    if (sang !== "Ausente" && v[ESP_SANGRAMENTO_QTD_KEY]) {
      sangText += ` ${pickText(ESP_SANGRAMENTO_QTD_OPTIONS, v[ESP_SANGRAMENTO_QTD_KEY])}`;
    }
    parts.push(sangText);
    // Saídas via colo (+ Amniosure/cristalização se ≠ ausente; "Não realizado" omitido)
    const saida = v[ESP_SAIDA_COLO_KEY] ?? "Ausente";
    parts.push(pickText(ESP_SAIDA_COLO_OPTIONS, saida));
    if (saida !== "Ausente") {
      const am = v[ESP_AMNIOSURE_KEY];
      const cr = v[ESP_CRISTALIZACAO_KEY];
      if (am === "Positivo" || am === "Negativo") parts.push(`AMNIOSURE ${am.toUpperCase()}`);
      if (cr === "Positivo" || cr === "Negativo") parts.push(`CRISTALIZAÇÃO ${cr.toUpperCase()}`);
    }
    lines.push(`EXAME ESPECULAR: ${parts.filter(Boolean).join(", ")}`);
  }

  return lines;
}
