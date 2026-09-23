/**
 * Puerpério (Enfermaria GO Geral) — dados específicos do módulo. Seguem a
 * Regra de Ouro: a paciente vive em `patients` (module = "puerperio"); o que é
 * só do puerpério fica em `patients.clinical_summary.puerperio` (este tipo).
 * Sinais vitais de cada evolução também viram `observations`.
 *
 * O texto gerado segue o modelo "ENFERMARIA GO GERAL" do serviço (HC-UFTM).
 */

export type DeliveryType = "vaginal" | "cesarea" | "forceps" | "vacuo";

export const DELIVERY_LABELS: Record<DeliveryType, string> = {
  vaginal: "Parto normal",
  cesarea: "Cesárea",
  forceps: "Parto fórcipe",
  vacuo: "Parto com vácuo-extrator",
};

export interface Newborn {
  sex: "" | "F" | "M";
  weight: string; // g
  apgar1: string;
  apgar5: string;
  alive: boolean;
}

export interface DeliveryInfo {
  type: DeliveryType;
  at: string; // ISO (data/hora do parto)
  /** IG no parto (texto livre, ex.: "39 SEMANAS E 2 DIAS"). */
  ga: string;
  twins: boolean;
  newborn: Newborn;
  newborn2?: Newborn;
  /** RN foi com a mãe para o alojamento conjunto. */
  roomingIn: boolean;
}

/**
 * Cabeçalho fixo da paciente (antecedentes) — preenchido na admissão (ou
 * importado do PSGO) e repetido em todas as evoluções.
 */
export interface WardHistory {
  origin: string; // procedente de
  coombsIndirect: string;
  newbornBloodType: string;
  directCoombs: string;
  cmb: string;
  meu: string;
  pastMeds: string; // fez uso de
  surgeries: string;
  allergies: string;
  hcv: string;
  prenatalVisits: string;
  serologies: string;
  context: string; // CONTEXTO INTERNAÇÃO
}

// ----------------------------- Evolução diária -----------------------------

export interface ChoiceItem {
  id: string;
  label: string;
  options: { label: string; text: string }[];
}

/** Revisão (texto da EVOLUÇÃO) — a 1ª opção é o padrão do modelo. */
export const EVOLUTION_ITEMS: ChoiceItem[] = [
  {
    id: "company",
    label: "Com",
    options: [
      { label: "Acompanhante e RN", text: "COM ACOMPANHANTE E RN" },
      { label: "RN", text: "COM RN" },
      { label: "Acompanhante", text: "COM ACOMPANHANTE" },
      { label: "Sozinha", text: "DESACOMPANHADA" },
    ],
  },
  {
    id: "breasts",
    label: "Mamas",
    options: [
      { label: "Nega queixas", text: "NEGA QUEIXAS MAMÁRIAS" },
      { label: "Dor/ingurgitamento", text: "REFERE DOR E INGURGITAMENTO MAMÁRIO" },
      { label: "Fissura", text: "REFERE DOR POR FISSURA MAMILAR" },
    ],
  },
  {
    id: "colostrum",
    label: "Colostro",
    options: [
      { label: "Boa saída", text: "REFERE BOA SAÍDA DE COLOSTRO" },
      { label: "Pouca saída", text: "REFERE POUCA SAÍDA DE COLOSTRO" },
      { label: "Não amamenta", text: "NÃO ESTÁ AMAMENTANDO" },
    ],
  },
  {
    id: "pain",
    label: "Dor abdominal",
    options: [
      { label: "Nega", text: "NEGA DOR ABDOMINAL" },
      { label: "Controlada", text: "REFERE DOR ABDOMINAL CONTROLADA COM ANALGESIA" },
      { label: "Importante", text: "REFERE DOR ABDOMINAL IMPORTANTE" },
    ],
  },
  {
    id: "bleeding",
    label: "Sangramento",
    options: [
      { label: "Nega aumento", text: "NEGA SANGRAMENTO VAGINAL AUMENTADO" },
      { label: "Aumentado", text: "REFERE SANGRAMENTO VAGINAL AUMENTADO" },
    ],
  },
  {
    id: "urine",
    label: "Diurese",
    options: [
      { label: "Sem alterações", text: "DIURESE PRESENTE, SEM ALTERAÇÕES" },
      { label: "Disúria", text: "REFERE DISÚRIA" },
      { label: "Retenção", text: "REFERE RETENÇÃO URINÁRIA" },
    ],
  },
  {
    id: "bowel",
    label: "Evacuação",
    options: [
      { label: "Não evacuou, flatos +", text: "AINDA NÃO EVACUOU PÓS PARTO, FLATOS PRESENTES" },
      { label: "Evacuou", text: "EVACUAÇÃO PRESENTE PÓS PARTO" },
      { label: "Não evacuou", text: "AINDA NÃO EVACUOU PÓS PARTO" },
    ],
  },
  {
    id: "walk",
    label: "Deambulação",
    options: [
      { label: "Sem dificuldades", text: "DEAMBULANDO SEM DIFICULDADES" },
      { label: "Com dificuldade", text: "DEAMBULANDO COM DIFICULDADE" },
      { label: "Restrita ao leito", text: "RESTRITA AO LEITO" },
    ],
  },
  {
    id: "diet",
    label: "Dieta",
    options: [
      { label: "Aceitando bem", text: "ACEITANDO BEM A DIETA" },
      { label: "Baixa aceitação", text: "COM BAIXA ACEITAÇÃO DA DIETA" },
      { label: "Náuseas/vômitos", text: "COM NÁUSEAS E VÔMITOS" },
    ],
  },
  {
    id: "headache",
    label: "Cefaleia",
    options: [
      { label: "(não citar)", text: "" },
      { label: "Nega", text: "NEGA CEFALEIA E ESCOTOMAS" },
      { label: "Relata", text: "REFERE CEFALEIA" },
    ],
  },
];

