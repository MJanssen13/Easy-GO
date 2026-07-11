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
    options: [o("Ausente", "DU AUSENTE"), o("Presente", "COM DINÂMICA UTERINA")],
  },
  {
    id: "abdTonus",
    label: "Tônus uterino",
    options: [o("Habitual", "TONUS HABITUAL"), o("Hipertônico", "HIPERTÔNICO"), o("Hipotônico", "HIPOTÔNICO")],
  },
];

// --- Toque vaginal (notação do pré-parto) ---
const cmOptions: GyOption[] = [
  o("OEI", "OE IMPÉRVIO"),
  o("OEEA", "OEEA"),
  o("OII", "OII"),
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

/** Detalhe da dinâmica uterina (quando presente). */
export const ABD_DU_DETALHE_KEY = "abdDuDetalhe";

// Ordem da descrição do toque: apagamento, posição, consistência, dilatação,
// apresentação, altura (De Lee), bolsa e sangue.
export const TOQUE_FIELDS: GyField[] = [
  {
    id: "toqueApagamento",
    label: "Apagamento",
    render: "select",
    options: apagamentoOptions,
  },
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
  { id: "toqueDilatacao", label: "Dilatação", render: "select", options: cmOptions },
  {
    id: "toqueApresentacao",
    label: "Apresentação",
    options: [
      o("Cefálica", "APRESENTAÇÃO CEFÁLICA"),
      o("Pélvica", "APRESENTAÇÃO PÉLVICA"),
      o("Córmica", "APRESENTAÇÃO CÓRMICA"),
    ],
  },
  { id: "toqueDeLee", label: "Altura (De Lee)", render: "select", options: deLeeOptions },
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

/** Dor ao toque — multisseleção; "Indolor" é exclusivo dos demais. */
export const TOQUE_DOR_INDOLOR_KEY = "toqueDorIndolor";
export const TOQUE_DOR_OPTIONS: { key: string; label: string; text: string }[] = [
  { key: TOQUE_DOR_INDOLOR_KEY, label: "Indolor", text: "INDOLOR AO TOQUE" },
  { key: "toqueDorColo", label: "À mobilização do colo", text: "DOR À MOBILIZAÇÃO DO COLO" },
  { key: "toqueDorAnexos", label: "À palpação de anexos", text: "DOR À PALPAÇÃO DE ANEXOS" },
];

// --- Exame especular ---
export const ESP_FIELDS: GyField[] = [
  {
    id: "espColo",
    label: "Colo",
    options: [o("Epitelizado", "COLO EPITELIZADO"), o("Ectopia", "COLO COM ECTOPIA"), o("Friável", "COLO FRIÁVEL")],
  },
];

/**
 * Secreção — local (escolha única); se patológica (≠ ausente/fisiológica),
 * detalha odor, grumos e cor (como na HPMA).
 */
export const SEC_LOCAL_KEY = "secLocal";
export const SEC_ODOR_KEY = "secOdor";
export const SEC_GRUMOS_KEY = "secGrumos";
export const SEC_COR_KEY = "secCor";
export const SEC_LOCAL_OPTIONS: GyOption[] = [
  o("Ausente", "SEM SECREÇÃO"),
  o("Fisiológica", "SECREÇÃO FISIOLÓGICA"),
  o("Aderida à parede", "SECREÇÃO ADERIDA À PAREDE"),
  o("Em fórnice posterior", "SECREÇÃO EM FÓRNICE POSTERIOR"),
];
export const SEC_ODOR_OPTIONS: GyOption[] = [o("Não fétida", "NÃO FÉTIDA"), o("Fétida", "FÉTIDA")];
export const SEC_GRUMOS_OPTIONS: GyOption[] = [o("Sem grumos", "SEM GRUMOS"), o("Com grumos", "COM GRUMOS")];
export const SEC_COR_OPTIONS: GyOption[] = [
  o("Clara", "CLARA"),
  o("Esbranquiçada", "ESBRANQUIÇADA"),
  o("Esverdeada", "ESVERDEADA"),
  o("Purulenta", "PURULENTA"),
];
/** Secreção patológica (mostra características de odor/grumos/cor). */
export function secHasCharacteristics(local: string | undefined): boolean {
  return local != null && local !== "Ausente" && local !== "Fisiológica";
}

/** Sangramento (+ tipo se pelo OE, + quantidade quando ≠ ausente). */
export const ESP_SANGRAMENTO_KEY = "espSangramento";
export const ESP_SANGRAMENTO_QTD_KEY = "espSangramentoQtd";
export const ESP_SANGRAMENTO_OE_KEY = "espSangramentoOe";
export const ESP_SANGRAMENTO_OPTIONS: GyOption[] = [
  o("Ausente", "SEM SANGRAMENTO ATIVO"),
  o("Pelo OE", "SANGRAMENTO PELO OE"),
  o("De parede vaginal", "SANGRAMENTO DE PAREDE VAGINAL"),
];
export const ESP_SANGRAMENTO_OE_OPTIONS: GyOption[] = [
  o("Espontâneo", "ESPONTÂNEO"),
  o("À valsalva", "À VALSALVA"),
];
export const ESP_SANGRAMENTO_QTD_OPTIONS: GyOption[] = [
  o("Pequena", "EM PEQUENA QUANTIDADE"),
  o("Moderada", "EM MODERADA QUANTIDADE"),
  o("Grande", "EM GRANDE QUANTIDADE"),
];

/** Perdas líquidas via colo (+ tipo, AmniSure/cristalização quando ≠ ausente). */
export const ESP_SAIDA_COLO_KEY = "espSaidaColo";
export const ESP_SAIDA_COLO_TIPO_KEY = "espSaidaColoTipo";
export const ESP_AMNIOSURE_KEY = "espAmniosure";
export const ESP_CRISTALIZACAO_KEY = "espCristalizacao";
export const ESP_SAIDA_COLO_OPTIONS: GyOption[] = [
  o("Ausente", "SEM PERDA LÍQUIDA VIA COLO"),
  o("Líquido claro", "PERDA DE LÍQUIDO CLARO VIA COLO"),
  o("Líquido meconial", "PERDA DE LÍQUIDO MECONIAL VIA COLO"),
  o("Purulento", "PERDA PURULENTA VIA COLO"),
];
export const ESP_SAIDA_COLO_TIPO_OPTIONS: GyOption[] = [
  o("Espontânea", "ESPONTÂNEA"),
  o("À valsalva", "À VALSALVA"),
];
/** Testes (AmniSure/cristalização): "Não realizado" não vai ao prontuário. */
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
  // Toque: dor ao toque (indolor por padrão).
  values[TOQUE_DOR_INDOLOR_KEY] = "1";
  // Especular: campos personalizados (secreção, sangramento, perdas via colo).
  values[SEC_LOCAL_KEY] = "Ausente";
  values[SEC_ODOR_KEY] = SEC_ODOR_OPTIONS[0].label;
  values[SEC_GRUMOS_KEY] = SEC_GRUMOS_OPTIONS[0].label;
  values[SEC_COR_KEY] = SEC_COR_OPTIONS[0].label;
  values[ESP_SANGRAMENTO_KEY] = "Ausente";
  values[ESP_SANGRAMENTO_OE_KEY] = ESP_SANGRAMENTO_OE_OPTIONS[0].label;
  values[ESP_SAIDA_COLO_KEY] = "Ausente";
  values[ESP_SAIDA_COLO_TIPO_KEY] = ESP_SAIDA_COLO_TIPO_OPTIONS[0].label;
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
  // Dinâmica: "DU AUSENTE" ou, se presente, com o detalhe informado.
  const duText = () => {
    if ((v["abdDu"] ?? "Ausente") !== "Presente") return abd("abdDu");
    const det = (v[ABD_DU_DETALHE_KEY] ?? "").trim();
    return det ? `DINÂMICA UTERINA ${det.toUpperCase()}` : "COM DINÂMICA UTERINA";
  };
  lines.push(
    pregnant
      ? `ABD: GRAVÍDICO, ${abd("abdRha")}, ${abd("abdDor")}, ${abd("abdIrritacao")}, ${duText()}, ${abd("abdTonus")}, AU: ${vitals.au ?? ""} CM, BCF: ${vitals.bcf ?? ""} BPM`
      : `ABD: ${abd("abdRha")}, ${abd("abdDor")}, ${abd("abdIrritacao")}.`,
  );

  if (!st.toqueRealizado) {
    lines.push("TOQUE VAGINAL: NÃO REALIZADO");
  } else {
    const t = (id: string) => pick(TOQUE_FIELDS.find((f) => f.id === id)!, v);
    // Toque realizado é sempre autorizado pela paciente.
    const auth = " (AUTORIZADO PELA PACIENTE)";
    const dilat = t("toqueDilatacao");
    // Dor ao toque (multisseleção).
    const dorSel = TOQUE_DOR_OPTIONS.filter((op) => v[op.key] === "1");
    const dor = dorSel.length ? `, ${dorSel.map((op) => op.text).join(", ")}` : "";
    if (pregnant) {
      // Ordem: apagamento, posição, consistência, dilatação, apresentação,
      // altura (De Lee), bolsa, sangue.
      lines.push(
        `TOQUE VAGINAL${auth}: COLO ${t("toqueApagamento")}, ${t("toquePosicao")}, ${t("toqueConsistencia")}, ${dilat}, ${t("toqueApresentacao")}, ${t("toqueDeLee")}, ${t("toqueBolsa")}, ${t("toqueSangramento")}${dor}`,
      );
    } else {
      lines.push(
        `TOQUE VAGINAL${auth}: COLO ${t("toquePosicao")}, ${t("toqueConsistencia")}, ${dilat}, ${t("toqueSangramento")}${dor}`,
      );
    }
  }

  if (!st.espRealizado) {
    lines.push("EXAME ESPECULAR: NÃO REALIZADO");
  } else {
    const parts: string[] = [pick(ESP_FIELDS.find((f) => f.id === "espColo")!, v)];
    // Secreção (local + características quando patológica)
    const secLocal = v[SEC_LOCAL_KEY] ?? "Ausente";
    let secText = pickText(SEC_LOCAL_OPTIONS, secLocal);
    if (secHasCharacteristics(secLocal)) {
      secText += `, ${pickText(SEC_COR_OPTIONS, v[SEC_COR_KEY])}, ${pickText(SEC_GRUMOS_OPTIONS, v[SEC_GRUMOS_KEY])}, ${pickText(SEC_ODOR_OPTIONS, v[SEC_ODOR_KEY])}`;
    }
    parts.push(secText);
    // Sangramento (+ tipo se pelo OE, + quantidade quando ≠ ausente)
    const sang = v[ESP_SANGRAMENTO_KEY] ?? "Ausente";
    let sangText = pickText(ESP_SANGRAMENTO_OPTIONS, sang);
    if (sang === "Pelo OE" && v[ESP_SANGRAMENTO_OE_KEY]) {
      sangText += ` ${pickText(ESP_SANGRAMENTO_OE_OPTIONS, v[ESP_SANGRAMENTO_OE_KEY])}`;
    }
    if (sang !== "Ausente" && v[ESP_SANGRAMENTO_QTD_KEY]) {
      sangText += ` ${pickText(ESP_SANGRAMENTO_QTD_OPTIONS, v[ESP_SANGRAMENTO_QTD_KEY])}`;
    }
    parts.push(sangText);
    // Perdas líquidas via colo (+ tipo, AmniSure/cristalização se ≠ ausente)
    const saida = v[ESP_SAIDA_COLO_KEY] ?? "Ausente";
    let saidaText = pickText(ESP_SAIDA_COLO_OPTIONS, saida);
    if (saida !== "Ausente" && v[ESP_SAIDA_COLO_TIPO_KEY]) {
      saidaText += ` ${pickText(ESP_SAIDA_COLO_TIPO_OPTIONS, v[ESP_SAIDA_COLO_TIPO_KEY])}`;
    }
    parts.push(saidaText);
    if (saida !== "Ausente") {
      const am = v[ESP_AMNIOSURE_KEY];
      const cr = v[ESP_CRISTALIZACAO_KEY];
      if (am === "Positivo" || am === "Negativo") parts.push(`AMNISURE ${am.toUpperCase()}`);
      if (cr === "Positivo" || cr === "Negativo") parts.push(`CRISTALIZAÇÃO ${cr.toUpperCase()}`);
    }
    lines.push(`EXAME ESPECULAR: ${parts.filter(Boolean).join(", ")}`);
  }

  return lines;
}
