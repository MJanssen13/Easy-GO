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

// --- Toque vaginal (notação do pré-parto) ---
const cmOptions: GyOption[] = [
  o("Impérvio", "OE IMPÉRVIO"),
  ...[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => o(`${n} cm`, `DILATAÇÃO ${n} CM`)),
];
const deLeeOptions: GyOption[] = [
  o("Alto e móvel", "ALTO E MÓVEL"),
  ...[-3, -2, -1, 0, 1, 2, 3, 4].map((n) => o(`${n > 0 ? `+${n}` : n}`, `DE LEE ${n > 0 ? `+${n}` : n}`)),
];

export const TOQUE_FIELDS: GyField[] = [
  {
    id: "toquePosicao",
    label: "Posição do colo",
    options: [o("Posterior"), o("Intermediário"), o("Centralizado")],
  },
  {
    id: "toqueConsistencia",
    label: "Consistência do colo",
    options: [o("Firme"), o("Intermediária"), o("Amolecido")],
  },
  {
    id: "toqueApagamento",
    label: "Apagamento (colo grosso→apagado ou %)",
    options: [
      o("Grosso"),
      o("Médio"),
      o("Fino"),
      o("Apagado"),
      o("25%", "ESVAECIMENTO 25%"),
      o("50%", "ESVAECIMENTO 50%"),
      o("75%", "ESVAECIMENTO 75%"),
      o("100%", "ESVAECIMENTO 100%"),
    ],
  },
  { id: "toqueDilatacao", label: "Dilatação", options: cmOptions },
  { id: "toqueDeLee", label: "Altura (De Lee)", options: deLeeOptions },
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
  return { values, toqueRealizado: true, toqueAutorizado: true, espRealizado: false };
}

function pick(field: GyField, values: Record<string, string>): string {
  const label = values[field.id] ?? field.options[0].label;
  return (field.options.find((op) => op.label === label) ?? field.options[0]).text;
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
    if (pregnant) {
      const colo = `COLO ${t("toquePosicao")}, ${t("toqueConsistencia")}, ${t("toqueApagamento")}`;
      lines.push(
        `TOQUE VAGINAL${auth}: ${colo}, ${t("toqueDilatacao")}, ${t("toqueDeLee")}, ${t("toqueApresentacao")}, ${t("toqueBolsa")}, ${t("toqueSangramento")}`,
      );
    } else {
      lines.push(
        `TOQUE VAGINAL${auth}: COLO ${t("toquePosicao")}, ${t("toqueConsistencia")}, ${t("toqueDilatacao")}, ${t("toqueSangramento")}`,
      );
    }
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