/** Orientações/plano abaixo da HD (modelo) — marcadas por padrão. */
export const PLAN_ITEMS: { id: string; text: string }[] = [
  { id: "programacao", text: "ORIENTO PACIENTE E ACOMPANHANTE QUANTO À PROGRAMAÇÃO DA INTERNAÇÃO" },
  { id: "duvidas", text: "ORIENTO E ESCLAREÇO DÚVIDAS SOBRE PUERPÉRIO" },
  { id: "sorologias", text: "CHECO SOROLOGIAS" },
  { id: "deambulacao", text: "ESTIMULO DEAMBULAÇÃO" },
  { id: "amamentacao", text: "ORIENTO AMAMENTAÇÃO E PEGA ADEQUADA" },
  { id: "contracepcao", text: "ORIENTO QUANTO AOS MÉTODOS CONTRACEPTIVOS" },
  { id: "medicacoes", text: "MANTENHO MEDICAÇÕES" },
  { id: "tsrn", text: "AGUARDO TS RN" },
  { id: "evolucao", text: "AGUARDO EVOLUÇÃO" },
];

/** Itens da CD de alta (modelo do serviço), por via de parto. */
export const DISCHARGE_ITEMS: { id: string; text: string; via: "ambas" | "normal" | "cesarea" }[] = [
  { id: "altaRn", text: "ALTA HOSPITALAR SE ALTA DO RN", via: "ambas" },
  { id: "licenca", text: "FORNEÇO LICENÇA MATERNIDADE 120 DIAS", via: "ambas" },
  { id: "sintomaticos", text: "FORNEÇO RECEITUÁRIO COM SINTOMÁTICOS", via: "ambas" },
  { id: "metodo", text: "ORIENTO QUANTO AO MÉTODO ESCOLHIDO PELA PACIENTE ({METODO})", via: "ambas" },
  { id: "receitaAco", text: "FORNEÇO RECEITUÁRIO DE ANTICONCEPCIONAL DE ESCOLHA DA PACIENTE ({ACO})", via: "ambas" },
  { id: "totg", text: "SOLICITO TOTG A SER REALIZADO 6 SEMANAS APÓS O PARTO", via: "normal" },
  { id: "tsh", text: "SOLICITO TSH/T4L A SEREM REALIZADOS 6 SEMANAS APÓS O PARTO", via: "normal" },
  { id: "bhcg", text: "SOLICITO BETA HCG A SER REALIZADO ANTES DA CONSULTA DE PUERPÉRIO PARA INSERÇÃO DE DIU CONFORME DESEJO DA PACIENTE", via: "ambas" },
  { id: "ferro", text: "FORNEÇO RECEITUÁRIO DE SULFATO FERROSO ({FERRO}) E ORIENTO IMPORTÂNCIA DA CONTINUIDADE DO USO REGULAR DA MEDICAÇÃO", via: "ambas" },
  { id: "orientNormal", text: "FORNEÇO E EXPLICO ORIENTAÇÕES PÓS-PARTO NORMAL", via: "normal" },
  { id: "orientCesarea", text: "FORNEÇO E EXPLICO ORIENTAÇÕES PÓS-PARTO CESÁREA", via: "cesarea" },
  { id: "fo", text: "ORIENTO QUANTO AOS CUIDADOS COM FO", via: "cesarea" },
  { id: "pontos", text: "ENCAMINHO AO CURATIVO LIMPO/PSF PARA RETIRADA DOS PONTOS EM 10-15 DIAS", via: "cesarea" },
  { id: "psf", text: "ORIENTO RETORNO EM CONSULTA DE PUERPÉRIO NO PSF (FORNEÇO CARTA)", via: "ambas" },
  { id: "hc40", text: "FORNEÇO ENCAMINHAMENTO PARA CONSULTA DE PUERPÉRIO EM HC UFTM EM 40 DIAS", via: "ambas" },
  { id: "amament", text: "ORIENTO E ESCLAREÇO DÚVIDAS SOBRE AMAMENTAÇÃO E PUERPÉRIO", via: "ambas" },
  { id: "alarme", text: "ORIENTO PUERPÉRIO PATOLÓGICO E SINAIS DE ALARME, RETORNAR AO PSGO SE NECESSÁRIO", via: "ambas" },
];

