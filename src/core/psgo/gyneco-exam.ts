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

// --- Toque vaginal ---
export const TOQUE_FIELDS: GyField[] = [
  {
    id: "toqueConsistencia",
    label: "Consistência do colo",
    options: [o("Grosso"), o("Médio"), o("Fino"), o("Apagado")],
  },
  {
    id: "toquePosicao",
    label: "Posição do colo",
    options: [o("Posterior"), o("Intermediário"), o("Centralizado"), o("Anterior")],
  },
  {
    id: "toqueDilatacao",
    label: "Dilatação",
    options: [
      o("Impérvio", "OE IMPÉRVIO"),
      o("1 cm", "1 CM"),
      o("2 cm", "2 CM"),
      o("3 cm", "3 CM"),
      o("4 cm", "4 CM"),
      o("5 cm", "5 CM"),
      o("6 cm", "6 CM"),
      o("7 cm", "7 CM"),
      o("8 cm", "8 CM"),
      o("9 cm", "9 CM"),
      o("10 cm", "10 CM"),
    ],
  },
  {
    id: "toqueApresentacao",
    label: "Apresentação",
    options: [
      o("Alta e móvel", "APRESENTAÇÃO ALTA E MÓVEL"),
      o("Insinuada", "APRESENTAÇÃO INSINUADA"),
      o("Cefálica", "APRESENTAÇÃO CEFÁLICA"),
      o("Pélvica", "APRESENTAÇÃO PÉLVICA"),
    ],
  },
  {
    id: "toqueBolsa",
    label: "Bolsa",
    options: [o("Íntegra", "BOLSA ÍNTEGRA"), o("Rota", "BOLSA ROTA"), o("Não avaliada", "BOLSA NÃO AVALIADA")],
  },
  {
    id: "toqueSangramento",
    label: "Sangramento",
    options: [o("Sem sangue", "SEM SANGUE EM DEDO DE LUVA"), o("Com sangue", "COM SANGUE EM DEDO DE LUVA")],
  },
];

// --- Exame especular ---
export const ESP_FIELDS: GyField[] = [
  {
    id: "espColo",
    label: "Colo",
    options: [o("Epitelizado", "COLO EPITELIZADO"), o("Ectopia", "COLO COM ECTOPIA"), o("Friável", "COLO FRIÁVEL")],
  },
  {
    id: "espConteudo",
    label: "Conteúdo vaginal",
    options: [
      o("Fisiológico", "CONTEÚDO VAGINAL FISIOLÓGICO"),
      o("Aumentado", "CONTEÚDO VAGINAL AUMENTADO"),
      o("Grumoso", "CONTEÚDO VAGINAL GRUMOSO"),
      o("Com odor", "CONTEÚDO VAGINAL COM ODOR"),
    ],
  },
  {
    id: "espSangramento",
    label: "Sangramento",
    options: [o("Ausente", "SEM SANGRAMENTO ATIVO"), o("Pelo OE", "SANGRAMENTO PELO OE"), o("Moderado", "SANGRAMENTO MODERADO")],
  },
  {
    id: "espLiquido",
    label: "Saída de líquido",
    options: [
      o("Ausente", "SEM SAÍDA DE LÍQUIDO"),
      o("Líquido claro (BR+)", "SAÍDA DE LÍQUIDO CLARO PELO OE"),
      o("Secreção", "SAÍDA DE SECREÇÃO"),
    ],
  },
];

export const GYNECO_SECTIONS = [
  { id: "abd", title: "Abdome (gravídico)", fields: ABD_FIELDS },
  { id: "toque", title: "Toque vaginal", fields: TOQUE_FIELDS },
  { id: "especular", title: "Exame especular", fields: ESP_FIELDS },
] as const;

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
  return { values, toqueRealizado: true, toqueAutorizado: true, espRealizado: false };
}

function pick(field: GyField, values: Record<string, string>): string {
  const label = values[field.id] ?? field.options[0].label;
  return (field.options.find((op) => op.label === label) ?? field.options[0]).text;
}

/** Linhas ABD / TOQUE VAGINAL / EXAME ESPECULAR do prontuário. */
export function renderGyneco(st: GynecoState, vitals: ExamVitals): string[] {
  const v = st.values;
  const lines: string[] = [];

  const abd = (id: string) => pick(ABD_FIELDS.find((f) => f.id === id)!, v);
  lines.push(
    `ABD: ${abd("abdRha")}, ${abd("abdDor")}, ${abd("abdIrritacao")}. GRAVÍDICO, ${abd("abdDu")}, ${abd("abdTonus")}, AU: ${vitals.au ?? ""} CM, BCF: ${vitals.bcf ?? ""} BPM`,
  );

  if (!st.toqueRealizado) {
    lines.push("TOQUE VAGINAL: NÃO REALIZADO");
  } else {
    const t = (id: string) => pick(TOQUE_FIELDS.find((f) => f.id === id)!, v);
    const auth = st.toqueAutorizado ? " (AUTORIZADO PELA PACIENTE)" : "";
    lines.push(
      `TOQUE VAGINAL${auth}: COLO ${t("toqueConsistencia")}, ${t("toquePosicao")}, ${t("toqueDilatacao")}, ${t("toqueApresentacao")}, ${t("toqueBolsa")}, ${t("toqueSangramento")}`,
    );
  }

  if (!st.espRealizado) {
    lines.push("EXAME ESPECULAR: NÃO REALIZADO");
  } else {
    const e = (id: string) => pick(ESP_FIELDS.find((f) => f.id === id)!, v);
    lines.push(
      `EXAME ESPECULAR: ${e("espColo")}, ${e("espConteudo")}, ${e("espSangramento")}, ${e("espLiquido")}`,
    );
  }

  return lines;
}