export interface PuerperalExam {
  general: string;
  ar: string; // sem a SatO2 (vem dos vitais)
  acv: string; // sem PA/FC (vêm dos vitais)
  breasts: string;
  abdomen: string; // antes de "ÚTERO ..."
  uterus: "contraido" | "hipotonico";
  fundusCm: string;
  fundus: "abaixo" | "cicatriz" | "acima";
  wound: string; // FO (cesárea)
  gyneco: string; // antes da loquiação
  lochiaType: "rubra" | "serossanguinolenta" | "serosa" | "alba";
  lochiaAmount: "pequena" | "moderada" | "grande";
  limbs: string;
}

export interface PuerperalVitals {
  paSystolic: string;
  paDiastolic: string;
  fc: string;
  tax: string;
  spo2: string;
}

export interface PuerperalEvolutionForm {
  date: string; // ISO
  choices: Record<string, string>; // id → texto escolhido
  complaints: string; // queixas adicionais (texto livre)
  exam: PuerperalExam;
  vitals: PuerperalVitals;
  /** "PARÂMETROS DA ENFERMAGEM" — preenchido com as faixas das últimas 24 h. */
  nursingParams: string;
  labs: string;
  hdExtra: string; // linhas extras de HD (comorbidades)
  plan: Record<string, boolean>;
  contraceptionNote: string; // complemento de "ORIENTO QUANTO AOS MÉTODOS..."
  planExtra: string;
  preceptor: string; // "DRA FÁRIDA"
  mode: "internacao" | "alta";
  conduct: string; // linhas livres da CD (internação)
  discharge: Record<string, boolean>;
  method: string; // IMPLANON...
  aco: string; // MEDROXIPROGESTERONA / DESOGESTREL
  iron: string; // DOSE PROFILÁTICA / TERAPÊUTICA
  dischargeExtra: string;
}

export interface SavedEvolution {
  id: string;
  at: string; // ISO
  author?: string;
  text: string;
}

export interface PuerperioSummary {
  delivery: DeliveryInfo;
  history: WardHistory;
  /** Último formulário salvo — pré-preenche a evolução do dia seguinte. */
  lastForm?: PuerperalEvolutionForm;
  evolutions: SavedEvolution[];
}

// --------------------------------- Defaults ---------------------------------

export function emptyNewborn(): Newborn {
  return { sex: "", weight: "", apgar1: "", apgar5: "", alive: true };
}

export function emptyDelivery(type: DeliveryType = "vaginal", at?: string): DeliveryInfo {
  return {
    type,
    at: at ?? new Date().toISOString(),
    ga: "",
    twins: false,
    newborn: emptyNewborn(),
    roomingIn: true,
  };
}

export function emptyHistory(): WardHistory {
  return {
    origin: "",
    coombsIndirect: "",
    newbornBloodType: "",
    directCoombs: "",
    cmb: "",
    meu: "",
    pastMeds: "",
    surgeries: "",
    allergies: "",
    hcv: "",
    prenatalVisits: "",
    serologies: "",
    context: "",
  };
}

export function emptyExam(): PuerperalExam {
  return {
    general: "BEG, AUTO E ALO ORIENTADA, CORADA, HIDRATADA, AFEBRIL",
    ar: "MV+, SEM RA, EUPNEICA",
    acv: "BRNF 2T, SS, PULSOS CHEIOS",
    breasts: "SEM INGURGITAMENTO, SEM FISSURAS, SEM SINAIS FLOGÍSTICOS. EXPRESSÃO POSITIVA BILATERALMENTE",
    abdomen: "PLANO, FLÁCIDO, RHA+, INDOLOR A PALPAÇÃO",
    uterus: "contraido",
    fundusCm: "",
    fundus: "abaixo",
    wound: "EM BOM ASPECTO DE CICATRIZAÇÃO, SEM SINAIS FLOGÍSTICOS. SUTURA ÍNTEGRA. SEM SAÍDA DE SECREÇÕES",
    gyneco: "SUTURA ÍNTEGRA, SEM SINAIS FLOGÍSTICOS",
    lochiaType: "rubra",
    lochiaAmount: "pequena",
    limbs: "SEM EDEMAS, PANTURRILHAS LIVRES",
  };
}

export function emptyEvolutionForm(date?: string): PuerperalEvolutionForm {
  return {
    date: date ?? new Date().toISOString(),
    choices: Object.fromEntries(EVOLUTION_ITEMS.map((i) => [i.id, i.options[0]!.text])),
    complaints: "",
    exam: emptyExam(),
    vitals: { paSystolic: "", paDiastolic: "", fc: "", tax: "", spo2: "" },
    nursingParams: "",
    labs: "",
    hdExtra: "",
    plan: Object.fromEntries(PLAN_ITEMS.map((p) => [p.id, true])),
    contraceptionNote: "",
    planExtra: "",
    preceptor: "",
    mode: "internacao",
    conduct: "",
    discharge: Object.fromEntries(DISCHARGE_ITEMS.map((d) => [d.id, true])),
    method: "",
    aco: "",
    iron: "DOSE PROFILÁTICA",
    dischargeExtra: "",
  };
}

/**
 * Formulário do dia a partir do último salvo: mantém exame/escolhas/plano
 * (costumam repetir), zera vitais, queixas e parâmetros.
 */
export function nextDayForm(last: PuerperalEvolutionForm | undefined): PuerperalEvolutionForm {
  const base = emptyEvolutionForm();
  if (!last) return base;
  return {
    ...base,
    ...last,
    exam: { ...base.exam, ...last.exam },
    choices: { ...base.choices, ...last.choices },
    plan: { ...base.plan, ...last.plan },
    discharge: { ...base.discharge, ...last.discharge },
    date: base.date,
    complaints: "",
    vitals: base.vitals,
    nursingParams: "",
    mode: "internacao",
  };
}

/** Lê `clinicalSummary.puerperio` com defaults (tolerante a dados antigos). */
export function readPuerperio(summary: Record<string, unknown> | null | undefined): PuerperioSummary {
  const raw = (summary?.puerperio ?? {}) as Partial<PuerperioSummary>;
  return {
    delivery: {
      ...emptyDelivery(),
      ...(raw.delivery ?? {}),
      newborn: { ...emptyNewborn(), ...(raw.delivery?.newborn ?? {}) },
    },
    history: { ...emptyHistory(), ...(raw.history ?? {}) },
    lastForm: raw.lastForm,
    evolutions: raw.evolutions ?? [],
  };
}

export function isVaginal(type: DeliveryType): boolean {
  return type !== "cesarea";
}
